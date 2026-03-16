"use client";

import { CollectionPoint } from "@/types/point";
import dynamic from "next/dynamic";
import { memo } from "react";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-emerald-900/70">
      지도를 불러오는 중...
    </div>
  ),
});

interface MapContainerProps {
  points: CollectionPoint[];
  selectedPosition: { lat: number; lng: number } | null;
  selectedPointId: string | null;
  focusedPoint: { id: string; lat: number; lng: number; zoom?: number } | null;
  onMapClick: (position: { lat: number; lng: number }) => void;
  onRequestRegister: () => void;
  onPointSelect: (pointId: string) => void;
  onBoundsChange: (bounds: {
    swLat: number;
    swLng: number;
    neLat: number;
    neLng: number;
  }) => void;
}

function RecycleMapContainer(props: MapContainerProps) {
  return <MapView {...props} />;
}

export default memo(RecycleMapContainer);
