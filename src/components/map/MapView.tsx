"use client";

import "leaflet/dist/leaflet.css";
import "react-leaflet-markercluster/styles";

import PointPopupContent from "@/components/map/PointPopupContent";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "@/constants/map";
import { getPointIcon } from "@/lib/map-marker-icon";
import { CollectionPoint } from "@/types/point";
import L from "leaflet";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";

interface MapViewProps {
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

function FocusPointController({
  focusedPoint,
}: {
  focusedPoint: { id: string; lat: number; lng: number; zoom?: number } | null;
}) {
  const map = useMap();
  const lastFocusedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!focusedPoint) {
      lastFocusedIdRef.current = null;
      return;
    }

    if (lastFocusedIdRef.current === focusedPoint.id) {
      return;
    }

    const currentCenter = map.getCenter();
    const alreadyNearTarget =
      Math.abs(currentCenter.lat - focusedPoint.lat) < 0.0002 &&
      Math.abs(currentCenter.lng - focusedPoint.lng) < 0.0002;
    if (alreadyNearTarget) {
      lastFocusedIdRef.current = focusedPoint.id;
      return;
    }

    lastFocusedIdRef.current = focusedPoint.id;
    const zoom = focusedPoint.zoom ?? Math.max(map.getZoom(), 16);
    map.flyTo([focusedPoint.lat, focusedPoint.lng], zoom, {
      animate: true,
      duration: 0.28,
    });
  }, [focusedPoint, map]);

  return null;
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(4));
}

function MapEvents({
  onMapClick,
  onBoundsChange,
}: {
  onMapClick: (position: { lat: number; lng: number }) => void;
  onBoundsChange: (bounds: {
    swLat: number;
    swLng: number;
    neLat: number;
    neLng: number;
  }) => void;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const map = useMapEvents({
    click(event) {
      onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
    moveend() {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        const bounds = map.getBounds();
        onBoundsChange({
          swLat: roundCoordinate(bounds.getSouthWest().lat),
          swLng: roundCoordinate(bounds.getSouthWest().lng),
          neLat: roundCoordinate(bounds.getNorthEast().lat),
          neLng: roundCoordinate(bounds.getNorthEast().lng),
        });
      }, 260);
    },
  });

  const emitBounds = useCallback(() => {
    const bounds = map.getBounds();
    onBoundsChange({
      swLat: roundCoordinate(bounds.getSouthWest().lat),
      swLng: roundCoordinate(bounds.getSouthWest().lng),
      neLat: roundCoordinate(bounds.getNorthEast().lat),
      neLng: roundCoordinate(bounds.getNorthEast().lng),
    });
  }, [map, onBoundsChange]);

  useEffect(() => {
    emitBounds();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [emitBounds]);

  return null;
}

function MapView({
  points,
  selectedPosition,
  selectedPointId,
  focusedPoint,
  onMapClick,
  onRequestRegister,
  onPointSelect,
  onBoundsChange,
}: MapViewProps) {
  const registrationIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div style="width:34px;height:34px;border-radius:9999px;background:#047857;border:2px solid #065f46;box-shadow:0 8px 18px rgba(6,95,70,0.45);display:grid;place-items:center;color:#fff;font-weight:700;font-size:18px;">+</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -28],
      }),
    [],
  );

  const selectedPoint = useMemo(() => {
    if (!selectedPointId) {
      return null;
    }
    return points.find((point) => point.id === selectedPointId) ?? null;
  }, [points, selectedPointId]);

  const clusteredPoints = useMemo(() => {
    if (!selectedPointId) {
      return points;
    }
    return points.filter((point) => point.id !== selectedPointId);
  }, [points, selectedPointId]);

  return (
    <MapContainer
      center={MAP_DEFAULT_CENTER}
      zoom={MAP_DEFAULT_ZOOM}
      className="h-full w-full"
      scrollWheelZoom
      zoomSnap={1}
      zoomAnimation
      fadeAnimation={false}
      markerZoomAnimation={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains={["a", "b", "c", "d"]}
        updateWhenZooming={false}
        updateWhenIdle
        keepBuffer={4}
      />
      <MapEvents onMapClick={onMapClick} onBoundsChange={onBoundsChange} />
      <FocusPointController focusedPoint={focusedPoint} />

      <MarkerClusterGroup
        chunkedLoading
        chunkInterval={120}
        chunkDelay={24}
        removeOutsideVisibleBounds
        animate={false}
        showCoverageOnHover={false}
        spiderfyOnMaxZoom={false}
        disableClusteringAtZoom={17}
      >
        {clusteredPoints.map((point) => (
          <Marker
            key={point.id}
            position={[point.lat, point.lng]}
            icon={getPointIcon(point, false)}
            eventHandlers={{
              click: () => onPointSelect(point.id),
            }}
          />
        ))}
      </MarkerClusterGroup>

      {selectedPoint ? (
        <Marker
          key={`selected-${selectedPoint.id}`}
          position={[selectedPoint.lat, selectedPoint.lng]}
          icon={getPointIcon(selectedPoint, true)}
          zIndexOffset={1000}
          eventHandlers={{
            click: () => onPointSelect(selectedPoint.id),
          }}
        >
          <Popup>
            <PointPopupContent point={selectedPoint} onPointSelect={onPointSelect} />
          </Popup>
        </Marker>
      ) : null}

      {selectedPosition ? (
        <Marker
          position={[selectedPosition.lat, selectedPosition.lng]}
          icon={registrationIcon}
        >
          <Popup>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-stone-800">새 수거함 위치를 선택했습니다.</p>
              <button
                type="button"
                onClick={onRequestRegister}
                className="rounded-md border border-emerald-900 bg-emerald-900 px-2 py-1 text-xs font-semibold text-emerald-50"
              >
                이 위치 등록하기
              </button>
            </div>
          </Popup>
        </Marker>
      ) : null}
    </MapContainer>
  );
}

export default memo(MapView);
