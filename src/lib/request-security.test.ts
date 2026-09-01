import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isSameOriginRequest, resolveClientAddress } from "@/lib/request-security";

describe("request security", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts an unsafe request only from the configured public origin", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://recycle.example.com");

    const sameOrigin = new NextRequest("https://internal.example/api/points", {
      method: "POST",
      headers: { origin: "https://recycle.example.com" },
    });
    const foreignOrigin = new NextRequest("https://internal.example/api/points", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });

    expect(isSameOriginRequest(sameOrigin)).toBe(true);
    expect(isSameOriginRequest(foreignOrigin)).toBe(false);
  });

  it("rejects an unsafe production request when origin metadata is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", "https://recycle.example.com");

    const request = new NextRequest("https://recycle.example.com/api/points", {
      method: "POST",
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("rejects unsafe production requests when the public origin is not configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", "");

    const request = new NextRequest("https://attacker-controlled-host.example/api/points", {
      method: "POST",
      headers: { origin: "https://attacker-controlled-host.example" },
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("allows safe reads without an origin header", () => {
    vi.stubEnv("NODE_ENV", "production");

    const request = new NextRequest("https://recycle.example.com/api/points");

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("trusts forwarding headers only behind an explicitly trusted proxy", () => {
    const request = new NextRequest("https://recycle.example.com/api/points", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    });

    expect(resolveClientAddress(request)).toBe("unknown-ip");

    vi.stubEnv("TRUST_PROXY", "true");
    expect(resolveClientAddress(request)).toBe("203.0.113.10");
  });
});
