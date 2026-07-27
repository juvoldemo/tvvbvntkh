import { NextRequest, NextResponse } from "next/server";
import candidatesJson from "@/data/recruitment-candidates.json";
import { getSupabaseAdmin } from "@/lib/supabase";
import { managedTeamName } from "@/lib/team-scope";
import { userCodeFromRequest } from "@/lib/user-auth";

const PAGE_SIZE = 20;
const MAX_SELECTIONS = 15;
const MAX_CHANGES = 3;
const REGISTRY_MONTH = "2099-12-01";
const REGISTRY_GROUP = "__RECRUITMENT_POOL_LOCK__";

type Candidate = (typeof candidatesJson)[number];
type Registry = {
  version: 1;
  claims: Record<string, string>;
  changes: Record<string, number>;
  confirmations: Record<string, string>;
};

class RecruitmentPoolError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseRegistry(value: unknown): Registry {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return { version: 1, claims: {}, changes: {}, confirmations: {} };
  }
  const raw = value as Partial<Registry>;
  return {
    version: 1,
    claims: raw.claims && typeof raw.claims === "object" ? raw.claims : {},
    changes: raw.changes && typeof raw.changes === "object" ? raw.changes : {},
    confirmations: raw.confirmations && typeof raw.confirmations === "object" ? raw.confirmations : {}
  };
}

async function leaderContext(request: NextRequest) {
  const advisorCode = userCodeFromRequest(request);
  if (!advisorCode) throw new RecruitmentPoolError("Vui lòng đăng nhập bằng tài khoản Trưởng nhóm.", 401);
  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase
    .from("authorized_users")
    .select("advisor_code,full_name,advisor_position,group_name,is_active")
    .eq("advisor_code", advisorCode)
    .maybeSingle();
  if (error) throw error;
  if (!profile?.is_active) throw new RecruitmentPoolError("Tài khoản không còn hoạt động.", 403);
  const groupName = managedTeamName(profile.advisor_code, profile.advisor_position, profile.full_name, profile.group_name);
  if (!groupName) throw new RecruitmentPoolError("Trang này chỉ dành cho Trưởng nhóm.", 403);
  return { supabase, profile, groupName };
}

async function registryRow(supabase: ReturnType<typeof getSupabaseAdmin>) {
  let { data, error } = await supabase
    .from("team_target_registrations")
    .select("id,selected_advisors,updated_at")
    .eq("target_month", REGISTRY_MONTH)
    .eq("group_name", REGISTRY_GROUP)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from("team_target_registrations").upsert({
    target_month: REGISTRY_MONTH,
    leader_code: "__SYSTEM__",
    leader_name: "Recruitment Pool",
    group_name: REGISTRY_GROUP,
    revenue_target: 0,
    active_advisor_target: 0,
    reward_target: 0,
    selected_advisors: { version: 1, claims: {}, changes: {} },
    updated_at: now
  }, { onConflict: "target_month,group_name", ignoreDuplicates: true });
  if (insertError) throw insertError;
  const result = await supabase
    .from("team_target_registrations")
    .select("id,selected_advisors,updated_at")
    .eq("target_month", REGISTRY_MONTH)
    .eq("group_name", REGISTRY_GROUP)
    .single();
  if (result.error) throw result.error;
  return result.data;
}

async function mutateRegistry(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  mutate: (registry: Registry) => Registry
) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const current = await registryRow(supabase);
    const next = mutate(parseRegistry(current.selected_advisors));
    const previousTime = Date.parse(String(current.updated_at || "")) || 0;
    const updatedAt = new Date(Math.max(Date.now(), previousTime + 1)).toISOString();
    const { data, error } = await supabase
      .from("team_target_registrations")
      .update({ selected_advisors: next, updated_at: updatedAt })
      .eq("id", current.id)
      .eq("updated_at", current.updated_at)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (data) return next;
  }
  throw new RecruitmentPoolError("Có người vừa thay đổi lựa chọn. Vui lòng thử lại.", 409);
}

function usage(registry: Registry, leaderCode: string) {
  const selectedCount = Object.values(registry.claims).filter((code) => code === leaderCode).length;
  const changesUsed = Math.max(0, Number(registry.changes[leaderCode]) || 0);
  return {
    selectedCount,
    selectionLimit: MAX_SELECTIONS,
    remainingSlots: Math.max(0, MAX_SELECTIONS - selectedCount),
    changesUsed,
    changeLimit: MAX_CHANGES,
    changesRemaining: Math.max(0, MAX_CHANGES - changesUsed),
    isConfirmed: Boolean(registry.confirmations[leaderCode]),
    confirmedAt: registry.confirmations[leaderCode] || null
  };
}

function invalidateConfirmation(registry: Registry, leaderCode: string) {
  const confirmations = { ...registry.confirmations };
  delete confirmations[leaderCode];
  return confirmations;
}

function publicCandidate(candidate: Candidate, registry: Registry, leaderCode: string) {
  const owner = registry.claims[candidate.advisorCode];
  return {
    id: candidate.id,
    advisorCode: candidate.advisorCode,
    advisorName: candidate.advisorName,
    recruiterName: candidate.recruiterName || "—",
    selectionState: owner === leaderCode ? "mine" : owner ? "taken" : "available"
  };
}

function errorResponse(error: unknown) {
  if (error instanceof RecruitmentPoolError) return NextResponse.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error ? error.message : "Không xử lý được danh sách tuyển dụng.";
  return NextResponse.json({ error: message }, { status: 500 });
}

