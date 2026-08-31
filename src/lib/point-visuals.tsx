import {
  CATEGORIES,
  PointCategory,
  PointStatus,
  PointVerificationStatus,
} from "@/types/point";
import {
  BadgeCheck,
  Battery,
  CircleHelp,
  Clock3,
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
    bgColor: "var(--category-battery)",
    ringColor: "var(--category-battery-ring)",
    textColor: "var(--category-battery-ink)",
    softBg: "var(--category-battery-soft)",
  },
  electronics: {
    icon: Smartphone,
    bgColor: "var(--category-electronics)",
    ringColor: "var(--category-electronics-ring)",
    textColor: "var(--category-electronics-ink)",
    softBg: "var(--category-electronics-soft)",
  },
  medicine: {
    icon: Pill,
    bgColor: "var(--category-medicine)",
    ringColor: "var(--category-medicine-ring)",
    textColor: "var(--category-medicine-ink)",
    softBg: "var(--category-medicine-soft)",
  },
  fluorescent: {
    icon: Lightbulb,
    bgColor: "var(--category-fluorescent)",
    ringColor: "var(--category-fluorescent-ring)",
    textColor: "var(--category-fluorescent-ink)",
    softBg: "var(--category-fluorescent-soft)",
  },
  toner: {
    icon: Printer,
    bgColor: "var(--category-toner)",
    ringColor: "var(--category-toner-ring)",
    textColor: "var(--category-toner-ink)",
    softBg: "var(--category-toner-soft)",
  },
  other: {
    icon: CircleHelp,
    bgColor: "var(--category-other)",
    ringColor: "var(--category-other-ring)",
    textColor: "var(--category-other-ink)",
    softBg: "var(--category-other-soft)",
  },
};

export function getCategoryVisual(category: PointCategory) {
  return CATEGORY_VISUALS[category];
}

interface PointMarkerHtmlOptions {
  category: PointCategory;
  status: PointStatus;
  verificationStatus: PointVerificationStatus;
  reportCount: number;
  selected: boolean;
}

export function createPointMarkerHtml(options: PointMarkerHtmlOptions) {
  const visual = getCategoryVisual(options.category);
  const Icon = visual.icon;
  const showAlert = options.status === "reported" || options.reportCount >= 3;
  const verificationColor =
    options.verificationStatus === "verified"
      ? "var(--trust)"
      : options.verificationStatus === "inaccurate"
        ? "var(--danger)"
        : "var(--pending)";
  const StateIcon =
    showAlert || options.verificationStatus === "inaccurate"
      ? TriangleAlert
      : options.verificationStatus === "verified"
        ? BadgeCheck
        : Clock3;

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
          borderRadius: "var(--radius-pill)",
          backgroundColor: visual.bgColor,
          border: `3px solid ${verificationColor}`,
          boxShadow: options.selected
            ? "var(--shadow-marker-selected)"
            : "var(--shadow-marker)",
          display: "grid",
          placeItems: "center",
          transition: "all 160ms ease",
        }}
      >
        <Icon size={16} strokeWidth={2.25} color="var(--white)" />
      </span>

      <span
        style={{
          position: "absolute",
          top: "-3px",
          right: "-2px",
          width: "18px",
          height: "18px",
          borderRadius: "var(--radius-pill)",
          backgroundColor: verificationColor,
          border: "2px solid var(--white)",
          display: "grid",
          placeItems: "center",
          boxShadow: "var(--shadow-marker-badge)",
        }}
      >
        <StateIcon size={10} strokeWidth={2.6} color="var(--white)" />
      </span>

      {showAlert && options.verificationStatus !== "inaccurate" ? (
        <span
          style={{
            position: "absolute",
            top: "22px",
            right: "-1px",
            width: "14px",
            height: "14px",
            borderRadius: "var(--radius-pill)",
            backgroundColor: "var(--danger)",
            border: "1.5px solid var(--white)",
            display: "grid",
            placeItems: "center",
            boxShadow: "var(--shadow-marker-alert)",
          }}
        >
          <TriangleAlert size={9} strokeWidth={2.5} color="var(--white)" />
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
          borderRight: `2px solid ${verificationColor}`,
          borderBottom: `2px solid ${verificationColor}`,
          borderRadius: "3px",
        }}
      />
    </div>,
  );

  return marker;
}

export function getCategoryChipStyle(category: PointCategory, active: boolean) {
  void category;

  if (active) {
    return {
      backgroundColor: "var(--trust)",
      color: "var(--white)",
      borderColor: "var(--trust)",
    };
  }

  return {
    backgroundColor: "transparent",
    color: "var(--ink-muted)",
    borderColor: "var(--line)",
  };
}

export function categoryLabel(category: PointCategory) {
  return CATEGORIES[category].label;
}
