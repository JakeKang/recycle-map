import { GET as getPoints, POST as postPoint } from "@/app/api/points/route";
import {
  createPointAs,
  PointResponse,
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

describe("points route", () => {
  beforeEach(() => {
    setupPointsTestState(resolveRequestUserIdMock);
  });

  it("GET /api/points returns filtered list", async () => {
    const response = await getPoints(
      new NextRequest("http://localhost/api/points?category=battery&q=%EC%8B%9C%EC%B2%AD"),
    );
    expect(response.status).toBe(200);

    const data = (await response.json()) as PointResponse[];
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data.every((item) => item.category === "battery")).toBe(true);
  });

  it("GET /api/points?mine=1 enforces auth and returns user points", async () => {
    resolveRequestUserIdMock.mockResolvedValueOnce(null);
    const unauth = await getPoints(new NextRequest("http://localhost/api/points?mine=1"));
    expect(unauth.status).toBe(401);

    const mine = await createPointAs(resolveRequestUserIdMock, "mine-user", 10);
    await createPointAs(resolveRequestUserIdMock, "other-user", 11);

    resolveRequestUserIdMock.mockResolvedValueOnce("mine-user");
    const mineResponse = await getPoints(new NextRequest("http://localhost/api/points?mine=1"));
    expect(mineResponse.status).toBe(200);

    const data = (await mineResponse.json()) as PointResponse[];
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data.every((item) => !("userId" in item))).toBe(true);
    expect(data.some((item) => item.id === mine.id)).toBe(true);
  });

  it("POST /api/points returns 401 when unauthenticated", async () => {
    resolveRequestUserIdMock.mockResolvedValueOnce(null);

    const response = await postPoint(
      jsonRequest("http://localhost/api/points", "POST", {
        title: "인증없는 등록",
        category: "battery",
        lat: 35.1,
        lng: 128.1,
      }),
    );

    expect(response.status).toBe(401);
  });

  it("POST /api/points validates payload and spam", async () => {
    resolveRequestUserIdMock.mockResolvedValueOnce("tester");
    const invalid = await postPoint(
      jsonRequest("http://localhost/api/points", "POST", {
        title: "x",
        category: "battery",
        lat: 35.1,
        lng: 128.1,
      }),
    );
    expect(invalid.status).toBe(400);
    const invalidPayload = (await invalid.json()) as { message: string };
    expect(typeof invalidPayload.message).toBe("string");

    resolveRequestUserIdMock.mockResolvedValueOnce("tester");
    const spam = await postPoint(
      jsonRequest("http://localhost/api/points", "POST", {
        title: "광고 클릭 이벤트",
        category: "battery",
        lat: 35.1,
        lng: 128.1,
      }),
    );
    expect(spam.status).toBe(400);
  });

  it("POST /api/points enforces duplicate radius and daily limit", async () => {
    resolveRequestUserIdMock.mockResolvedValueOnce("dup-user");
    const first = await postPoint(
      jsonRequest("http://localhost/api/points", "POST", {
        title: "중복 검사 1",
        category: "battery",
        lat: 35.2222,
        lng: 128.3333,
      }),
    );
    expect(first.status).toBe(201);

    resolveRequestUserIdMock.mockResolvedValueOnce("dup-user");
    const duplicate = await postPoint(
      jsonRequest("http://localhost/api/points", "POST", {
        title: "중복 검사 2",
        category: "battery",
        lat: 35.2222,
        lng: 128.3333,
      }),
    );
    expect(duplicate.status).toBe(409);

    for (let i = 0; i < 5; i += 1) {
      resolveRequestUserIdMock.mockResolvedValueOnce("limit-user");
      const ok = await postPoint(
        jsonRequest("http://localhost/api/points", "POST", {
          title: `일일 제한 테스트 ${i}`,
          category: "toner",
          lat: 34.5 + i * 0.01,
          lng: 127.5 + i * 0.01,
        }),
      );
      expect(ok.status).toBe(201);
    }

    resolveRequestUserIdMock.mockResolvedValueOnce("limit-user");
    const blocked = await postPoint(
      jsonRequest("http://localhost/api/points", "POST", {
        title: "6번째 등록",
        category: "toner",
        lat: 34.7,
        lng: 127.7,
      }),
    );
    expect(blocked.status).toBe(429);
  });
});
