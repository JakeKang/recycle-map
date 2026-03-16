import { GET as getReviews, POST as postReview } from "@/app/api/points/[id]/reviews/route";
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

describe("point reviews route", () => {
  beforeEach(() => {
    setupPointsTestState(resolveRequestUserIdMock);
  });

  it("POST /api/points/[id]/reviews handles auth and duplicate guard", async () => {
    const created = await createPointAs(resolveRequestUserIdMock, "review-owner", 2);

    resolveRequestUserIdMock.mockResolvedValueOnce(null);
    const noAuth = await postReview(
      jsonRequest(
        `http://localhost/api/points/${created.id}/reviews`,
        "POST",
        { rating: 5, comment: "good" },
      ),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(noAuth.status).toBe(401);

    resolveRequestUserIdMock.mockResolvedValueOnce("reviewer-1");
    const first = await postReview(
      jsonRequest(
        `http://localhost/api/points/${created.id}/reviews`,
        "POST",
        { rating: 5, comment: "아주 좋아요" },
      ),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(first.status).toBe(201);

    resolveRequestUserIdMock.mockResolvedValueOnce("reviewer-1");
    const duplicate = await postReview(
      jsonRequest(
        `http://localhost/api/points/${created.id}/reviews`,
        "POST",
        { rating: 4, comment: "중복" },
      ),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(duplicate.status).toBe(409);
  });

  it("GET /api/points/[id]/reviews supports pagination", async () => {
    const created = await createPointAs(resolveRequestUserIdMock, "review-owner", 3);

    resolveRequestUserIdMock.mockResolvedValueOnce("reviewer-2");
    await postReview(
      jsonRequest(
        `http://localhost/api/points/${created.id}/reviews`,
        "POST",
        { rating: 5, comment: "리뷰 1" },
      ),
      { params: Promise.resolve({ id: created.id }) },
    );

    resolveRequestUserIdMock.mockResolvedValueOnce("reviewer-3");
    await postReview(
      jsonRequest(
        `http://localhost/api/points/${created.id}/reviews`,
        "POST",
        { rating: 4, comment: "리뷰 2" },
      ),
      { params: Promise.resolve({ id: created.id }) },
    );

    const paged = await getReviews(
      new NextRequest(
        `http://localhost/api/points/${created.id}/reviews?page=1&limit=1`,
      ),
      { params: Promise.resolve({ id: created.id }) },
    );

    expect(paged.status).toBe(200);
    const payload = (await paged.json()) as { data: unknown[]; total: number };
    expect(payload.total).toBeGreaterThanOrEqual(2);
    expect(payload.data.length).toBe(1);
  });
});
