import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { managedTeamName } from "@/lib/team-scope";
import { userCodeFromRequest } from "@/lib/user-auth";
import { broadcastAdoManagementChange } from "@/lib/ado-live";

const DATA_BUCKET = "team-activity-data";
const BUCKET = "team-activity-evidence";

function targetMonth(value: string) {
  return /^\d{4}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 7);
}

function errorText(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return fallback;
}

async function leaderContext(request: NextRequest) {
  const code = userCodeFromRequest(request);
  if (!code) return { error: NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 }) };
  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase
    .from("authorized_users")
    .select("advisor_code,full_name,advisor_position,group_name")
    .eq("advisor_code", code)
    .single();
  if (error) throw error;
  const groupName = managedTeamName(profile.advisor_code, profile.advisor_position, profile.full_name, profile.group_name);
  if (!groupName) return { error: NextResponse.json({ error: "Trang này chỉ dành cho Trưởng nhóm." }, { status: 403 }) };
  return { supabase, profile, groupName };
}

async function uploadEvidence(supabase: ReturnType<typeof getSupabaseAdmin>, file: File, leaderCode: string, activityId: string) {
  if (!file.type.startsWith("image/")) throw new Error("Minh chứng phải là file ảnh.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Ảnh minh chứng phải nhỏ hơn 8 MB.");
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  const path = `${leaderCode}/${activityId}-${Date.now()}.${extension}`;
  await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 8 * 1024 * 1024 }).catch(() => undefined);
  const { error } = await supabase.storage.from(BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function dataPath(leaderCode: string) {
  return `leaders/${leaderCode.replace(/[^a-z0-9_-]/gi, "_").toUpperCase()}.json`;
}

function activityFolder(leaderCode: string) {
  return `leaders/${leaderCode.replace(/[^a-z0-9_-]/gi, "_").toUpperCase()}/activities`;
}

function activityPath(leaderCode: string, activityId: string) {
  return `${activityFolder(leaderCode)}/${activityId}.json`;
}

async function readActivities(supabase: ReturnType<typeof getSupabaseAdmin>, leaderCode: string) {
  await supabase.storage.createBucket(DATA_BUCKET, { public: false, fileSizeLimit: 2 * 1024 * 1024 }).catch(() => undefined);
  let legacyActivities: any[] = [];
  const { data: legacyData, error: legacyError } = await supabase.storage.from(DATA_BUCKET).download(dataPath(leaderCode));
  if (legacyError) {
    if (!/not found|does not exist/i.test(legacyError.message)) throw legacyError;
  } else {
    const parsed = JSON.parse(await legacyData.text());
    legacyActivities = Array.isArray(parsed) ? parsed : [];
  }

  const folder = activityFolder(leaderCode);
  const { data: files, error: listError } = await supabase.storage.from(DATA_BUCKET).list(folder, { limit: 1000 });
  if (listError) throw listError;
  const individualActivities = (await Promise.all((files ?? [])
    .filter((file) => file.name.endsWith(".json"))
    .map(async (file) => {
      const objectPath = `${folder}/${file.name}`;
      const { data, error } = await supabase.storage.from(DATA_BUCKET).download(objectPath);
      if (error) throw error;
      return { ...JSON.parse(await data.text()), _object_path: objectPath };
    })));

  const merged = new Map<string, any>();
  legacyActivities.forEach((item: any) => merged.set(String(item.id), item));
  individualActivities.forEach((item: any) => merged.set(String(item.id), item));
  return [...merged.values()];
}

async function writeActivities(supabase: ReturnType<typeof getSupabaseAdmin>, leaderCode: string, activities: any[]) {
  const payload = new TextEncoder().encode(JSON.stringify(activities));
  const { error } = await supabase.storage.from(DATA_BUCKET).upload(dataPath(leaderCode), payload, {
    contentType: "application/json",
    upsert: true
  });
  if (error) throw error;
}

async function writeActivityObject(supabase: ReturnType<typeof getSupabaseAdmin>, leaderCode: string, activity: any, path = activityPath(leaderCode, activity.id)) {
  const { _object_path, ...storedActivity } = activity;
  const payload = new TextEncoder().encode(JSON.stringify(storedActivity));
  const { error } = await supabase.storage.from(DATA_BUCKET).upload(path, payload, {
    contentType: "application/json",
    cacheControl: "0",
    upsert: Boolean(_object_path)
  });
  if (error) throw error;
}

export async function GET(request: NextRequest) {
  try {
    const context = await leaderContext(request);
    if (context.error) return context.error;
    const month = targetMonth(request.nextUrl.searchParams.get("month") || "");
    const activities = await readActivities(context.supabase, context.profile.advisor_code);
    return NextResponse.json({
      activities: activities
        .filter((item: any) => item.target_month === month)
        .map(({ _object_path, ...item }: any) => item)
        .sort((a: any, b: any) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)))
    });
  } catch (error) {
    return NextResponse.json({ error: errorText(error, "Không tải được hoạt động.") }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await leaderContext(request);
    if (context.error) return context.error;
    const body = await request.json();
    const submitted = (Array.isArray(body.activities) ? body.activities : [body]).slice(0, 30).map((item: any) => ({
      content: String(item.content || "").trim(),
      scheduledDate: String(item.scheduledDate || item.scheduledAt || "").trim().slice(0, 10),
      scheduledTime: String(item.scheduledTime || "").trim().slice(0, 5)
    }));
    if (!submitted.length) return NextResponse.json({ error: "Vui lòng thêm ít nhất một hoạt động." }, { status: 400 });
    if (submitted.some((item: any) => !item.content || item.content.length > 500)) return NextResponse.json({ error: "Vui lòng nhập nội dung cho từng hoạt động (tối đa 500 ký tự)." }, { status: 400 });
    if (submitted.some((item: any) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(item.scheduledDate) || !/^\d{2}:\d{2}$/.test(item.scheduledTime)) return true;
      const [hour, minute] = item.scheduledTime.split(":").map(Number);
      return hour > 23 || minute > 59 || Number.isNaN(Date.parse(`${item.scheduledDate}T${item.scheduledTime}:00+07:00`));
    })) {
      return NextResponse.json({ error: "Vui lòng chọn đầy đủ ngày và giờ thực hiện." }, { status: 400 });
    }
    const createdActivities = submitted.map((item: any) => ({
        id: crypto.randomUUID(),
        group_name: context.groupName,
        leader_code: context.profile.advisor_code,
        leader_name: context.profile.full_name,
        target_month: item.scheduledDate.slice(0, 7),
        scheduled_date: item.scheduledDate,
        scheduled_time: item.scheduledTime,
        scheduled_at: new Date(`${item.scheduledDate}T${item.scheduledTime}:00+07:00`).toISOString(),
        content: item.content,
        completed: false,
        completed_at: null,
        photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
    await Promise.all(createdActivities.map((activity: any) => writeActivityObject(context.supabase, context.profile.advisor_code, activity)));
    await broadcastAdoManagementChange(context.supabase, "activity", createdActivities[0].target_month, context.profile.advisor_code);
    return NextResponse.json({ activity: createdActivities[0], activities: createdActivities });
  } catch (error) {
    return NextResponse.json({ error: errorText(error, "Không lưu được hoạt động.") }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await leaderContext(request);
    if (context.error) return context.error;
    const form = await request.formData();
    const id = String(form.get("id") || "").trim();
    if (!id) return NextResponse.json({ error: "Thiếu mã hoạt động." }, { status: 400 });
    const activities = await readActivities(context.supabase, context.profile.advisor_code);
    const activityIndex = activities.findIndex((item: any) => item.id === id && item.group_name === context.groupName);
    if (activityIndex < 0) return NextResponse.json({ error: "Không tìm thấy hoạt động." }, { status: 404 });
    const current = activities[activityIndex];

    const completed = String(form.get("completed") || "") === "true";
    const evidence = form.get("evidence");
    const photoUrl = evidence instanceof File && evidence.size
      ? await uploadEvidence(context.supabase, evidence, context.profile.advisor_code, id)
      : current.photo_url;
    const activity = {
      ...current,
      completed,
      completed_at: completed ? current.completed_at || new Date().toISOString() : null,
      photo_url: photoUrl || null,
      updated_at: new Date().toISOString()
    };
    if (current._object_path) {
      await writeActivityObject(context.supabase, context.profile.advisor_code, activity, current._object_path);
    } else {
      const legacyActivities = activities.filter((item: any) => !item._object_path);
      const legacyIndex = legacyActivities.findIndex((item: any) => item.id === id);
      legacyActivities[legacyIndex] = activity;
      await writeActivities(context.supabase, context.profile.advisor_code, legacyActivities);
    }
    const { _object_path, ...responseActivity } = activity;
    await broadcastAdoManagementChange(context.supabase, "activity", activity.target_month, context.profile.advisor_code);
    return NextResponse.json({ activity: responseActivity });
  } catch (error) {
    return NextResponse.json({ error: errorText(error, "Không cập nhật được hoạt động.") }, { status: 500 });
  }
}
