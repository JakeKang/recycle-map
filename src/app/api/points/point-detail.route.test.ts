import { GET as getPointById, PATCH as patchPoint } from "@/app/api/points/[id]/route";
import {
  PointResponse,
  createPointAs,
  jsonRequest,
  setupPointsTestState,
} from "@/app/api/points/points-test-helpers";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveRequestUserIdMock } = vi.hoisted(() => ({
  resolveRequestUserIdMock: vi.fn(),
}));

vi.mock("@/lib/request-user", () => ({
  resolveRequestUserId: resolveRequestUserIdMock,
}));

describe("point detail route", () => {
  beforeEach(() => {
    setupPointsTestState(resolveRequestUserIdMock);
  });

  it("GET /api/points/[id] returns 404 for missing point", async () => {
    const response = await getPointById(
      new NextRequest("http://localhost/api/points/not-found"),
      { params: Promise.resolve({ id: "not-found" }) },
    );
    expect(response.status).toBe(404);
  });

  it("PATCH /api/points/[id] checks auth and owner", async () => {
    const created = await createPointAs(resolveRequestUserIdMock, "owner-1", 1);

    resolveRequestUserIdMock.mockResolvedValueOnce(null);
    const unauth = await patchPoint(
      jsonRequest(`http://localhost/api/points/${created.id}`, "PATCH", {
        title: "수정 실패",
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(unauth.status).toBe(401);

    resolveRequestUserIdMock.mockResolvedValueOnce("other-user");
    const forbidden = await patchPoint(
      jsonRequest(`http://localhost/api/points/${created.id}`, "PATCH", {
        title: "수정 실패",
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(forbidden.status).toBe(403);

    resolveRequestUserIdMock.mockResolvedValueOnce("owner-1");
    const success = await patchPoint(
      jsonRequest(`http://localhost/api/points/${created.id}`, "PATCH", {
        title: "수정 성공",
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(success.status).toBe(200);
    const patched = (await success.json()) as PointResponse;
    expect(patched.title).toBe("수정 성공");
  });
});
