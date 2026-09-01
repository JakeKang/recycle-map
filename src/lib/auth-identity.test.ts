import { describe, expect, it } from "vitest";

import { buildStableUserId } from "@/lib/auth-identity";

describe("authentication identity", () => {
  it("namespaces OAuth subjects by provider", () => {
    expect(buildStableUserId("google", "123", "123")).toBe("google:123");
    expect(buildStableUserId("kakao", "123", "123")).toBe("kakao:123");
  });

  it("keeps the controlled credentials identity", () => {
    expect(buildStableUserId("credentials", "test-owner", "test-owner")).toBe(
      "test-owner",
    );
  });
});
