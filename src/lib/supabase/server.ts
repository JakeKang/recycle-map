import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    url,
    anonKey,
    serviceRoleKey,
  };
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseEnv();
  return Boolean(url && anonKey);
}

export function createSupabaseServerClient(): SupabaseClient | null {
  if (process.env.FORCE_LOCAL_STORE === "true") {
    return null;
  }

  const { url, anonKey, serviceRoleKey } = getSupabaseEnv();
  const serverKey = serviceRoleKey || anonKey;
  if (!url || !serverKey) {
    return null;
  }

  return createClient(url, serverKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
