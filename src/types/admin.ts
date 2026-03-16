import { CollectionPoint } from "@/types/point";
import { PointCategory } from "@/types/point";
import { Report } from "@/types/report";
import { PointSuggestion } from "@/types/suggestion";

export interface AdminPointContext {
  id: CollectionPoint["id"];
  title: CollectionPoint["title"];
  category: CollectionPoint["category"];
  address: CollectionPoint["address"];
  status: CollectionPoint["status"];
  verifiedAt: CollectionPoint["verifiedAt"];
}

export interface AdminReportItem {
  report: Report;
  point: AdminPointContext | null;
}

export interface AdminSuggestionItem {
  suggestion: PointSuggestion;
  point: AdminPointContext | null;
}

export type AdminSortFilter = "newest" | "oldest";
export type AdminReportStatusFilter = Report["status"];
export type AdminReportTypeFilter = Report["type"] | "all";
export type AdminSuggestionStatusFilter = PointSuggestion["status"];
export type AdminSuggestionCategoryFilter = PointCategory | "all";

export interface AdminFilterState {
  reportStatus: AdminReportStatusFilter;
  reportType: AdminReportTypeFilter;
  reportSort: AdminSortFilter;
  reportQ: string;
  suggestStatus: AdminSuggestionStatusFilter;
  suggestCategory: AdminSuggestionCategoryFilter;
  suggestSort: AdminSortFilter;
  suggestQ: string;
}