async function broadcastChange(supabase: ReturnType<typeof getSupabaseAdmin>, candidateId: string) {
  const channel = supabase.channel("recruitment-pool-live");
  await new Promise<void>((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      resolve();
    };
    const timer = setTimeout(finish, 1200);
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.send({ type: "broadcast", event: "changed", payload: { candidateId } }).catch(() => undefined);
        clearTimeout(timer);
        finish();
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        clearTimeout(timer);
        finish();
      }
    });
  });
  await supabase.removeChannel(channel).catch(() => undefined);
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, profile, groupName } = await leaderContext(request);
    const row = await registryRow(supabase);
    const registry = parseRegistry(row.selected_advisors);
    const view = request.nextUrl.searchParams.get("view") === "details" ? "details" : "list";
    const search = normalize(request.nextUrl.searchParams.get("search"));
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);

    if (view === "details") {
      if (!registry.confirmations[profile.advisor_code]) {
        throw new RecruitmentPoolError("Vui lòng xác nhận danh sách lựa chọn trước khi xem chi tiết.", 403);
      }
      const details = (candidatesJson as Candidate[])
        .filter((candidate) => registry.claims[candidate.advisorCode] === profile.advisor_code)
        .sort((a, b) => a.advisorName.localeCompare(b.advisorName, "vi"));
      return NextResponse.json({
        leader: { advisorCode: profile.advisor_code, fullName: profile.full_name, groupName },
        usage: usage(registry, profile.advisor_code),
        candidates: details,
        registryUpdatedAt: row.updated_at
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const filtered = (candidatesJson as Candidate[])
      .filter((candidate) => !search || normalize([
        candidate.advisorCode,
        candidate.advisorName,
        candidate.recruiterName
      ].join(" ")).includes(search))
      .sort((a, b) => a.advisorName.localeCompare(b.advisorName, "vi"));
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * PAGE_SIZE;
    return NextResponse.json({
      leader: { advisorCode: profile.advisor_code, fullName: profile.full_name, groupName },
      usage: usage(registry, profile.advisor_code),
      candidates: filtered.slice(start, start + PAGE_SIZE).map((candidate) => publicCandidate(candidate, registry, profile.advisor_code)),
      pagination: { page: safePage, pageSize: PAGE_SIZE, pageCount, total: filtered.length },
      registryUpdatedAt: row.updated_at
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, profile } = await leaderContext(request);
    const body = await request.json().catch(() => ({}));
    const candidateId = String(body.candidateId || "").trim().toUpperCase();
    if (!(candidatesJson as Candidate[]).some((candidate) => candidate.advisorCode === candidateId)) {
      throw new RecruitmentPoolError("Không tìm thấy TVV trong danh sách.", 404);
    }
    const registry = await mutateRegistry(supabase, (current) => {
      const claimedBy = current.claims[candidateId];
      if (claimedBy === profile.advisor_code) return current;
      if (claimedBy) throw new RecruitmentPoolError("TVV này vừa được Trưởng nhóm khác lựa chọn.", 409);
      if (usage(current, profile.advisor_code).selectedCount >= MAX_SELECTIONS) {
        throw new RecruitmentPoolError(`Mỗi Trưởng nhóm chỉ được lựa chọn tối đa ${MAX_SELECTIONS} TVV.`);
      }
      return {
        ...current,
        claims: { ...current.claims, [candidateId]: profile.advisor_code },
        confirmations: invalidateConfirmation(current, profile.advisor_code)
      };
    });
    await broadcastChange(supabase, candidateId);
    return NextResponse.json({ ok: true, usage: usage(registry, profile.advisor_code) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, profile } = await leaderContext(request);
    const body = await request.json().catch(() => ({}));
    const candidateId = String(body.candidateId || "").trim().toUpperCase();
    const registry = await mutateRegistry(supabase, (current) => {
      if (current.claims[candidateId] !== profile.advisor_code) {
        throw new RecruitmentPoolError("Bạn không có quyền sửa lựa chọn này.", 403);
      }
      const currentUsage = usage(current, profile.advisor_code);
      if (currentUsage.changesUsed >= MAX_CHANGES) {
        throw new RecruitmentPoolError(`Bạn đã sử dụng hết ${MAX_CHANGES} lượt thay đổi.`);
      }
      const claims = { ...current.claims };
      delete claims[candidateId];
      return {
        ...current,
        claims,
        changes: { ...current.changes, [profile.advisor_code]: currentUsage.changesUsed + 1 },
        confirmations: invalidateConfirmation(current, profile.advisor_code)
      };
    });
    await broadcastChange(supabase, candidateId);
    return NextResponse.json({ ok: true, usage: usage(registry, profile.advisor_code) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, profile } = await leaderContext(request);
    const registry = await mutateRegistry(supabase, (current) => {
      const currentUsage = usage(current, profile.advisor_code);
      if (currentUsage.selectedCount <= 0) {
        throw new RecruitmentPoolError("Vui lòng lựa chọn ít nhất một TVV trước khi xác nhận.");
      }
      return {
        ...current,
        confirmations: {
          ...current.confirmations,
          [profile.advisor_code]: new Date().toISOString()
        }
      };
    });
    await broadcastChange(supabase, `confirmation:${profile.advisor_code}`);
    return NextResponse.json({ ok: true, usage: usage(registry, profile.advisor_code) });
  } catch (error) {
    return errorResponse(error);
  }
}
