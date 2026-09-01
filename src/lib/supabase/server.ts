import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    url,
    serviceRoleKey,
  };
}

export function isSupabaseConfigured() {
  const { url, serviceRoleKey } = getSupabaseEnv();
  return Boolean(url && serviceRoleKey);
}

export function createSupabaseServerClient(): SupabaseClient | null {
  if (process.env.FORCE_LOCAL_STORE === "true") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FORCE_LOCAL_STORE cannot be enabled in production");
    }
    return null;
  }

  const { url, serviceRoleKey } = getSupabaseEnv();
  if (process.env.NODE_ENV === "production" && !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required in production");
  }
  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
