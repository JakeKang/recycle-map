import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { isAdminUserId, resolveRequestUserId } from "@/lib/request-user";

const { getCurrentUserIdMock } = vi.hoisted(() => ({
  getCurrentUserIdMock: vi.fn(),
}));

vi.mock("@/lib/current-user", () => ({
  getCurrentUserId: getCurrentUserIdMock,
}));

describe("request-user", () => {
  beforeEach(() => {
    getCurrentUserIdMock.mockReset();
    process.env.ALLOW_DEV_USER_HEADER = "true";
  });

  it("returns session user id when available", async () => {
    getCurrentUserIdMock.mockResolvedValue("session-user-1");
    const request = new NextRequest("http://localhost/api/points", {
      method: "POST",
    });

    const userId = await resolveRequestUserId(request);
    expect(userId).toBe("session-user-1");
  });

  it("allows dev header fallback in non-production", async () => {
    getCurrentUserIdMock.mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/points", {
      method: "POST",
      headers: {
        "x-dev-user-id": "local-tester",
      },
    });

    const userId = await resolveRequestUserId(request);
    expect(userId).toBe("local-tester");
  });

  it("blocks dev header fallback when disabled", async () => {
    process.env.ALLOW_DEV_USER_HEADER = "false";
    getCurrentUserIdMock.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/points", {
      method: "POST",
      headers: {
        "x-dev-user-id": "local-tester",
      },
    });

    const userId = await resolveRequestUserId(request);
    expect(userId).toBeNull();
  });

  it("identifies default and configured admin user ids", () => {
    delete process.env.ADMIN_USER_IDS;
    expect(isAdminUserId("test-admin")).toBe(true);
    expect(isAdminUserId("reviewer")).toBe(false);

    process.env.ADMIN_USER_IDS = "ops-admin,security-admin";
    expect(isAdminUserId("ops-admin")).toBe(true);
    expect(isAdminUserId("test-admin")).toBe(false);
  });
});
