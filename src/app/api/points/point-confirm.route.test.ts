import { POST as postConfirm } from "@/app/api/points/[id]/confirm/route";
import {
  createPointAs,
  jsonRequest,
  setupPointsTestState,
} from "@/app/api/points/points-test-helpers";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveRequestUserIdMock } = vi.hoisted(() => ({
  resolveRequestUserIdMock: vi.fn(),
}));

vi.mock("@/lib/request-user", () => ({
  resolveRequestUserId: resolveRequestUserIdMock,
  isAdminUserId: (userId: string) => userId === "test-admin",
}));

describe("point confirm route", () => {
  beforeEach(() => {
    setupPointsTestState(resolveRequestUserIdMock);
  });

  it("POST /api/points/[id]/confirm is admin-only and overrides verification state", async () => {
    const point = await createPointAs(resolveRequestUserIdMock, "owner-user", 31);

    resolveRequestUserIdMock.mockResolvedValueOnce(null);
    const unauth = await postConfirm(
      jsonRequest(`http://localhost/api/points/${point.id}/confirm`, "POST", {
        status: "verified",
      }),
      { params: Promise.resolve({ id: point.id }) },
    );
    expect(unauth.status).toBe(401);

    resolveRequestUserIdMock.mockResolvedValueOnce("owner-user");
    const forbidden = await postConfirm(
      jsonRequest(`http://localhost/api/points/${point.id}/confirm`, "POST", {
        status: "verified",
      }),
      { params: Promise.resolve({ id: point.id }) },
    );
    expect(forbidden.status).toBe(403);

    resolveRequestUserIdMock.mockResolvedValueOnce("test-admin");
    const success = await postConfirm(
      jsonRequest(`http://localhost/api/points/${point.id}/confirm`, "POST", {
        status: "verified",
      }),
      { params: Promise.resolve({ id: point.id }) },
    );
    expect(success.status).toBe(200);

    const payload = (await success.json()) as {
      verifiedAt: string | null;
      verificationStatus: string;
    };
    expect(typeof payload.verifiedAt).toBe("string");
    expect(payload.verificationStatus).toBe("verified");
  });
});
