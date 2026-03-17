import { store } from "@/lib/data-store";
import { haversineMeters } from "@/lib/distance";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CollectionPoint, PointQuery } from "@/types/point";
import { Report } from "@/types/report";
import { Review } from "@/types/review";
import { PointSuggestion } from "@/types/suggestion";

type PointInsertInput = Omit<CollectionPoint, "id" | "createdAt" | "updatedAt">;

type DbPointRow = {
  id: string;
  user_id: string;
  title: string;
  category: CollectionPoint["category"];
  description: string | null;
  lat: number;
  lng: number;
  address: string | null;
  status: CollectionPoint["status"];
  avg_rating: number | string | null;
  review_count: number | null;
  report_count: number | null;
  verified_at: string | null;
  photo_ids?: string[] | null;
  created_at: string;
  updated_at: string;
};

type DbReviewRow = {
  id: string;
  point_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

type DbReportRow = {
  id: string;
  point_id: string;
  user_id: string;
  type: Report["type"];
  reason: string | null;
  status: Report["status"];
  created_at: string;
};

type DbSuggestionRow = {
  id: string;
  point_id: string;
  user_id: string;
  reason: string | null;
  status: "pending" | "resolved" | "dismissed";
  created_at: string;
};

function toPoint(row: DbPointRow): CollectionPoint {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    category: row.category,
    description: row.description,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    status: row.status,
    avgRating: Number(row.avg_rating ?? 0),
    reviewCount: row.review_count ?? 0,
    reportCount: row.report_count ?? 0,
    verifiedAt: row.verified_at,
    photoIds: row.photo_ids ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toReview(row: DbReviewRow): Review {
  return {
    id: row.id,
    pointId: row.point_id,
    userId: row.user_id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

function toReport(row: DbReportRow): Report {
  return {
    id: row.id,
    pointId: row.point_id,
    userId: row.user_id,
    type: row.type,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
  };
}

function toSuggestion(row: DbSuggestionRow): PointSuggestion {
  let payload: PointSuggestion["payload"] = { category: "other" };
  if (row.reason) {
    try {
      const parsed = JSON.parse(row.reason) as PointSuggestion["payload"];
      if (parsed && typeof parsed === "object" && "category" in parsed) {
        payload = parsed;
      }
    } catch {
      payload = { category: "other", description: row.reason };
    }
  }

  return {
    id: row.id,
    pointId: row.point_id,
    userId: row.user_id,
    payload,
    status: row.status === "resolved" ? "applied" : row.status,
    createdAt: row.created_at,
  };
}

async function withFallback<T>(callback: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await callback();
  } catch (error) {
    if (process.env.ALLOW_DB_FALLBACK_ON_ERROR !== "true") {
      throw error;
    }

    return fallback();
  }
}

export const repository = {
  async listPoints(query: PointQuery): Promise<CollectionPoint[]> {
    return withFallback(
      async () => {
        const client = createSupabaseServerClient();
        if (!client) {
          return store.listPoints(query);
        }

        const isVisibleStatus = query.status === "visible";
        const statusFilter = query.status ?? "active";
        const limitCount = isVisibleStatus ? 1000 : 200;

        let request = client
          .from("collection_points")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limitCount);

        if (isVisibleStatus) {
          request = request.in("status", ["active", "reported"]);
        } else {
          request = request.eq("status", statusFilter);
        }

        if (query.category) {
          request = request.eq("category", query.category);
        }
        if (query.swLat !== undefined) {
          request = request.gte("lat", query.swLat);
        }
        if (query.neLat !== undefined) {
          request = request.lte("lat", query.neLat);
        }
        if (query.swLng !== undefined) {
          request = request.gte("lng", query.swLng);
        }
        if (query.neLng !== undefined) {
          request = request.lte("lng", query.neLng);
        }

        const { data, error } = await request;
        if (error) {
          throw error;
        }

        const mapped = (data as DbPointRow[]).map(toPoint);
        if (!query.q) {
          return mapped;
        }

        const keyword = query.q.toLowerCase();
        return mapped.filter((item) =>
          `${item.title} ${item.address ?? ""}`.toLowerCase().includes(keyword),
        );
      },
      () => store.listPoints(query),
    );
  },

  async listPointsByUser(userId: string): Promise<CollectionPoint[]> {
    return withFallback(
      async () => {
        const client = createSupabaseServerClient();
        if (!client) {
          return store.listPointsByUser(userId);
        }

        const { data, error } = await client
          .from("collection_points")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) {
          throw error;
        }

        return (data as DbPointRow[]).map(toPoint);
      },
      () => store.listPointsByUser(userId),
    );
  },

  async getPoint(id: string): Promise<CollectionPoint | null> {
    return withFallback(
      async () => {
        const client = createSupabaseServerClient();
        if (!client) {
          return store.getPoint(id);
        }

        const { data, error } = await client
          .from("collection_points")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) {
          throw error;
        }
        return data ? toPoint(data as DbPointRow) : null;
      },
      () => store.getPoint(id),
    );
  },

  async createPoint(input: PointInsertInput): Promise<CollectionPoint> {
    return withFallback(
      async () => {
        const client = createSupabaseServerClient();
        if (!client) {
          return store.createPoint(input);
        }

        const { data, error } = await client
          .from("collection_points")
          .insert({
            user_id: input.userId,
            title: input.title,
            category: input.category,
            description: input.description,
            lat: input.lat,
            lng: input.lng,
            address: input.address,
            status: input.status,
            avg_rating: input.avgRating,
            review_count: input.reviewCount,
            report_count: input.reportCount,
            verified_at: input.verifiedAt,
            photo_ids: input.photoIds ?? [],
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        return toPoint(data as DbPointRow);
      },
      () => store.createPoint(input),
    );
  },

  async patchPoint(
    id: string,
    patch: Partial<CollectionPoint>,
  ): Promise<CollectionPoint | null> {
    return withFallback(
      async () => {
        const client = createSupabaseServerClient();
        if (!client) {
          return store.patchPoint(id, patch);
        }

        const payload: Record<string, unknown> = {};
        if (patch.title !== undefined) payload.title = patch.title;
        if (patch.category !== undefined) payload.category = patch.category;
        if (patch.description !== undefined) payload.description = patch.description;
        if (patch.lat !== undefined) payload.lat = patch.lat;
        if (patch.lng !== undefined) payload.lng = patch.lng;
        if (patch.address !== undefined) payload.address = patch.address;
        if (patch.status !== undefined) payload.status = patch.status;
        if (patch.verifiedAt !== undefined) payload.verified_at = patch.verifiedAt;

        const { data, error } = await client
          .from("collection_points")
          .update(payload)
          .eq("id", id)
          .select("*")
          .maybeSingle();

        if (error) {
          throw error;
        }

        return data ? toPoint(data as DbPointRow) : null;
      },
      () => store.patchPoint(id, patch),
    );
  },

  async hasDuplicateNearby(
    lat: number,
    lng: number,
    category: string,
    meters = 50,
  ): Promise<boolean> {
    return withFallback(
      async () => {
        const client = createSupabaseServerClient();
        if (!client) {
          return store.hasDuplicateNearby(lat, lng, category, meters);
        }

        const latDelta = meters / 111_320;
        const lngDelta = meters / (111_320 * Math.cos((lat * Math.PI) / 180));

        const { data, error } = await client
          .from("collection_points")
          .select("id,lat,lng,category,status")
          .eq("status", "active")
          .eq("category", category)
          .gte("lat", lat - latDelta)
          .lte("lat", lat + latDelta)
          .gte("lng", lng - lngDelta)
          .lte("lng", lng + lngDelta)
          .limit(50);

        if (error) {
          throw error;
        }

        return (data as Array<{ lat: number; lng: number }>).some((item) =>
          haversineMeters(lat, lng, item.lat, item.lng) <= meters,
        );
      },
      () => store.hasDuplicateNearby(lat, lng, category, meters),
    );
  },

  async listReviews(pointId: string): Promise<Review[]> {
    return withFallback(
      async () => {
        const client = createSupabaseServerClient();
        if (!client) {
          return store.listReviews(pointId);
        }

        const { data, error } = await client
          .from("reviews")
          .select("*")
          .eq("point_id", pointId)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        return (data as DbReviewRow[]).map(toReview);
      },
      () => store.listReviews(pointId),
    );
  },

  async createReview(
    input: Omit<Review, "id" | "createdAt">,
  ): Promise<Review | null> {
    return withFallback(
      async () => {
        const client = createSupabaseServerClient();
        if (!client) {
          return store.createReview(input);
        }

        const { data, error } = await client
          .from("reviews")
          .insert({
            point_id: input.pointId,
            user_id: input.userId,
            rating: input.rating,
            comment: input.comment,
          })
          .select("*")
          .maybeSingle();

        if (error) {
          if (error.code === "23505") {
            return null;
          }
          throw error;
        }

        if (!data) {
          return null;
        }

        return toReview(data as DbReviewRow);
      },
      () => store.createReview(input),
    );
  },

  async createReport(
    input: Omit<Report, "id" | "createdAt" | "status">,
  ): Promise<Report> {
    return withFallback(
      async () => {
        const client = createSupabaseServerClient();
        if (!client) {
          return store.createReport(input);
        }

        const { data, error } = await client
          .from("reports")
          .insert({
            point_id: input.pointId,
            user_id: input.userId,
            type: input.type,
            reason: input.reason,
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        const { count } = await client
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("point_id", input.pointId)
          .eq("status", "pending")
          .neq("type", "other");

        const reportCount = count ?? 0;
        await client
          .from("collection_points")
          .update({
            report_count: reportCount,
            status: reportCount >= 5 ? "reported" : "active",
          })
          .eq("id", input.pointId);

        return toReport(data as DbReportRow);
      },
      () => store.createReport(input),
    );
  },

  async listReports(status?: Report["status"]): Promise<Report[]> {
    return withFallback(
      async () => {
        const client = createSupabaseServerClient();
        if (!client) {
          return store.listReports(status);
        }

        let request = client
          .from("reports")
          .select("*")
          .neq("type", "other")
          .order("created_at", { ascending: false });

        if (status) {
          request = request.eq("status", status);
        }

        const { data, error } = await request;
        if (error) {
          throw error;
        }

        return (data as DbReportRow[]).map(toReport);
      },
      () => store.listReports(status),
    );
  },

  async updateReportStatus(
    id: string,
    status: Report["status"],
  ): Promise<Report | null> {
    return withFallback(
      async () => {
        const client = createSupabaseServerClient();
        if (!client) {
          return store.updateReportStatus(id, status);
        }

        const { data, error } = await client
          .from("reports")
          .update({ status })
          .eq("id", id)
          .neq("type", "other")
          .select("*")
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          return null;
        }

        const row = data as DbReportRow;
        const { count } = await client
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("point_id", row.point_id)
          .eq("status", "pending")
          .neq("type", "other");

        const pendingCount = count ?? 0;
        await client
          .from("collection_points")
          .update({
            report_count: pendingCount,
            status: pendingCount >= 5 ? "reported" : "active",
          })
          .eq("id", row.point_id);

        return toReport(row);
      },
      () => store.updateReportStatus(id, status),
    );
  },

  async listSuggestions(pointId: string): Promise<PointSuggestion[]> {
    return withFallback(
      async () => {
        const client = createSupabaseServerClient();
        if (!client) {
          return store.listSuggestions(pointId);
        }

        const { data, error } = await client
          .from("reports")
          .select("id,point_id,user_id,reason,status,created_at")
          .eq("point_id", pointId)
          .eq("type", "other")
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        return (data as DbSuggestionRow[]).map(toSuggestion);
      },
      () => store.listSuggestions(pointId),
    );
  },

  async listAllSuggestions(status?: PointSuggestion["status"]): Promise<PointSuggestion[]> {
    return withFallback(
      async () => {
        const client = createSupabaseServerClient();
        if (!client) {
          return store.listAllSuggestions(status);
        }

        let request = client
          .from("reports")
          .select("id,point_id,user_id,reason,status,created_at")
          .eq("type", "other")
          .order("created_at", { ascending: false });

        if (status === "pending") {
          request = request.eq("status", "pending");
        }
        if (status === "applied") {
          request = request.eq("status", "resolved");
        }
        if (status === "dismissed") {
          request = request.eq("status", "dismissed");
        }

        const { data, error } = await request;
        if (error) {
          throw error;
        }

        return (data as DbSuggestionRow[]).map(toSuggestion);
      },
      () => store.listAllSuggestions(status),
    );
  },

  async createSuggestion(
    input: Omit<PointSuggestion, "id" | "createdAt" | "status">,
  ): Promise<PointSuggestion> {
    return withFallback(
      async () => {
        const client = createSupabaseServerClient();
        if (!client) {
          return store.createSuggestion(input);
        }

        const { data, error } = await client
          .from("reports")
          .insert({
            point_id: input.pointId,
            user_id: input.userId,
            type: "other",
            reason: JSON.stringify(input.payload),
          })
          .select("id,point_id,user_id,reason,status,created_at")
          .single();

        if (error) {
          throw error;
        }

        return {
          id: data.id,
          pointId: data.point_id,
          userId: data.user_id,
          payload: input.payload,
          status: data.status === "resolved" ? "applied" : data.status,
          createdAt: data.created_at,
        };
      },
      () => store.createSuggestion(input),
    );
  },

  async updateSuggestionStatus(
    id: string,
    status: PointSuggestion["status"],
  ): Promise<PointSuggestion | null> {
    return withFallback(
      async () => {
        const client = createSupabaseServerClient();
        if (!client) {
          return store.updateSuggestionStatus(id, status);
        }

        const dbStatus = status === "applied" ? "resolved" : status;
        const { data, error } = await client
          .from("reports")
          .update({ status: dbStatus })
          .eq("id", id)
          .eq("type", "other")
          .select("id,point_id,user_id,reason,status,created_at")
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          return null;
        }

        return toSuggestion(data as DbSuggestionRow);
      },
      () => store.updateSuggestionStatus(id, status),
    );
  },
};
