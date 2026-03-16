import AdminDashboardClient from "@/components/admin/AdminDashboardClient";
import { getCurrentUserId } from "@/lib/current-user";
import { isAdminUserId } from "@/lib/request-user";
import { AdminFilterState } from "@/types/admin";
import { PointCategory } from "@/types/point";
import { notFound, redirect } from "next/navigation";

type AdminPageSearchParams = Record<string, string | string[] | undefined>;

const REPORT_STATUS_VALUES = new Set(["pending", "resolved", "dismissed"]);
const REPORT_TYPE_VALUES = new Set([
  "all",
  "incorrect_location",
  "no_longer_exists",
  "wrong_category",
  "spam",
  "inappropriate",
  "other",
]);
const SORT_VALUES = new Set(["newest", "oldest"]);
const SUGGEST_STATUS_VALUES = new Set(["pending", "applied", "dismissed"]);
const CATEGORY_VALUES = new Set([
  "all",
  "battery",
  "electronics",
  "medicine",
  "fluorescent",
  "toner",
  "other",
]);

function resolveDevUserId() {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  if (process.env.ALLOW_DEV_USER_HEADER !== "true") {
    return null;
  }
  const raw = process.env.NEXT_PUBLIC_DEV_USER_ID;
  if (!raw) {
    return null;
  }
  const value = raw.trim();
  return value.length > 0 ? value : null;
}

function readParam(params: AdminPageSearchParams, key: string) {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function buildInitialFilters(params: AdminPageSearchParams): AdminFilterState {
  const reportStatusRaw = readParam(params, "r_status");
  const reportTypeRaw = readParam(params, "r_type");
  const reportSortRaw = readParam(params, "r_sort");
  const reportQRaw = readParam(params, "r_q");

  const suggestStatusRaw = readParam(params, "s_status");
  const suggestCategoryRaw = readParam(params, "s_category");
  const suggestSortRaw = readParam(params, "s_sort");
  const suggestQRaw = readParam(params, "s_q");

  return {
    reportStatus: REPORT_STATUS_VALUES.has(reportStatusRaw ?? "")
      ? (reportStatusRaw as AdminFilterState["reportStatus"])
      : "pending",
    reportType: REPORT_TYPE_VALUES.has(reportTypeRaw ?? "")
      ? (reportTypeRaw as AdminFilterState["reportType"])
      : "all",
    reportSort: SORT_VALUES.has(reportSortRaw ?? "")
      ? (reportSortRaw as AdminFilterState["reportSort"])
      : "newest",
    reportQ: (reportQRaw ?? "").slice(0, 80),
    suggestStatus: SUGGEST_STATUS_VALUES.has(suggestStatusRaw ?? "")
      ? (suggestStatusRaw as AdminFilterState["suggestStatus"])
      : "pending",
    suggestCategory: CATEGORY_VALUES.has(suggestCategoryRaw ?? "")
      ? (suggestCategoryRaw as "all" | PointCategory)
      : "all",
    suggestSort: SORT_VALUES.has(suggestSortRaw ?? "")
      ? (suggestSortRaw as AdminFilterState["suggestSort"])
      : "newest",
    suggestQ: (suggestQRaw ?? "").slice(0, 80),
  };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<AdminPageSearchParams> | AdminPageSearchParams;
}) {
  const resolvedParams = (searchParams ? await searchParams : {}) as AdminPageSearchParams;
  const initialFilters = buildInitialFilters(resolvedParams);

  const sessionUserId = await getCurrentUserId();
  const userId = sessionUserId ?? resolveDevUserId();

  if (!userId) {
    redirect("/login?callbackUrl=%2Fadmin");
  }
  if (!isAdminUserId(userId)) {
    notFound();
  }

  return <AdminDashboardClient initialFilters={initialFilters} />;
}
