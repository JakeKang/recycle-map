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
  isAdminUserId: () => false,
}));

describe("point confirm route", () => {
  beforeEach(() => {
    setupPointsTestState(resolveRequestUserIdMock);
  });

  it("POST /api/points/[id]/confirm requires auth and updates verifiedAt", async () => {
    const point = await createPointAs(resolveRequestUserIdMock, "owner-user", 31);

    resolveRequestUserIdMock.mockResolvedValueOnce(null);
    const unauth = await postConfirm(
      jsonRequest(`http://localhost/api/points/${point.id}/confirm`, "POST", {}),
      { params: Promise.resolve({ id: point.id }) },
    );
    expect(unauth.status).toBe(401);

    resolveRequestUserIdMock.mockResolvedValueOnce("owner-user");
    const success = await postConfirm(
      jsonRequest(`http://localhost/api/points/${point.id}/confirm`, "POST", {}),
      { params: Promise.resolve({ id: point.id }) },
    );
    expect(success.status).toBe(200);

    const payload = (await success.json()) as { verifiedAt: string | null };
    expect(typeof payload.verifiedAt).toBe("string");
  });
});
