import { CATEGORIES, PointCategory, PointStatus } from "@/types/point";
import {
  Battery,
  CircleHelp,
  Lightbulb,
  Pill,
  Printer,
  Smartphone,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

interface CategoryVisual {
  icon: LucideIcon;
  bgColor: string;
  ringColor: string;
  textColor: string;
  softBg: string;
}

export const CATEGORY_VISUALS: Record<PointCategory, CategoryVisual> = {
  battery: {
    icon: Battery,
    bgColor: "#f59e0b",
    ringColor: "#d97706",
    textColor: "#7c2d12",
    softBg: "#fef3c7",
  },
  electronics: {
    icon: Smartphone,
    bgColor: "#3b82f6",
    ringColor: "#2563eb",
    textColor: "#1e3a8a",
    softBg: "#dbeafe",
  },
  medicine: {
    icon: Pill,
    bgColor: "#ef4444",
    ringColor: "#dc2626",
    textColor: "#7f1d1d",
    softBg: "#fee2e2",
  },
  fluorescent: {
    icon: Lightbulb,
    bgColor: "#8b5cf6",
    ringColor: "#7c3aed",
    textColor: "#4c1d95",
    softBg: "#ede9fe",
  },
  toner: {
    icon: Printer,
    bgColor: "#64748b",
    ringColor: "#475569",
    textColor: "#334155",
    softBg: "#e2e8f0",
  },
  other: {
    icon: CircleHelp,
    bgColor: "#10b981",
    ringColor: "#059669",
    textColor: "#14532d",
    softBg: "#d1fae5",
  },
};

export function getCategoryVisual(category: PointCategory) {
  return CATEGORY_VISUALS[category];
}

interface PointMarkerHtmlOptions {
  category: PointCategory;
  status: PointStatus;
  reportCount: number;
  selected: boolean;
}

export function createPointMarkerHtml(options: PointMarkerHtmlOptions) {
  const visual = getCategoryVisual(options.category);
  const Icon = visual.icon;
  const showAlert = options.status === "reported" || options.reportCount >= 3;

  const marker = renderToStaticMarkup(
    <div
      style={{
        position: "relative",
        width: "42px",
        height: "42px",
        display: "grid",
        placeItems: "center",
      }}
    >
      <span
        style={{
          position: "absolute",
          width: options.selected ? "42px" : "36px",
          height: options.selected ? "42px" : "36px",
          borderRadius: "9999px",
          backgroundColor: visual.bgColor,
          border: `2px solid ${visual.ringColor}`,
          boxShadow: options.selected
            ? `0 0 0 3px rgba(255,255,255,0.95), 0 10px 20px ${visual.ringColor}55`
            : "0 8px 16px rgba(15, 23, 42, 0.2)",
          display: "grid",
          placeItems: "center",
          transition: "all 160ms ease",
        }}
      >
        <Icon size={16} strokeWidth={2.25} color="#ffffff" />
      </span>

      {showAlert ? (
        <span
          style={{
            position: "absolute",
            top: "-2px",
            right: "-1px",
            width: "17px",
            height: "17px",
            borderRadius: "9999px",
            backgroundColor: "#dc2626",
            border: "1.5px solid #ffffff",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 3px 8px rgba(127, 29, 29, 0.5)",
          }}
        >
          <TriangleAlert size={11} strokeWidth={2.5} color="#ffffff" />
        </span>
      ) : null}

      <span
        style={{
          position: "absolute",
          bottom: "-8px",
          width: "14px",
          height: "14px",
          transform: "rotate(45deg)",
          backgroundColor: visual.bgColor,
          borderRight: `2px solid ${visual.ringColor}`,
          borderBottom: `2px solid ${visual.ringColor}`,
          borderRadius: "3px",
        }}
      />
    </div>,
  );

  return marker;
}

export function getCategoryChipStyle(category: PointCategory, active: boolean) {
  const visual = getCategoryVisual(category);

  if (active) {
    return {
      backgroundColor: visual.bgColor,
      color: "#ffffff",
      borderColor: visual.ringColor,
    };
  }

  return {
    backgroundColor: visual.softBg,
    color: visual.textColor,
    borderColor: `${visual.ringColor}55`,
  };
}

export function categoryLabel(category: PointCategory) {
  return CATEGORIES[category].label;
}
