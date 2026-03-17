"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface GeolocationState {
  location: { lat: number; lng: number } | null;
  isLocating: boolean;
  error: string | null;
}

interface RequestOptions {
  silent?: boolean;
  recenter?: boolean;
}

interface UseGeolocationResult extends GeolocationState {
  requestLocation: (options?: RequestOptions) => void;
  onLocated: (handler: (loc: { lat: number; lng: number }) => void) => void;
}

export function useGeolocation(autoLocate = false): UseGeolocationResult {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onLocatedRef = useRef<((loc: { lat: number; lng: number }) => void) | null>(null);
  const didAutoLocateRef = useRef(false);

  const requestLocation = useCallback((options?: RequestOptions) => {
    const silent = options?.silent ?? false;

    if (!navigator.geolocation) {
      if (!silent) {
        setError("이 브라우저에서는 위치 기능을 지원하지 않습니다.");
      }
      return;
    }

    setIsLocating(true);
    if (!silent) {
      setError(null);
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setLocation({ lat, lng });
        setIsLocating(false);
        setError(null);
        onLocatedRef.current?.({ lat, lng });
      },
      () => {
        setIsLocating(false);
        if (!silent) {
          setError("현재 위치를 가져오지 못했습니다. 위치 권한을 확인해 주세요.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    );
  }, []);

  const onLocated = useCallback(
    (handler: (loc: { lat: number; lng: number }) => void) => {
      onLocatedRef.current = handler;
    },
    [],
  );

  useEffect(() => {
    if (!autoLocate || didAutoLocateRef.current) {
      return;
    }
    didAutoLocateRef.current = true;

    const timer = window.setTimeout(() => {
      requestLocation({ silent: true });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [autoLocate, requestLocation]);

  return { location, isLocating, error, requestLocation, onLocated };
}
