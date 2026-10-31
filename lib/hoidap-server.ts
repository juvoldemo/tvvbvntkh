import { getSupabaseAdmin } from "@/lib/supabase";

export async function activeDiscussionProgram(): Promise<1 | 2> {
  const { data, error } = await getSupabaseAdmin().from("sales_discussion_settings").select("active_program").eq("id", true).maybeSingle();
  // Keep the original program usable before the program 2 migration is installed.
  if (error && !["42P01", "PGRST205"].includes(error.code)) throw error;
  return data?.active_program === 2 ? 2 : 1;
}

export const discussionTable = (program: number) => program === 2 ? "sales_discussion_solutions" : "sales_discussion_answers";
