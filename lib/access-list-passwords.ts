import { getSupabaseAdmin } from "./supabase";
import { randomStrongPassword, revealVisiblePassword, visiblePasswordRecord } from "./user-auth";

export async function fillMissingPasswords(supabase: ReturnType<typeof getSupabaseAdmin>, users: Record<string, unknown>[], hasPlain: boolean) {
  let count = 0;
  const pending = users.filter((user) => !revealVisiblePassword(String(user.password_hash || "")) && !user.password_plain);
  for (let offset = 0; offset < pending.length; offset += 8) {
    await Promise.all(pending.slice(offset, offset + 8).map(async (user) => {
      if (revealVisiblePassword(String(user.password_hash || "")) || user.password_plain) return;
      const password = randomStrongPassword();
      // Compare the original credentials to avoid overwriting a concurrent change.
      let query = supabase.from("authorized_users").update({
        password_hash: visiblePasswordRecord(password),
        ...(hasPlain ? { password_plain: password } : {}),
        updated_at: new Date().toISOString()
      }).eq("id", user.id);
      query = user.password_hash == null ? query.is("password_hash", null) : query.eq("password_hash", user.password_hash);
      if (hasPlain) query = user.password_plain == null ? query.is("password_plain", null) : query.eq("password_plain", user.password_plain);
      const { data, error } = await query.select("id");
      if (error) throw error;
      if (data?.length) {
        user.password_hash = visiblePasswordRecord(password);
        user.password_plain = password;
        count += 1;
      } else {
        const { data: current, error: readError } = await supabase.from("authorized_users")
          .select(hasPlain ? "password_hash,password_plain" : "password_hash").eq("id", user.id).single();
        if (readError) throw readError;
        Object.assign(user, current);
        user.password_plain = revealVisiblePassword(String(user.password_hash || "")) || user.password_plain || null;
      }
    }));
  }
  return count;
}

