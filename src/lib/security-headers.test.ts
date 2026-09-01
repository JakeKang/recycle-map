import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";
import { buildContentSecurityPolicy } from "@/proxy";

describe("security response headers", () => {
  it("ships transport and content security policies", async () => {
    const rules = await nextConfig.headers?.();
    const headers = new Map(
      rules?.[0]?.headers.map((header) => [header.key, header.value]),
    );

    expect(headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
  });

  it("uses a nonce-based script policy without unsafe-inline", () => {
    const csp = buildContentSecurityPolicy("test-nonce");

    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("'nonce-test-nonce'");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });
});
