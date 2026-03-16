import { PointCategory } from "@/types/point";

export interface SuggestionPayload {
  category: PointCategory;
  address?: string;
  description?: string;
}

export interface PointSuggestion {
  id: string;
  pointId: string;
  userId: string;
  payload: SuggestionPayload;
  status: "pending" | "applied" | "dismissed";
  createdAt: string;
}
