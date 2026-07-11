import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { isAccessRequest } from "@/lib/admin-access-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { userCodeFromRequest } from "@/lib/user-auth";

const eventNames = new Set(["session_start", "tab_view", "tab_duration", "action"]);
const analyticsTimeZone = "Asia/Ho_Chi_Minh";
const analyticsDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: analyticsTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23"
});

function analyticsTimeParts(date: Date) {
  return Object.fromEntries(
    analyticsDateTimeFormatter.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
}

export async function POST(request: NextRequest) {
  const advisorCode = userCodeFromRequest(request);
  if (!advisorCode) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const eventName = String(body.eventName || "");
  if (!eventNames.has(eventName)) return NextResponse.json({ error: "Sự kiện không hợp lệ." }, { status: 400 });
  const duration = Math.min(86400, Math.max(0, Math.round(Number(body.durationSeconds) || 0)));
  const { error } = await getSupabaseAdmin().from("app_analytics_events").insert({
    advisor_code: advisorCode,
    session_id: String(body.sessionId || "").slice(0, 100),
    event_name: eventName,
    tab_name: String(body.tabName || "").slice(0, 80) || null,
    duration_seconds: eventName === "tab_duration" ? duration : null,
    action_name: eventName === "action" ? String(body.actionName || "").replace(/\s+/g, " ").trim().slice(0, 120) || null : null,
    device: /Android|iPhone|iPad|iPod|Mobile/i.test(request.headers.get("user-agent") || "") ? "Mobile" : "Desktop"
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request) || !isAccessRequest(request)) return NextResponse.json({ error: "Chưa xác thực nội dung bảo mật." }, { status: 401 });
  const period = request.nextUrl.searchParams.get("period") || "day";
  const days = period === "month" ? 30 : period === "week" ? 7 : 1;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const supabase = getSupabaseAdmin();
  const [{ data: events, error }, { data: users }, { data: allStarts }] = await Promise.all([
    supabase.from("app_analytics_events").select("advisor_code,session_id,event_name,tab_name,duration_seconds,action_name,device,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(10000),
    supabase.from("authorized_users").select("advisor_code,full_name,group_name,advisor_position,is_active").eq("is_active", true),
    supabase.from("app_analytics_events").select("advisor_code,created_at").eq("event_name", "session_start").order("created_at", { ascending: false }).limit(10000)
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const profiles = new Map((users ?? []).map((user: any) => [user.advisor_code, user]));
  const rows = new Map<string, any>();
  for (const event of events ?? []) {
    const profile: any = profiles.get(event.advisor_code) || {};
    const row = rows.get(event.session_id) || { sessionId: event.session_id, advisorCode: event.advisor_code, fullName: profile.full_name || "—", groupName: profile.group_name || "—", position: profile.advisor_position || "—", visits: 0, actions: 0, summaryExports: 0, totalSeconds: 0, tabs: {}, timeline: [], lastAccess: event.created_at, firstAccess: event.created_at, devices: new Set<string>() };
    if (event.event_name === "session_start") row.visits += 1;
    if (event.event_name === "action") {
      row.actions += 1;
      if (String(event.action_name || "").startsWith("Xuất tóm tắt")) row.summaryExports += 1;
    }
    if (event.event_name === "tab_duration" && event.tab_name) {
      const seconds = Number(event.duration_seconds) || 0;
      row.totalSeconds += seconds;
      row.tabs[event.tab_name] = (row.tabs[event.tab_name] || 0) + seconds;
    }
    if (new Date(event.created_at).getTime() < new Date(row.firstAccess).getTime()) row.firstAccess = event.created_at;
    row.timeline.push({ eventName: event.event_name, tabName: event.tab_name, durationSeconds: event.duration_seconds, actionName: event.action_name, createdAt: event.created_at });
    if (event.device) row.devices.add(event.device);
    rows.set(event.session_id, row);
  }
  const result = [...rows.values()].map((row) => {
    const longest = Object.entries(row.tabs).sort((a: any, b: any) => b[1] - a[1])[0];
    return { ...row, devices: [...row.devices], longestTab: longest?.[0] || "—", longestTabSeconds: longest?.[1] || 0, timeline: row.timeline.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) };
  }).sort((a, b) => new Date(b.lastAccess).getTime() - new Date(a.lastAccess).getTime());

  const trendMap = new Map<string, { label: string; sessions: Set<string>; advisors: Set<string>; seconds: number }>();
  const tabMap = new Map<string, { tabName: string; views: number; seconds: number; advisors: Set<string> }>();
  for (const event of events ?? []) {
    const date = new Date(event.created_at);
    const { year, month, day, hour } = analyticsTimeParts(date);
    const dateKey = `${year}-${month}-${day}`;
    const key = period === "day" ? `${dateKey}-${hour}` : dateKey;
    const label = period === "day" ? `${hour}:00` : `${day}/${month}`;
    const trend = trendMap.get(key) || { label, sessions: new Set(), advisors: new Set(), seconds: 0 };
    trend.sessions.add(event.session_id); trend.advisors.add(event.advisor_code); trend.seconds += Number(event.duration_seconds) || 0; trendMap.set(key, trend);
    if (event.tab_name && (event.event_name === "tab_view" || event.event_name === "tab_duration")) {
      const tab = tabMap.get(event.tab_name) || { tabName: event.tab_name, views: 0, seconds: 0, advisors: new Set() };
      if (event.event_name === "tab_view") tab.views += 1;
      tab.seconds += Number(event.duration_seconds) || 0; tab.advisors.add(event.advisor_code); tabMap.set(event.tab_name, tab);
    }
  }
  const trends = [...trendMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, item]) => ({ label: item.label, sessions: item.sessions.size, advisors: item.advisors.size, seconds: item.seconds }));
  const tabStats = [...tabMap.values()].map((item) => ({ ...item, advisors: item.advisors.size })).sort((a, b) => b.seconds - a.seconds);
  const groupMap = new Map<string, { groupName: string; advisors: Set<string>; sessions: number; seconds: number; actions: number }>();
  for (const row of result) {
    const group = groupMap.get(row.groupName) || { groupName: row.groupName, advisors: new Set(), sessions: 0, seconds: 0, actions: 0 };
    group.advisors.add(row.advisorCode); group.sessions += 1; group.seconds += row.totalSeconds; group.actions += row.actions; groupMap.set(row.groupName, group);
  }
  const groups = [...groupMap.values()].map((group) => ({ ...group, advisors: group.advisors.size })).sort((a, b) => b.sessions - a.sessions);
  const lastByAdvisor = new Map<string, string>();
  for (const entry of allStarts ?? []) if (!lastByAdvisor.has(entry.advisor_code)) lastByAdvisor.set(entry.advisor_code, entry.created_at);
  const now = Date.now();
  const userActivity = (users ?? []).map((user: any) => ({ advisorCode: user.advisor_code, fullName: user.full_name, groupName: user.group_name || "—", position: user.advisor_position || "—", lastAccess: lastByAdvisor.get(user.advisor_code) || null }));
  const neverAccessed = userActivity.filter((user) => !user.lastAccess);
  const inactive7Days = userActivity.filter((user) => user.lastAccess && now - new Date(user.lastAccess).getTime() >= 7 * 86400000);
  const inactive30Days = userActivity.filter((user) => user.lastAccess && now - new Date(user.lastAccess).getTime() >= 30 * 86400000);
  const summary = {
    uniqueAdvisors: new Set(result.map((row) => row.advisorCode)).size,
    sessions: result.length,
    actions: result.reduce((sum, row) => sum + row.actions, 0),
    summaryExports: result.reduce((sum, row) => sum + row.summaryExports, 0),
    totalSeconds: result.reduce((sum, row) => sum + row.totalSeconds, 0),
    averageSeconds: result.length ? Math.round(result.reduce((sum, row) => sum + row.totalSeconds, 0) / result.length) : 0,
    viewOnlySessions: result.filter((row) => row.actions === 0).length,
    shortSessions: result.filter((row) => row.totalSeconds > 0 && row.totalSeconds < 15).length
  };
  return NextResponse.json({ period, since, rows: result, summary, trends, tabStats, groups, neverAccessed, inactive7Days, inactive30Days });
}
