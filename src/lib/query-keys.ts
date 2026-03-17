export const QUERY_KEYS = {
  points: (params?: Record<string, unknown>) =>
    params ? ["points", params] : ["points"],
  point: (id: string) => ["point", id],
  pointSuggestions: (pointId: string) => ["point", pointId, "suggestions"],
  myPoints: () => ["points", "mine"],
  adminReports: (filters?: Record<string, unknown>) =>
    filters ? ["admin", "reports", filters] : ["admin", "reports"],
  adminSuggestions: (filters?: Record<string, unknown>) =>
    filters ? ["admin", "suggestions", filters] : ["admin", "suggestions"],
} as const;
