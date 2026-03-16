"use client";

import AuthStatus from "@/components/common/AuthStatus";
import RecycleMapContainer from "@/components/map/MapContainer";
import MyReportsSheet from "@/components/panel/MyReportsSheet";
import PointDetailSheet from "@/components/panel/PointDetailSheet";
import type { MobileSnap } from "@/components/panel/PointDetailSheet";
import RegisterPointDialog from "@/components/point/RegisterPointDialog";
import { usePoints } from "@/hooks/usePoints";
import {
  categoryLabel,
  getCategoryChipStyle,
  getCategoryVisual,
} from "@/lib/point-visuals";
import {
  useMapStore,
} from "@/stores/mapStore";
import { CATEGORIES, PointCategory, PointQuery } from "@/types/point";
import {
  ListFilter,
  MapPinPlus,
  LocateFixed,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CATEGORY_ENTRIES = Object.entries(CATEGORIES) as Array<
  [PointCategory, (typeof CATEGORIES)[PointCategory]]
>;

const SHEET_SNAP_ORDER: MobileSnap[] = ["peek", "mid", "full"];

const MANAGED_QUERY_KEYS = ["q", "category", "sort", "point", "sheet", "reports"];
const NEARBY_RADIUS_METERS = 3500;
const MAX_NEARBY_CARDS = 12;

function isCategoryOrAll(value: string | null): value is PointCategory | "all" {
  if (!value) {
    return false;
  }

  return value === "all" || value in CATEGORIES;
}

function isMobileSnap(value: string | null): value is MobileSnap {
  return value === "peek" || value === "mid" || value === "full";
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371e3;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return earthRadius * c;
}

function formatDistanceLabel(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `내 위치 ${Math.round(distanceMeters)}m`;
  }

  return `내 위치 ${(distanceMeters / 1000).toFixed(1)}km`;
}

function isSameBounds(
  a: { swLat: number; swLng: number; neLat: number; neLng: number } | null,
  b: { swLat: number; swLng: number; neLat: number; neLng: number },
) {
  if (!a) {
    return false;
  }

  return (
    a.swLat === b.swLat &&
    a.swLng === b.swLng &&
    a.neLat === b.neLat &&
    a.neLng === b.neLng
  );
}

