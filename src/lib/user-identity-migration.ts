import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function migrateLegacyUserIdentity(
  provider: string,
  legacyUserId: string,
  namespacedUserId: string,
) {
  if (provider === "credentials" || legacyUserId === namespacedUserId) {
    return false;
  }

  const client = createSupabaseServerClient();
  if (!client) {
    return false;
  }

  const { data, error } = await client.rpc("migrate_legacy_user_identity", {
    p_legacy_id: legacyUserId,
    p_new_id: namespacedUserId,
    p_provider: provider,
  });
  if (error) {
    throw error;
  }

  return data === true;
}
