import { afterEach, describe, expect, it, vi } from "vitest";

import { createSupabaseServerClient } from "@/lib/supabase/server";

describe("Supabase server client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed instead of using the public anon key in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("FORCE_LOCAL_STORE", "false");

    expect(() => createSupabaseServerClient()).toThrow(
      "SUPABASE_SERVICE_ROLE_KEY is required in production",
    );
  });

  it("does not create a server client from the public anon key in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("FORCE_LOCAL_STORE", "false");

    expect(createSupabaseServerClient()).toBeNull();
  });
});
