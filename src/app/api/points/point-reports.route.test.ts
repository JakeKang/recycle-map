import { GET as getPointById } from "@/app/api/points/[id]/route";
import { POST as postReport } from "@/app/api/points/[id]/reports/route";
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

describe("point reports route", () => {
  beforeEach(() => {
    setupPointsTestState(resolveRequestUserIdMock);
  });

  it("POST /api/points/[id]/reports validates auth and threshold", async () => {
    const created = await createPointAs(resolveRequestUserIdMock, "report-owner", 4);

    resolveRequestUserIdMock.mockResolvedValueOnce(null);
    const noAuth = await postReport(
      jsonRequest(`http://localhost/api/points/${created.id}/reports`, "POST", {
        type: "incorrect_location",
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(noAuth.status).toBe(401);

    for (let i = 0; i < 5; i += 1) {
      resolveRequestUserIdMock.mockResolvedValueOnce(`reporter-${i}`);
      const result = await postReport(
        jsonRequest(`http://localhost/api/points/${created.id}/reports`, "POST", {
          type: "incorrect_location",
          reason: `reason-${i}`,
        }),
        { params: Promise.resolve({ id: created.id }) },
      );
      expect(result.status).toBe(201);
    }

    const pointDetailResponse = await getPointById(
      new NextRequest(`http://localhost/api/points/${created.id}`),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(pointDetailResponse.status).toBe(200);

    const pointDetail = (await pointDetailResponse.json()) as PointResponse;
    expect(pointDetail.reportCount).toBeGreaterThanOrEqual(5);
    expect(pointDetail.status).toBe("reported");
  });
});
