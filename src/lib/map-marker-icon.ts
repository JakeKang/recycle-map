import { createPointMarkerHtml } from "@/lib/point-visuals";
import { CollectionPoint } from "@/types/point";
import L from "leaflet";

const POINT_ICON_CACHE = new Map<string, L.DivIcon>();

function markerVisualStateKey(point: CollectionPoint, selected: boolean) {
  return [
    point.category,
    point.status,
    point.reportCount >= 3 ? "alert" : "normal",
    selected ? "selected" : "default",
  ].join("|");
}

export function getPointIcon(point: CollectionPoint, selected: boolean) {
  const cacheKey = markerVisualStateKey(point, selected);
  const cached = POINT_ICON_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const icon = L.divIcon({
    className: "",
    html: createPointMarkerHtml({
      category: point.category,
      status: point.status,
      reportCount: point.reportCount,
      selected,
    }),
    iconSize: [42, 48],
    iconAnchor: [21, 46],
    popupAnchor: [0, -38],
  });

  POINT_ICON_CACHE.set(cacheKey, icon);
  return icon;
}

export function clearPointIconCache() {
  POINT_ICON_CACHE.clear();
}
