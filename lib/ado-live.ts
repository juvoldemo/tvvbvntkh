import type { SupabaseClient } from "@supabase/supabase-js";

export async function broadcastAdoManagementChange(
  supabase: SupabaseClient,
  kind: "target" | "activity",
  month: string,
  leaderCode: string
) {
  const channel = supabase.channel("ado-management-live");
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
        await channel.send({ type: "broadcast", event: "changed", payload: { kind, month, leaderCode } }).catch(() => undefined);
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
