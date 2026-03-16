import { CollectionPoint, PointQuery } from "@/types/point";
import { Report } from "@/types/report";
import { Review } from "@/types/review";
import { PointSuggestion } from "@/types/suggestion";

const now = () => new Date().toISOString();

function parsePositiveIntEnv(rawValue: string | undefined, fallback: number) {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parseRatioEnv(rawValue: string | undefined, fallback: number) {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (parsed < 0) {
    return 0;
  }

  if (parsed > 1) {
    return 1;
  }

  return parsed;
}

function createSeedPoints(): CollectionPoint[] {
  const base: CollectionPoint[] = [
    {
      id: "seed-1",
      userId: "demo-user",
      title: "시청역 폐건전지 수거함",
      category: "battery",
      description: "지하 1층 출구 옆",
      lat: 37.5663,
      lng: 126.9779,
      address: "서울 중구 세종대로 110",
      status: "active",
      avgRating: 4.5,
      reviewCount: 2,
      reportCount: 0,
      verifiedAt: now(),
      photoIds: [],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: "seed-2",
      userId: "demo-user",
      title: "마포구청 폐소형가전함",
      category: "electronics",
      description: "청사 정문 오른쪽",
      lat: 37.5661,
      lng: 126.9015,
      address: "서울 마포구 월드컵로 212",
      status: "active",
      avgRating: 0,
      reviewCount: 0,
      reportCount: 0,
      verifiedAt: null,
      photoIds: [],
      createdAt: now(),
      updatedAt: now(),
    },
  ];

  const perfSeedCount = parsePositiveIntEnv(process.env.PERF_SEED_POINTS, 0);
  if (perfSeedCount === 0) {
    return base;
  }

  const reportedRatio = parseRatioEnv(process.env.PERF_SEED_REPORTED_RATIO, 0.12);
  const categories: CollectionPoint["category"][] = [
    "battery",
    "electronics",
    "medicine",
    "fluorescent",
    "toner",
    "other",
  ];

  const synthetic: CollectionPoint[] = [];
  for (let index = 0; index < perfSeedCount; index += 1) {
    const category = categories[index % categories.length];
    const latOffset = ((index % 120) - 60) * 0.0016;
    const lngOffset = ((Math.floor(index / 120) % 120) - 60) * 0.0016;
    const status: CollectionPoint["status"] =
      index % Math.max(1, Math.floor(1 / reportedRatio)) === 0 ? "reported" : "active";
    const reportCount = status === "reported" ? 3 + (index % 4) : index % 2;
    const reviewCount = index % 6;

    synthetic.push({
      id: `perf-${index + 1}`,
      userId: `perf-user-${(index % 25) + 1}`,
      title: `성능 더미 수거함 ${index + 1}`,
      category,
      description: "성능 검증용 자동 생성 데이터",
      lat: 37.5663 + latOffset,
      lng: 126.9779 + lngOffset,
      address: `서울 테스트구 성능로 ${index + 1}`,
      status,
      avgRating: Number(((index % 5) + 1).toFixed(1)),
      reviewCount,
      reportCount,
      verifiedAt: status === "active" ? now() : null,
      photoIds: [],
      createdAt: now(),
      updatedAt: now(),
    });
  }

  return [...synthetic, ...base];
}

function createSeedReviews(): Review[] {
  return [
    {
      id: "r-seed-1",
      pointId: "seed-1",
      userId: "demo-user",
      rating: 5,
      comment: "접근이 쉬웠어요",
      createdAt: now(),
    },
    {
      id: "r-seed-2",
      pointId: "seed-1",
      userId: "demo-user-2",
      rating: 4,
      comment: "안내표시가 명확해요",
      createdAt: now(),
    },
  ];
}

const points: CollectionPoint[] = createSeedPoints();

const reviews: Review[] = createSeedReviews();

const reports: Report[] = [];
const suggestions: PointSuggestion[] = [];

export function resetStoreForTests() {
  points.splice(0, points.length, ...createSeedPoints());
  reviews.splice(0, reviews.length, ...createSeedReviews());
  reports.splice(0, reports.length);
  suggestions.splice(0, suggestions.length);
}

function inBounds(point: CollectionPoint, query: PointQuery) {
  if (
    query.swLat === undefined ||
    query.swLng === undefined ||
    query.neLat === undefined ||
    query.neLng === undefined
  ) {
    return true;
  }

  return (
    point.lat >= query.swLat &&
    point.lat <= query.neLat &&
    point.lng >= query.swLng &&
    point.lng <= query.neLng
  );
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const earthRadius = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function recalcRating(pointId: string) {
  const target = points.find((point) => point.id === pointId);
  if (!target) {
    return;
  }

  const pointReviews = reviews.filter((review) => review.pointId === pointId);
  target.reviewCount = pointReviews.length;
  target.avgRating =
    pointReviews.length > 0
      ? Number(
          (
            pointReviews.reduce((sum, review) => sum + review.rating, 0) /
            pointReviews.length
          ).toFixed(1),
        )
      : 0;
  target.updatedAt = now();
}

function recalcPendingReportCount(pointId: string) {
  const target = points.find((point) => point.id === pointId);
  if (!target) {
    return;
  }

  const pendingCount = reports.filter(
    (report) => report.pointId === pointId && report.status === "pending",
  ).length;
  target.reportCount = pendingCount;
  target.status = pendingCount >= 5 ? "reported" : "active";
  target.updatedAt = now();
}

export const store = {
  listPoints(query: PointQuery) {
    const isVisibleStatus = query.status === "visible";

    const filtered = points
      .filter((point) => {
        if (isVisibleStatus) {
          return point.status === "active" || point.status === "reported";
        }

        return point.status === (query.status ?? "active");
      })
      .filter((point) => (query.category ? point.category === query.category : true))
      .filter((point) =>
        query.q
          ? `${point.title} ${point.address ?? ""}`
              .toLowerCase()
              .includes(query.q.toLowerCase())
          : true,
      )
      .filter((point) => inBounds(point, query));

    return filtered.sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
    );
  },

  listPointsByUser(userId: string) {
    return points
      .filter((point) => point.userId === userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  getPoint(id: string) {
    return points.find((point) => point.id === id) ?? null;
  },

  createPoint(input: Omit<CollectionPoint, "id" | "createdAt" | "updatedAt">) {
    const created: CollectionPoint = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now(),
      updatedAt: now(),
    };
    points.unshift(created);
    return created;
  },

  patchPoint(id: string, patch: Partial<CollectionPoint>) {
    const idx = points.findIndex((point) => point.id === id);
    if (idx < 0) {
      return null;
    }

    const current = points[idx];
    const next = {
      ...current,
      ...patch,
      id: current.id,
      updatedAt: now(),
    };
    points[idx] = next;
    return next;
  },

  hasDuplicateNearby(lat: number, lng: number, category: string, meters = 50) {
    return points.some((point) => {
      if (point.status !== "active" || point.category !== category) {
        return false;
      }

      return haversineMeters(lat, lng, point.lat, point.lng) <= meters;
    });
  },

  listReviews(pointId: string) {
    return reviews
      .filter((review) => review.pointId === pointId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  createReview(input: Omit<Review, "id" | "createdAt">) {
    const existing = reviews.find(
      (review) =>
        review.pointId === input.pointId && review.userId === input.userId,
    );
    if (existing) {
      return null;
    }

    const created: Review = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now(),
    };
    reviews.unshift(created);
    recalcRating(input.pointId);
    return created;
  },

  createReport(input: Omit<Report, "id" | "createdAt" | "status">) {
    const created: Report = {
      ...input,
      id: crypto.randomUUID(),
      status: "pending",
      createdAt: now(),
    };
    reports.unshift(created);

    recalcPendingReportCount(input.pointId);

    return created;
  },

  listReports(status?: Report["status"]) {
    return reports
      .filter((report) => (status ? report.status === status : true))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  updateReportStatus(id: string, status: Report["status"]) {
    const idx = reports.findIndex((report) => report.id === id);
    if (idx < 0) {
      return null;
    }

    reports[idx] = {
      ...reports[idx],
      status,
    };
    recalcPendingReportCount(reports[idx].pointId);
    return reports[idx];
  },

  listSuggestions(pointId: string) {
    return suggestions
      .filter((suggestion) => suggestion.pointId === pointId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  listAllSuggestions(status?: PointSuggestion["status"]) {
    return suggestions
      .filter((suggestion) => (status ? suggestion.status === status : true))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  createSuggestion(input: Omit<PointSuggestion, "id" | "createdAt" | "status">) {
    const created: PointSuggestion = {
      ...input,
      id: crypto.randomUUID(),
      status: "pending",
      createdAt: now(),
    };

    suggestions.unshift(created);
    return created;
  },

  updateSuggestionStatus(id: string, status: PointSuggestion["status"]) {
    const idx = suggestions.findIndex((suggestion) => suggestion.id === id);
    if (idx < 0) {
      return null;
    }

    suggestions[idx] = {
      ...suggestions[idx],
      status,
    };
    return suggestions[idx];
  },
};
