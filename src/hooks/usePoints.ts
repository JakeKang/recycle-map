"use client";

import { extractErrorMessage } from "@/lib/api-error";
import { buildClientHeaders, buildClientJsonHeaders } from "@/lib/client-dev-user";
import { CollectionPoint, PointFormData, PointQuery } from "@/types/point";
import { PointSuggestion } from "@/types/suggestion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface UsePointsOptions {
  enabled?: boolean;
}

function toSearchParams(query?: PointQuery) {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (query.swLat !== undefined) params.set("sw_lat", String(query.swLat));
  if (query.swLng !== undefined) params.set("sw_lng", String(query.swLng));
  if (query.neLat !== undefined) params.set("ne_lat", String(query.neLat));
  if (query.neLng !== undefined) params.set("ne_lng", String(query.neLng));
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export function usePoints(query?: PointQuery, options?: UsePointsOptions) {
  return useQuery<CollectionPoint[]>({
    queryKey: ["points", query],
    enabled: options?.enabled ?? true,
    staleTime: 15_000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
      const response = await fetch(`/api/points${toSearchParams(query)}`);
      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        throw new Error(extractErrorMessage(payload, "포인트 목록 조회에 실패했습니다."));
      }

      const data = (await response.json()) as CollectionPoint[];

      if (process.env.NODE_ENV !== "production") {
        const serverMsRaw = response.headers.get("x-points-query-ms");
        const serverMs = serverMsRaw ? Number(serverMsRaw) : null;
        const elapsedMs =
          typeof performance !== "undefined" ? performance.now() - startedAt : Date.now() - startedAt;

        if ((serverMs !== null && serverMs >= 350) || elapsedMs >= 500) {
          const statusLabel = query?.status ?? "active";
          console.info(
            `[map] points query: server=${serverMs ?? "n/a"}ms client=${Math.round(elapsedMs)}ms status=${statusLabel} count=${data.length}`,
          );
        }
      }

      return data;
    },
  });
}

export function useCreatePoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PointFormData) => {
      const response = await fetch("/api/points", {
        method: "POST",
        headers: buildClientJsonHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorPayload: unknown = null;
        try {
          errorPayload = await response.json();
        } catch {
          errorPayload = null;
        }
        throw new Error(extractErrorMessage(errorPayload, "등록 실패"));
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points"] });
      queryClient.invalidateQueries({ queryKey: ["points", "mine"] });
    },
  });
}

export function useSuggestions(pointId: string | null) {
  return useQuery<PointSuggestion[]>({
    queryKey: ["point", pointId, "suggestions"],
    enabled: Boolean(pointId),
    queryFn: async () => {
      const response = await fetch(`/api/points/${pointId}/suggestions`);
      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        throw new Error(extractErrorMessage(payload, "수정 제안 목록 조회에 실패했습니다."));
      }

      return response.json();
    },
  });
}

export function useMyPoints(enabled = true) {
  return useQuery<CollectionPoint[]>({
    queryKey: ["points", "mine"],
    enabled,
    queryFn: async () => {
      const response = await fetch("/api/points?mine=1", {
        headers: buildClientHeaders(),
      });

      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        throw new Error(extractErrorMessage(payload, "내 제보 목록 조회에 실패했습니다."));
      }

      return response.json();
    },
  });
}

export function useUpdatePoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<PointFormData> }) => {
      const response = await fetch(`/api/points/${id}`, {
        method: "PATCH",
        headers: buildClientJsonHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let body: unknown = null;
        try {
          body = await response.json();
        } catch {
          body = null;
        }

        throw new Error(extractErrorMessage(body, "포인트 수정에 실패했습니다."));
      }

      return response.json();
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["points"] });
      await queryClient.invalidateQueries({ queryKey: ["points", "mine"] });
      await queryClient.invalidateQueries({ queryKey: ["point", variables.id] });
    },
  });
}
