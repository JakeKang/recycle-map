import { GET as getSuggestions, POST as postSuggestion } from "@/app/api/points/[id]/suggestions/route";
import {
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

describe("point suggestions route", () => {
  beforeEach(() => {
    setupPointsTestState(resolveRequestUserIdMock);
  });

  it("POST/GET /api/points/[id]/suggestions works with auth and validation", async () => {
    const createdPoint = await createPointAs(resolveRequestUserIdMock, "owner-user", 8);

    resolveRequestUserIdMock.mockResolvedValueOnce(null);
    const noAuth = await postSuggestion(
      jsonRequest(`http://localhost/api/points/${createdPoint.id}/suggestions`, "POST", {
        category: "battery",
      }),
      { params: Promise.resolve({ id: createdPoint.id }) },
    );
    expect(noAuth.status).toBe(401);

    resolveRequestUserIdMock.mockResolvedValueOnce("reviewer-user");
    const invalid = await postSuggestion(
      jsonRequest(`http://localhost/api/points/${createdPoint.id}/suggestions`, "POST", {
        category: "not-valid",
      }),
      { params: Promise.resolve({ id: createdPoint.id }) },
    );
    expect(invalid.status).toBe(400);

    resolveRequestUserIdMock.mockResolvedValueOnce("reviewer-user");
    const success = await postSuggestion(
      jsonRequest(`http://localhost/api/points/${createdPoint.id}/suggestions`, "POST", {
        category: "toner",
        address: "수정 제안 주소",
        description: "위치 설명 업데이트",
      }),
      { params: Promise.resolve({ id: createdPoint.id }) },
    );
    expect(success.status).toBe(201);

    const list = await getSuggestions(
      new NextRequest(`http://localhost/api/points/${createdPoint.id}/suggestions`),
      { params: Promise.resolve({ id: createdPoint.id }) },
    );
    expect(list.status).toBe(200);

    const payload = (await list.json()) as Array<{ payload: { category: string } }>;
    expect(payload.length).toBeGreaterThanOrEqual(1);
    expect(payload[0]?.payload.category).toBe("toner");
  });
});