export default function Home() {
  const initializedFromUrlRef = useRef(false);
  const previousUrlStateRef = useRef<{
    query: string;
    selectedCategory: PointCategory | "all";
    selectedPointId: string | null;
    sheetSnap: MobileSnap;
    isMyReportsOpen: boolean;
  } | null>(null);

  const {
    selectedCategory,
    query,
    bounds,
    registrationPosition,
    setBounds,
    setSelectedCategory,
    setQuery,
    setRegistrationPosition,
  } = useMapStore();

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [sheetSnap, setSheetSnap] = useState<MobileSnap>("mid");
  const [manualFocusTarget, setManualFocusTarget] = useState<{
    id: string;
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isMyReportsOpen, setIsMyReportsOpen] = useState(false);
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const didAutoLocateRef = useRef(false);
  const boundsRef = useRef(bounds);

  useEffect(() => {
    boundsRef.current = bounds;
  }, [bounds]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const applyStateFromParams = useCallback(
    (params: URLSearchParams, resetMissingToDefault: boolean) => {
      let hasIncomingState = false;

      const shouldOpenReports = params.get("reports") === "1";

      const nextCategory = params.get("category");
      if (isCategoryOrAll(nextCategory)) {
        if (nextCategory !== selectedCategory) {
          setSelectedCategory(nextCategory);
          hasIncomingState = true;
        }
      } else if (resetMissingToDefault && selectedCategory !== "all") {
        setSelectedCategory("all");
        hasIncomingState = true;
      }

      const nextQuery = params.get("q");
      if (typeof nextQuery === "string") {
        if (nextQuery !== query) {
          setQuery(nextQuery);
          hasIncomingState = true;
        }
      } else if (resetMissingToDefault && query !== "") {
        setQuery("");
        hasIncomingState = true;
      }

      if (shouldOpenReports) {
        if (selectedPointId !== null) {
          setSelectedPointId(null);
          hasIncomingState = true;
        }
        if (sheetSnap !== "mid") {
          setSheetSnap("mid");
          hasIncomingState = true;
        }
        if (!isMyReportsOpen) {
          setIsMyReportsOpen(true);
          hasIncomingState = true;
        }
      } else {
        const nextPointId = params.get("point");
        if (nextPointId) {
          if (nextPointId !== selectedPointId) {
            setSelectedPointId(nextPointId);
            hasIncomingState = true;
          }
        } else if (resetMissingToDefault && selectedPointId !== null) {
          setSelectedPointId(null);
          hasIncomingState = true;
        }

        const nextSheetSnap = params.get("sheet");
        if (isMobileSnap(nextSheetSnap)) {
          if (nextSheetSnap !== sheetSnap) {
            setSheetSnap(nextSheetSnap);
            hasIncomingState = true;
          }
        } else if (resetMissingToDefault && sheetSnap !== "mid") {
          setSheetSnap("mid");
          hasIncomingState = true;
        }
      }

      if (!shouldOpenReports && resetMissingToDefault && isMyReportsOpen) {
        setIsMyReportsOpen(false);
        hasIncomingState = true;
      }

      return hasIncomingState;
    },
    [
      query,
      selectedCategory,
      selectedPointId,
      sheetSnap,
      isMyReportsOpen,
      setQuery,
      setSelectedCategory,
    ],
  );

  useEffect(() => {
    if (initializedFromUrlRef.current) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      applyStateFromParams(params, false);

      initializedFromUrlRef.current = true;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [applyStateFromParams]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      applyStateFromParams(params, true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [applyStateFromParams]);

  useEffect(() => {
    if (!initializedFromUrlRef.current) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    for (const key of MANAGED_QUERY_KEYS) {
      params.delete(key);
    }

    if (query.trim()) {
      params.set("q", query.trim());
    }
    if (selectedCategory !== "all") {
      params.set("category", selectedCategory);
    }
    if (!isMyReportsOpen && selectedPointId) {
      params.set("point", selectedPointId);
    }
    if (!isMyReportsOpen && selectedPointId && sheetSnap !== "mid") {
      params.set("sheet", sheetSnap);
    }
    if (isMyReportsOpen) {
      params.set("reports", "1");
    }

    const nextQueryString = params.toString();
    const currentQueryString = new URLSearchParams(window.location.search).toString();
    const previousUrlState = previousUrlStateRef.current;
    const hasPanelTransition =
      previousUrlState !== null &&
      (previousUrlState.selectedPointId !== selectedPointId ||
        previousUrlState.isMyReportsOpen !== isMyReportsOpen);

    const nextState = {
      query,
      selectedCategory,
      selectedPointId,
      sheetSnap,
      isMyReportsOpen,
    } as const;

    if (nextQueryString === currentQueryString) {
      previousUrlStateRef.current = nextState;
      return;
    }

    const pathname = window.location.pathname;
    const nextUrl = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
    if (hasPanelTransition) {
      window.history.pushState(null, "", nextUrl);
    } else {
      window.history.replaceState(null, "", nextUrl);
    }

    previousUrlStateRef.current = nextState;
  }, [query, selectedCategory, selectedPointId, sheetSnap, isMyReportsOpen]);

  useEffect(() => {
    if (!selectedPointId) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const currentIndex = SHEET_SNAP_ORDER.indexOf(sheetSnap);
      if (currentIndex < 0) {
        return;
      }

      if (event.key === "]" && currentIndex < SHEET_SNAP_ORDER.length - 1) {
        event.preventDefault();
        setSheetSnap(SHEET_SNAP_ORDER[currentIndex + 1]);
        return;
      }

      if (event.key === "[" && currentIndex > 0) {
        event.preventDefault();
        setSheetSnap(SHEET_SNAP_ORDER[currentIndex - 1]);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedPointId(null);
        setSheetSnap("mid");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedPointId, sheetSnap]);

  const baseQuery = useMemo<PointQuery>(
    () => ({
      q: debouncedQuery || undefined,
      category: selectedCategory === "all" ? undefined : selectedCategory,
      ...(bounds ?? {}),
    }),
    [bounds, debouncedQuery, selectedCategory],
  );
  const hasBounds = bounds !== null;

  const { data: mapPoints = [], isLoading } = usePoints(
    { ...baseQuery, status: "visible" },
    { enabled: hasBounds },
  );

  const focusedPoint = useMemo(() => {
    if (!selectedPointId) {
      return manualFocusTarget;
    }

    const target = mapPoints.find((point) => point.id === selectedPointId);
    if (!target) {
      return manualFocusTarget;
    }

    return { id: target.id, lat: target.lat, lng: target.lng, zoom: 16 };
  }, [manualFocusTarget, mapPoints, selectedPointId]);

  const requestCurrentLocation = useCallback(
    (options?: { silent?: boolean; recenter?: boolean }) => {
      const silent = options?.silent ?? false;
      const recenter = options?.recenter ?? true;

      if (!navigator.geolocation) {
        if (!silent) {
          setLocationError("이 브라우저에서는 위치 기능을 지원하지 않습니다.");
        }
        return;
      }

      setIsLocating(true);
      if (!silent) {
        setLocationError(null);
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = Number(position.coords.latitude.toFixed(6));
          const lng = Number(position.coords.longitude.toFixed(6));
          setUserLocation({ lat, lng });
          if (recenter) {
            setManualFocusTarget({ id: `me-${Date.now()}`, lat, lng, zoom: 15 });
          }
          setIsLocating(false);
          setLocationError(null);
        },
        () => {
          setIsLocating(false);
          if (!silent) {
            setLocationError("현재 위치를 가져오지 못했습니다. 위치 권한을 확인해 주세요.");
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 30_000,
        },
      );
    },
    [],
  );

  useEffect(() => {
    if (didAutoLocateRef.current) {
      return;
    }
    didAutoLocateRef.current = true;

    const timer = window.setTimeout(() => {
      requestCurrentLocation({ silent: true, recenter: true });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [requestCurrentLocation]);

  const handleLocateCurrentPosition = useCallback(() => {
    requestCurrentLocation({ silent: false, recenter: true });
  }, [requestCurrentLocation]);

  const handleBoundsChange = useCallback(
    (nextBounds: { swLat: number; swLng: number; neLat: number; neLng: number }) => {
      if (isSameBounds(boundsRef.current, nextBounds)) {
        return;
      }
      setBounds(nextBounds);
    },
    [setBounds],
  );

  const handleMapClick = useCallback(
    (position: { lat: number; lng: number }) => {
      setRegistrationPosition(position);
      setSelectedPointId(null);
      setManualFocusTarget(null);
    },
    [setRegistrationPosition],
  );

  const handlePointSelect = useCallback((pointId: string) => {
    setIsMyReportsOpen(false);
    setSelectedPointId(pointId);
    setSheetSnap("mid");
    setManualFocusTarget(null);
  }, []);

  const handleOpenMyReports = useCallback(() => {
    setIsMyReportsOpen(true);
    setSelectedPointId(null);
    setSheetSnap("mid");
  }, []);

  const handleRequestRegister = useCallback(() => {
    setIsRegisterDialogOpen(true);
  }, []);

  const nearbyPoints = useMemo(() => {
    if (!userLocation) {
      return mapPoints.slice(0, MAX_NEARBY_CARDS).map((point) => ({ point, distance: null }));
    }

    const withDistance = mapPoints
      .map((point) => ({
        point,
        distance: haversineMeters(userLocation.lat, userLocation.lng, point.lat, point.lng),
      }))
      .sort((a, b) => {
        if (a.distance === b.distance) {
          return a.point.id.localeCompare(b.point.id);
        }
        return a.distance - b.distance;
      });

    const nearbyOnly = withDistance.filter((entry) => entry.distance <= NEARBY_RADIUS_METERS);
    const source = nearbyOnly.length > 0 ? nearbyOnly : withDistance;
    return source.slice(0, MAX_NEARBY_CARDS);
  }, [mapPoints, userLocation]);

  const activeCategoryLabel =
    selectedCategory === "all" ? "전체" : CATEGORIES[selectedCategory].label;

  return (
    <main className="h-screen overflow-hidden bg-[linear-gradient(165deg,#eef7f1_0%,#f7fbf8_55%,#edf5ef_100%)] p-3 md:p-4">
      <div className="mx-auto grid h-full max-w-[1600px] overflow-hidden rounded-3xl border border-emerald-900/15 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.13)] md:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="flex h-full flex-col border-b border-emerald-900/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbf9_100%)] md:border-b-0 md:border-r">
          <div className="border-b border-emerald-900/10 px-4 pb-4 pt-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-900 text-lg text-emerald-50">
                ♻
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">RecycleMap</p>
                <h1 className="text-base font-bold tracking-tight text-emerald-900">우리동네 자원순환 알리미</h1>
              </div>
            </div>

            <AuthStatus />

            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                className="w-full rounded-xl border border-emerald-900/15 bg-white py-2 pl-9 pr-3 text-sm text-stone-800 outline-none ring-emerald-700/30 placeholder:text-stone-400 focus:ring"
                placeholder="주소 또는 장소명으로 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  selectedCategory === "all"
                    ? "bg-emerald-900 text-emerald-50"
                    : "border border-emerald-900/15 bg-white text-stone-600"
                }`}
              >
                전체
              </button>
              {CATEGORY_ENTRIES.map(([key]) => {
                const visual = getCategoryChipStyle(key, selectedCategory === key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCategory(key)}
                    className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition"
                    style={visual}
                  >
                    {categoryLabel(key)}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
              <p>
                {activeCategoryLabel} · {isLoading ? "불러오는 중" : `${mapPoints.length}개`}
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenMyReports}
                  className="rounded-lg border border-emerald-900/15 bg-white px-2 py-1 font-semibold text-emerald-900"
                >
                  내 제보
                </button>
                <button
                  type="button"
                  onClick={handleLocateCurrentPosition}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-900 bg-emerald-900 px-2 py-1 font-semibold text-emerald-50"
                >
                  <LocateFixed size={12} /> {isLocating ? "위치 확인 중" : "내 위치"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700">
              <ListFilter size={13} /> 수거함 목록
            </span>
            <button
              type="button"
              onClick={() => {
                if (registrationPosition) {
                  setIsRegisterDialogOpen(true);
                  return;
                }
                setLocationError("지도를 클릭해 위치를 선택한 뒤 등록해 주세요.");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-900 bg-emerald-900 px-2.5 py-1.5 text-xs font-semibold text-emerald-50"
            >
              <MapPinPlus size={12} /> 등록하기
            </button>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
            {mapPoints.length === 0 ? (
              <p className="rounded-xl border border-dashed border-emerald-900/20 bg-emerald-50/50 p-3 text-sm text-stone-600">
                현재 조건에 맞는 수거함이 없습니다.
              </p>
            ) : (
              mapPoints.map((point) => {
                const visual = getCategoryVisual(point.category);
                return (
                  <button
                    key={point.id}
                    type="button"
                    onClick={() => handlePointSelect(point.id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                      selectedPointId === point.id
                        ? "border-emerald-900 bg-emerald-50"
                        : "border-transparent bg-white hover:border-emerald-900/20"
                    }`}
                  >
                    <p className="text-[11px] font-semibold" style={{ color: visual.textColor }}>
                      {categoryLabel(point.category)}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-stone-900">{point.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{point.address ?? "주소 미입력"}</p>
                    <p className="mt-1 text-[11px] text-stone-500">
                      평점 {point.avgRating} · 리뷰 {point.reviewCount}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className={`relative flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,#f6faf7_0%,#eff6f1_100%)] ${selectedPointId ? "md:pr-[430px]" : ""}`}>

          <div className="px-3 pb-2 pt-3 md:pt-4">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-900/10 bg-white/90 px-3 py-2 text-xs text-stone-600">
              {registrationPosition ? (
                <>
                  <span className="rounded-md border border-emerald-900/15 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-900">
                    선택 위치 {registrationPosition.lat.toFixed(4)}, {registrationPosition.lng.toFixed(4)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsRegisterDialogOpen(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-900 bg-emerald-900 px-2.5 py-1.5 text-xs font-semibold text-emerald-50"
                  >
                    <MapPinPlus size={13} /> 이 위치 등록
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegistrationPosition(null)}
                    className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700"
                  >
                    취소
                  </button>
                </>
              ) : (
                <span className="rounded-md border border-emerald-900/10 bg-emerald-50/70 px-2 py-1 text-[11px] text-emerald-900">
                  지도에서 위치를 클릭하면 등록 준비가 됩니다.
                </span>
              )}
            </div>

            {locationError ? (
              <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                {locationError}
              </p>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 px-3 pb-2">
            <div className="h-full overflow-hidden rounded-2xl border border-emerald-900/12 bg-white">
              <RecycleMapContainer
                points={mapPoints}
                selectedPosition={registrationPosition}
                selectedPointId={selectedPointId}
                focusedPoint={focusedPoint}
                onMapClick={handleMapClick}
                onRequestRegister={handleRequestRegister}
                onPointSelect={handlePointSelect}
                onBoundsChange={handleBoundsChange}
              />
            </div>
          </div>

          <div className="border-t border-emerald-900/10 bg-white/90 px-2 py-2">
            <div className="mb-1 flex items-center justify-between px-2">
              <p className="text-xs font-semibold text-stone-700">내 주변 가까운 수거함</p>
              <p className="text-[11px] text-stone-500">최대 {MAX_NEARBY_CARDS}개</p>
            </div>
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
              {nearbyPoints.map(({ point, distance }) => {
                const visual = getCategoryVisual(point.category);
                return (
                  <button
                    key={point.id}
                    type="button"
                    onClick={() => handlePointSelect(point.id)}
                    className={`min-w-[220px] snap-start rounded-xl border px-3 py-2 text-left transition ${
                      selectedPointId === point.id
                        ? "border-emerald-900 bg-emerald-50"
                        : "border-emerald-900/12 bg-white hover:border-emerald-900/30"
                    }`}
                  >
                    <p className="text-xs font-semibold" style={{ color: visual.textColor }}>
                      {categoryLabel(point.category)}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-stone-900">{point.title}</p>
                    <p className="mt-0.5 text-[11px] text-stone-500">
                      {distance !== null
                        ? formatDistanceLabel(distance)
                        : `평점 ${point.avgRating} · 신고 ${point.reportCount}`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <RegisterPointDialog
        open={isRegisterDialogOpen}
        position={registrationPosition}
        onClose={() => setIsRegisterDialogOpen(false)}
        onSuccess={() => {
          setRegistrationPosition(null);
        }}
      />

      <PointDetailSheet
        key={selectedPointId ?? "none"}
        pointId={selectedPointId}
        mobileSnap={sheetSnap}
        onMobileSnapChange={setSheetSnap}
        onClose={() => {
          setSelectedPointId(null);
          setSheetSnap("mid");
        }}
      />

      <MyReportsSheet
        open={isMyReportsOpen}
        onClose={() => setIsMyReportsOpen(false)}
        onFocusPoint={(point) => {
          setIsMyReportsOpen(false);
          setSelectedPointId(point.id);
          setSheetSnap("mid");
          setManualFocusTarget({
            id: `my-${point.id}`,
            lat: point.lat,
            lng: point.lng,
            zoom: 16,
          });
        }}
      />

      {selectedPointId ? (
        <button
          type="button"
          className="fixed inset-0 z-[1090] bg-[rgba(15,23,42,0.24)] md:hidden"
          aria-label="상세 패널 배경 닫기"
          onClick={() => {
            setSelectedPointId(null);
            setSheetSnap("mid");
          }}
        />
      ) : null}

      {selectedPointId ? (
        <button
          type="button"
          onClick={() => {
            setSelectedPointId(null);
            setSheetSnap("mid");
          }}
          className="fixed right-4 top-4 z-[1201] inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 shadow-lg md:hidden"
          aria-label="상세 패널 닫기"
        >
          <X size={16} />
        </button>
      ) : null}
    </main>
  );
}
