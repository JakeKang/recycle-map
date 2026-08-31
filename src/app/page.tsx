"use client";

import RecycleMapContainer from "@/components/map/MapContainer";
import MobileBottomTabs from "@/components/navigation/MobileBottomTabs";
import MyReportsSheet from "@/components/panel/MyReportsSheet";
import PointDetailSheet from "@/components/panel/PointDetailSheet";
import SidebarPanelContent from "@/components/panel/SidebarPanelContent";
import type { MobileSnap } from "@/components/panel/PointDetailSheet";
import RegisterPointDialog from "@/components/point/RegisterPointDialog";
import { usePoints } from "@/hooks/usePoints";
import { getClientDevUserId } from "@/lib/client-dev-user";
import { haversineMeters } from "@/lib/distance";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  useMapStore,
  WorkspacePreset,
} from "@/stores/mapStore";
import { CATEGORIES, PointCategory, PointQuery } from "@/types/point";
import {
  Menu,
  MapPinPlus,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SHEET_SNAP_ORDER: MobileSnap[] = ["peek", "mid", "full"];

const MANAGED_QUERY_KEYS = ["q", "category", "sort", "preset", "point", "sheet", "reports"];

function isWorkspacePreset(value: string | null): value is WorkspacePreset {
  return (
    value === "field-map" || value === "collection-inbox" || value === "trust-reports"
  );
}
const MAX_PANEL_LIST_ITEMS = 180;

function boundsCenter(nextBounds: {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}) {
  return {
    lat: (nextBounds.swLat + nextBounds.neLat) / 2,
    lng: (nextBounds.swLng + nextBounds.neLng) / 2,
  };
}

function isCategoryOrAll(value: string | null): value is PointCategory | "all" {
  if (!value) {
    return false;
  }

  return value === "all" || value in CATEGORIES;
}

function isMobileSnap(value: string | null): value is MobileSnap {
  return value === "peek" || value === "mid" || value === "full";
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
    workspacePreset: WorkspacePreset;
    selectedPointId: string | null;
    sheetSnap: MobileSnap;
    isMyReportsOpen: boolean;
  } | null>(null);

  const {
    selectedCategory,
    query,
    bounds,
    registrationPosition,
    workspacePreset,
    setBounds,
    setSelectedCategory,
    setQuery,
    setRegistrationPosition,
    setWorkspacePreset,
  } = useMapStore();

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [sheetSnap, setSheetSnap] = useState<MobileSnap>("mid");
  const [manualFocusTarget, setManualFocusTarget] = useState<{
    id: string;
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);
  const {
    location: userLocation,
    isLocating,
    error: locationError,
    requestLocation,
    onLocated,
  } = useGeolocation(true);
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user || getClientDevUserId());
  const isAdmin = session?.user?.isAdmin ?? false;
  const [isMyReportsOpen, setIsMyReportsOpen] = useState(false);
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
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

      const nextPreset = params.get("preset");
      if (isWorkspacePreset(nextPreset)) {
        if (nextPreset !== workspacePreset) {
          setWorkspacePreset(nextPreset);
          hasIncomingState = true;
        }
      } else if (resetMissingToDefault && workspacePreset !== "field-map") {
        setWorkspacePreset("field-map");
        hasIncomingState = true;
      }

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
      workspacePreset,
      selectedPointId,
      sheetSnap,
      isMyReportsOpen,
      setQuery,
      setSelectedCategory,
      setWorkspacePreset,
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

    if (workspacePreset !== "field-map") {
      params.set("preset", workspacePreset);
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
      workspacePreset,
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
  }, [query, selectedCategory, workspacePreset, selectedPointId, sheetSnap, isMyReportsOpen]);

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

  const {
    data: mapPoints = [],
    isLoading,
    error: pointsError,
    refetch: refetchPoints,
  } = usePoints(
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

  onLocated(useCallback(({ lat, lng }: { lat: number; lng: number }) => {
    setManualFocusTarget((prev) => {
      const id = `me-${prev?.id?.split("-")[1] ?? "0"}`;
      return { id, lat, lng, zoom: 15 };
    });
  }, []));

  const handleLocateCurrentPosition = useCallback(() => {
    requestLocation({ silent: false });
  }, [requestLocation]);

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
    setIsMobileMenuOpen(false);
    setIsMyReportsOpen(false);
    setSelectedPointId(pointId);
    setSheetSnap("mid");
    setManualFocusTarget(null);
  }, []);

  const handleOpenMyReports = useCallback(() => {
    setIsMobileMenuOpen(false);
    setIsMyReportsOpen(true);
    setSelectedPointId(null);
    setSheetSnap("mid");
  }, []);

  const handleRequestRegister = useCallback(() => {
    setIsRegisterDialogOpen(true);
  }, []);

  const activeCategoryLabel =
    selectedCategory === "all" ? "전체" : CATEGORIES[selectedCategory].label;

  const panelListPoints = useMemo(() => {
    if (mapPoints.length <= MAX_PANEL_LIST_ITEMS) {
      return mapPoints;
    }

    const anchor = userLocation ?? (bounds ? boundsCenter(bounds) : null);
    if (!anchor) {
      return mapPoints.slice(0, MAX_PANEL_LIST_ITEMS);
    }

    return [...mapPoints]
      .sort((a, b) => {
        const aDistance = haversineMeters(anchor.lat, anchor.lng, a.lat, a.lng);
        const bDistance = haversineMeters(anchor.lat, anchor.lng, b.lat, b.lng);
        if (aDistance === bDistance) {
          return a.id.localeCompare(b.id);
        }
        return aDistance - bDistance;
      })
      .slice(0, MAX_PANEL_LIST_ITEMS);
  }, [bounds, mapPoints, userLocation]);

  return (
    <main className="h-dvh overflow-hidden bg-[var(--paper)]">
      <div className="grid h-full overflow-hidden bg-[var(--paper-raised)] md:grid-cols-[var(--layout-search-rail)_minmax(0,1fr)]">
        <aside className="hidden h-full md:flex">
          <SidebarPanelContent
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            query={query}
            onQueryChange={setQuery}
            activeCategoryLabel={activeCategoryLabel}
            isLoading={isLoading}
            totalCount={mapPoints.length}
            onOpenMyReports={handleOpenMyReports}
            onLocate={handleLocateCurrentPosition}
            isLocating={isLocating}
            listPoints={panelListPoints}
            listTotalCount={mapPoints.length}
            selectedPointId={selectedPointId}
            onPointSelect={handlePointSelect}
          />
        </aside>

        {!isMobileMenuOpen ? (
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="elevation-float fixed left-3 top-3 z-[1250] inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--trust-strong)] bg-[var(--trust)] text-white md:hidden"
            aria-label="메뉴 열기"
          >
            <Menu size={19} />
          </button>
        ) : null}

        {isMobileMenuOpen ? (
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-[1240] bg-[var(--overlay-mobile)] md:hidden"
            aria-label="메뉴 닫기"
          />
        ) : null}

        {isMobileMenuOpen ? (
          <aside
            className="elevation-rail fixed inset-y-0 left-0 z-[1251] flex w-[88%] max-w-[var(--layout-mobile-menu)] flex-col bg-[var(--paper-raised)] md:hidden"
            aria-label="모바일 메뉴"
          >
            <div className="flex shrink-0 items-center justify-between bg-[var(--ink)] px-4 py-3">
              <p className="font-ledger text-base font-bold tracking-tight text-white">RecycleMap</p>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center border border-white/30 text-white"
                aria-label="메뉴 닫기"
              >
                <X size={15} />
              </button>
            </div>
            <SidebarPanelContent
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              query={query}
              onQueryChange={setQuery}
              activeCategoryLabel={activeCategoryLabel}
              isLoading={isLoading}
              totalCount={mapPoints.length}
              onOpenMyReports={handleOpenMyReports}
              onLocate={handleLocateCurrentPosition}
              isLocating={isLocating}
              listPoints={panelListPoints}
              listTotalCount={mapPoints.length}
              selectedPointId={selectedPointId}
              onPointSelect={handlePointSelect}
            />
          </aside>
        ) : null}

        <section className={`relative flex h-full min-h-0 flex-col bg-[var(--paper)] ${selectedPointId ? "md:pr-[var(--layout-detail-rail)]" : ""}`}>

          <div className="hidden border-b border-stone-300 bg-[var(--paper-raised)] px-4 py-3 md:block">
            <div className="flex min-h-9 flex-wrap items-center gap-2 text-xs text-stone-600">
              {pointsError ? (
                <>
                  <span className="text-[var(--danger)]">
                    {pointsError instanceof Error
                      ? pointsError.message
                      : "지도 정보를 불러오지 못했습니다."}
                  </span>
                  <button
                    type="button"
                    onClick={() => refetchPoints()}
                    className="border border-[var(--danger)] px-2.5 py-1.5 font-semibold text-[var(--danger)]"
                  >
                    다시 불러오기
                  </button>
                </>
              ) : registrationPosition ? (
                <>
                  <span className="border border-stone-300 bg-transparent px-2 py-1 text-[11px] tabular-nums text-[var(--trust)]">
                    선택 위치 {registrationPosition.lat.toFixed(4)}, {registrationPosition.lng.toFixed(4)}
                  </span>
                  {isLoggedIn ? (
                    <button
                      type="button"
                      onClick={() => setIsRegisterDialogOpen(true)}
                      className="inline-flex items-center gap-1 border border-[var(--trust)] bg-[var(--trust)] px-2.5 py-1.5 text-xs font-semibold text-white"
                    >
                      <MapPinPlus size={13} /> 이 위치 등록
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsRegisterDialogOpen(true)}
                      className="inline-flex items-center gap-1 border border-[var(--pending)] bg-[var(--pending-soft)] px-2.5 py-1.5 text-xs font-semibold text-[var(--pending-ink)]"
                    >
                      <MapPinPlus size={13} /> 로그인 후 등록
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setRegistrationPosition(null)}
                    className="border border-stone-300 bg-transparent px-2 py-1.5 text-xs text-stone-700"
                  >
                    취소
                  </button>
                </>
              ) : (
                <span className="text-[11px] text-stone-600">
                  지도에서 위치를 선택하면 새 수거함을 제보할 수 있습니다.
                </span>
              )}
            </div>

            {locationError ? (
              <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                {locationError}
              </p>
            ) : null}
          </div>

          <div className="relative min-h-0 flex-1">
            <div className="h-full overflow-hidden bg-white">
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

            {registrationPosition && !isMobileMenuOpen ? (
              <div className="elevation-float fixed right-3 top-3 z-[1252] flex items-center gap-1 rounded-[var(--radius-control)] border border-stone-300 bg-[var(--paper-raised)] py-1.5 pl-2.5 pr-1.5 md:hidden">
                <button
                  type="button"
                  onClick={() => {
                    if (!isLoggedIn) {
                      setIsMobileMenuOpen(true);
                      return;
                    }
                    setIsRegisterDialogOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--trust)] bg-[var(--trust)] px-2.5 py-1.5 text-[11px] font-semibold text-white"
                >
                  <MapPinPlus size={12} /> 위치 등록
                </button>
                <button
                  type="button"
                  onClick={() => setRegistrationPosition(null)}
                  aria-label="위치 선택 취소"
                  className="grid h-7 w-7 place-items-center text-stone-500 hover:bg-stone-100"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null}

            {pointsError && !isMobileMenuOpen ? (
              <div className="elevation-float fixed left-16 right-3 top-3 z-[1252] flex items-center justify-between gap-2 rounded-[var(--radius-control)] border border-[var(--danger)] bg-[var(--paper-raised)] px-3 py-2 text-xs text-[var(--danger)] md:hidden">
                <span>지도 정보를 불러오지 못했습니다.</span>
                <button
                  type="button"
                  onClick={() => refetchPoints()}
                  className="shrink-0 font-bold underline underline-offset-2"
                >
                  다시 시도
                </button>
              </div>
            ) : null}
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

      <MobileBottomTabs isAdmin={isAdmin} />

    </main>
  );
}
