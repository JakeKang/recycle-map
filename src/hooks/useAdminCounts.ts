"use client";

import { buildClientHeaders } from "@/lib/client-dev-user";
import type { AdminCounts } from "@/app/api/admin/counts/route";
import { useQuery } from "@tanstack/react-query";

const STALE_TIME = 30_000;

export function useAdminCounts() {
  return useQuery<AdminCounts>({
    queryKey: ["admin", "counts"],
    queryFn: async () => {
      const response = await fetch("/api/admin/counts", {
        headers: buildClientHeaders(),
      });
      if (response.status === 401 || response.status === 403) {
        return { pendingReports: 0, pendingSuggestions: 0 };
      }
      if (!response.ok) {
        throw new Error("카운트를 불러오지 못했습니다.");
      }
      return response.json();
    },
    staleTime: STALE_TIME,
    refetchInterval: STALE_TIME,
  });
}
