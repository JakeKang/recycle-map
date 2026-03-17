import { formatValidationIssues } from "@/lib/api-error";
import { readJsonBody } from "@/lib/http-body";
import { repository } from "@/lib/data-repository";
import { toPublicPoints } from "@/lib/public-mappers";
import { consumeRateLimit } from "@/lib/rate-limit";
import { resolveClientAddress, isSameOriginRequest } from "@/lib/request-security";
import { resolveRequestUserId } from "@/lib/request-user";
import { containsSpam } from "@/lib/spam-filter";
import { pointSchema } from "@/lib/validators";
import { PointCategory, PointQuery } from "@/types/point";
import { NextRequest, NextResponse } from "next/server";

const DAILY_LIMIT = 5;
const registrationCounter = new Map<string, { date: string; count: number }>();

export function resetPointsRouteStateForTests() {
  registrationCounter.clear();
}

const KOREA_LAT = { min: 33, max: 43 } as const;
const KOREA_LNG = { min: 124, max: 132 } as const;

function parseNumber(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseLatBound(value: string | null): number | undefined {
  const n = parseNumber(value);
  if (n === undefined) return undefined;
  return n >= KOREA_LAT.min && n <= KOREA_LAT.max ? n : undefined;
}

function parseLngBound(value: string | null): number | undefined {
  const n = parseNumber(value);
  if (n === undefined) return undefined;
  return n >= KOREA_LNG.min && n <= KOREA_LNG.max ? n : undefined;
}

function buildQuery(searchParams: URLSearchParams): PointQuery {
  const category = searchParams.get("category") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  return {
    q: searchParams.get("q") ?? undefined,
    category: category as PointCategory | undefined,
    status: status as PointQuery["status"],
    swLat: parseLatBound(searchParams.get("sw_lat")),
    swLng: parseLngBound(searchParams.get("sw_lng")),
    neLat: parseLatBound(searchParams.get("ne_lat")),
    neLng: parseLngBound(searchParams.get("ne_lng")),
  };
}

function buildPointsResponse(
  data: Awaited<ReturnType<typeof repository.listPoints>>,
  startedAt: number,
) {
  const elapsedMs = Date.now() - startedAt;
  const response = NextResponse.json(toPublicPoints(data));
  response.headers.set("x-points-query-ms", String(elapsedMs));
  response.headers.set("x-points-count", String(data.length));
  return { response, elapsedMs };
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const mine = request.nextUrl.searchParams.get("mine") === "1";
  if (mine) {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return NextResponse.json(
        { message: "로그인이 필요한 기능입니다." },
        { status: 401 },
      );
    }

    const data = await repository.listPointsByUser(userId);
    const { response } = buildPointsResponse(data, startedAt);
    return response;
  }

  const query = buildQuery(request.nextUrl.searchParams);
  const data = await repository.listPoints(query);
  const { response, elapsedMs } = buildPointsResponse(data, startedAt);

  if (elapsedMs >= 350 && process.env.NODE_ENV !== "test") {
    const statusLabel = query.status ?? "active";
    console.info(
      `[points] slow list query: ${elapsedMs}ms (status=${statusLabel}, count=${data.length})`,
    );
  }

  return response;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "허용되지 않은 요청 origin입니다." }, { status: 403 });
  }

  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json(
      { message: "로그인이 필요한 기능입니다." },
      { status: 401 },
    );
  }

  const clientAddress = resolveClientAddress(request);
  const rateLimit = consumeRateLimit({
    key: `points:create:${userId}:${clientAddress}`,
    windowMs: 60_000,
    max: 20,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSec) },
      },
    );
  }

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ message: bodyResult.message }, { status: 400 });
  }

  const payload = bodyResult.data;
  const parsed = pointSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: formatValidationIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  if (containsSpam(`${parsed.data.title} ${parsed.data.description ?? ""}`)) {
    return NextResponse.json(
      { message: "스팸성 내용이 감지되었습니다." },
      { status: 400 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const current = registrationCounter.get(userId);
  if (current?.date === today && current.count >= DAILY_LIMIT) {
    return NextResponse.json(
      { message: "일일 등록 한도(5건)를 초과했습니다." },
      { status: 429 },
    );
  }

  if (await repository.hasDuplicateNearby(parsed.data.lat, parsed.data.lng, parsed.data.category, 50)) {
    return NextResponse.json(
      { message: "반경 50m 내 동일 카테고리 수거함이 이미 존재합니다." },
      { status: 409 },
    );
  }

  const created = await repository.createPoint({
    userId,
    title: parsed.data.title,
    category: parsed.data.category,
    description: parsed.data.description ?? null,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    address: parsed.data.address ?? null,
    status: "active",
    avgRating: 0,
    reviewCount: 0,
    reportCount: 0,
    verifiedAt: null,
    photoIds: parsed.data.photoIds,
  });

  if (!current || current.date !== today) {
    registrationCounter.set(userId, { date: today, count: 1 });
  } else {
    registrationCounter.set(userId, { date: today, count: current.count + 1 });
  }

  return NextResponse.json(created, { status: 201 });
}
