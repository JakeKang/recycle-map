import { POST as postPoint, resetPointsRouteStateForTests } from "@/app/api/points/route";
import { resetStoreForTests } from "@/lib/data-store";
import { NextRequest } from "next/server";
import { expect } from "vitest";

export interface PointResponse {
  id: string;
  userId: string;
  title: string;
  category: string;
  description: string | null;
  lat: number;
  lng: number;
  address: string | null;
  status: string;
  avgRating: number;
  reviewCount: number;
  reportCount: number;
  verifiedAt: string | null;
}

export function jsonRequest(url: string, method: string, body: unknown) {
  return new NextRequest(url, {
    method,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export function setupPointsTestState(
  resolveRequestUserIdMock: {
    mockReset: () => void;
    mockResolvedValue: (value: string) => void;
  },
) {
  resolveRequestUserIdMock.mockReset();
  resolveRequestUserIdMock.mockResolvedValue("default-user");
  resetStoreForTests();
  resetPointsRouteStateForTests();

  process.env.NEXT_PUBLIC_SUPABASE_URL = "";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
}

export async function createPointAs(
  resolveRequestUserIdMock: { mockResolvedValueOnce: (value: string) => void },
  userId: string,
  index = 0,
) {
  resolveRequestUserIdMock.mockResolvedValueOnce(userId);

  const request = jsonRequest("http://localhost/api/points", "POST", {
    title: `테스트 수거함 ${userId} ${index}`,
    category: "other",
    lat: 35.3 + index * 0.01,
    lng: 128.2 + index * 0.01,
    address: `부산 테스트 ${index}`,
    description: "route test",
  });

  const response = await postPoint(request);
  expect(response.status).toBe(201);
  return (await response.json()) as PointResponse;
}
