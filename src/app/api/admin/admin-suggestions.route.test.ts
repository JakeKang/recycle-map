import { PATCH as patchSuggestion } from "@/app/api/admin/suggestions/[id]/route";
import { GET as getSuggestions } from "@/app/api/admin/suggestions/route";
import { GET as getPoint } from "@/app/api/points/[id]/route";
import { POST as postSuggestion } from "@/app/api/points/[id]/suggestions/route";
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

describe("admin suggestions route", () => {
  beforeEach(() => {
    setupPointsTestState(resolveRequestUserIdMock);
  });

  it("GET/PATCH admin suggestions works and applies suggestion to point", async () => {
    const point = await createPointAs(resolveRequestUserIdMock, "owner-user", 61);

    resolveRequestUserIdMock.mockResolvedValueOnce("reviewer-user");
    const createdSuggestion = await postSuggestion(
      jsonRequest(`http://localhost/api/points/${point.id}/suggestions`, "POST", {
        category: "toner",
        address: "새 주소",
        description: "수정 제안 설명",
      }),
      { params: Promise.resolve({ id: point.id }) },
    );
    expect(createdSuggestion.status).toBe(201);
    const suggestionPayload = (await createdSuggestion.json()) as { id: string };

    resolveRequestUserIdMock.mockResolvedValueOnce("test-admin");
    const list = await getSuggestions(new NextRequest("http://localhost/api/admin/suggestions"));
    expect(list.status).toBe(200);
    const listData = (await list.json()) as Array<{
      suggestion: { id: string };
      point: { id: string; category: string } | null;
    }>;
    const found = listData.find((item) => item.suggestion.id === suggestionPayload.id);
    expect(Boolean(found)).toBe(true);
    expect(found?.point?.id).toBe(point.id);
    expect(found?.point?.category).toBe("other");

    resolveRequestUserIdMock.mockResolvedValueOnce("test-admin");
    const filteredEmpty = await getSuggestions(
      new NextRequest("http://localhost/api/admin/suggestions?status=pending&category=battery"),
    );
    expect(filteredEmpty.status).toBe(200);
    const filteredData = (await filteredEmpty.json()) as Array<{ suggestion: { id: string } }>;
    expect(filteredData).toHaveLength(0);

    resolveRequestUserIdMock.mockResolvedValueOnce("test-admin");
    const patched = await patchSuggestion(
      jsonRequest(`http://localhost/api/admin/suggestions/${suggestionPayload.id}`, "PATCH", {
        status: "applied",
      }),
      { params: Promise.resolve({ id: suggestionPayload.id }) },
    );
    expect(patched.status).toBe(200);

    const pointDetail = await getPoint(new NextRequest(`http://localhost/api/points/${point.id}`), {
      params: Promise.resolve({ id: point.id }),
    });
    const pointData = (await pointDetail.json()) as {
      category: string;
      address: string | null;
      description: string | null;
    };
    expect(pointData.category).toBe("toner");
    expect(pointData.address).toBe("새 주소");
    expect(pointData.description).toBe("수정 제안 설명");
  });
});
