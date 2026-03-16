export type ReportType =
  | "incorrect_location"
  | "no_longer_exists"
  | "wrong_category"
  | "spam"
  | "inappropriate"
  | "other";

export type ReportStatus = "pending" | "resolved" | "dismissed";

export interface Report {
  id: string;
  pointId: string;
  userId: string;
  type: ReportType;
  reason: string | null;
  status: ReportStatus;
  createdAt: string;
}
