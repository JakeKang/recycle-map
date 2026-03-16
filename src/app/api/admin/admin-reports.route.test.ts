import { PATCH as patchReport } from "@/app/api/admin/reports/[id]/route";
import { GET as getReports } from "@/app/api/admin/reports/route";
import { POST as postReport } from "@/app/api/points/[id]/reports/route";
import { GET as getPoint } from "@/app/api/points/[id]/route";
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

vi.mock("@/lib/request-user", async () => {
  const actual = await vi.importActual<typeof import("@/lib/request-user")>("@/lib/request-user");
  return {
    ...actual,
    resolveRequestUserId: resolveRequestUserIdMock,
  };
});

describe("admin reports route", () => {
  beforeEach(() => {
    setupPointsTestState(resolveRequestUserIdMock);
  });

  it("GET/PATCH admin reports works with admin guard", async () => {
    const point = await createPointAs(resolveRequestUserIdMock, "owner-user", 51);

    resolveRequestUserIdMock.mockResolvedValueOnce("reporter-user");
    const createdReport = await postReport(
      jsonRequest(`http://localhost/api/points/${point.id}/reports`, "POST", {
        type: "no_longer_exists",
        reason: "없어진 수거함",
      }),
      { params: Promise.resolve({ id: point.id }) },
    );
    expect(createdReport.status).toBe(201);
    const reportPayload = (await createdReport.json()) as { id: string };

    resolveRequestUserIdMock.mockResolvedValueOnce("reporter-user");
    const forbidden = await getReports(new NextRequest("http://localhost/api/admin/reports"));
    expect(forbidden.status).toBe(403);

    resolveRequestUserIdMock.mockResolvedValueOnce("test-admin");
    const list = await getReports(new NextRequest("http://localhost/api/admin/reports"));
    expect(list.status).toBe(200);
    const listData = (await list.json()) as Array<{
      report: { id: string };
      point: { id: string; title: string } | null;
    }>;
    const found = listData.find((item) => item.report.id === reportPayload.id);
    expect(Boolean(found)).toBe(true);
    expect(found?.point?.id).toBe(point.id);
    expect(typeof found?.point?.title).toBe("string");

    resolveRequestUserIdMock.mockResolvedValueOnce("test-admin");
    const filteredEmpty = await getReports(
      new NextRequest("http://localhost/api/admin/reports?status=pending&type=spam"),
    );
    expect(filteredEmpty.status).toBe(200);
    const filteredData = (await filteredEmpty.json()) as Array<{ report: { id: string } }>;
    expect(filteredData).toHaveLength(0);

    resolveRequestUserIdMock.mockResolvedValueOnce("test-admin");
    const patched = await patchReport(
      jsonRequest(`http://localhost/api/admin/reports/${reportPayload.id}`, "PATCH", {
        status: "resolved",
      }),
      { params: Promise.resolve({ id: reportPayload.id }) },
    );
    expect(patched.status).toBe(200);

    const pointDetail = await getPoint(new NextRequest(`http://localhost/api/points/${point.id}`), {
      params: Promise.resolve({ id: point.id }),
    });
    const pointData = (await pointDetail.json()) as { status: string };
    expect(pointData.status).toBe("inactive");
  });
});
