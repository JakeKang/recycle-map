import { afterEach, describe, expect, it, vi } from "vitest";

import { consumeRateLimit, resetRateLimitForTests } from "@/lib/rate-limit";

describe("rate limiting", () => {
  afterEach(() => {
    resetRateLimitForTests();
    vi.unstubAllEnvs();
  });

  it("fails closed in production when the durable limiter is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const result = await consumeRateLimit({
      key: "reports:user-1:203.0.113.1",
      windowMs: 60_000,
      max: 5,
    });

    expect(result.allowed).toBe(false);
  });
});
