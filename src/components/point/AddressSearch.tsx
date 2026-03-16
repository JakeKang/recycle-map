"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface AddressSearchProps {
  onSelect: (address: string) => void;
}

const DAUM_POSTCODE_SCRIPT_URL =
  "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

let scriptLoader: Promise<void> | null = null;

function ensureDaumPostcodeScript() {
  if (window.daum?.Postcode) {
    return Promise.resolve();
  }

  if (scriptLoader) {
    return scriptLoader;
  }

  scriptLoader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${DAUM_POSTCODE_SCRIPT_URL}"]`,
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("postcode-script-load-failed")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = DAUM_POSTCODE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("postcode-script-load-failed"));
    document.head.appendChild(script);
  }).finally(() => {
    if (!window.daum?.Postcode) {
      scriptLoader = null;
    }
  });

  return scriptLoader;
}

export default function AddressSearch({ onSelect }: AddressSearchProps) {
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const embedContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(media.matches);
    update();

    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const focusNextField = useCallback(() => {
    const form = triggerButtonRef.current?.closest("form");
    const nextTextarea = form?.querySelector<HTMLTextAreaElement>("textarea");
    nextTextarea?.focus();
  }, []);

  const handleOpen = useCallback(async () => {
    if (!window.daum?.Postcode) {
      try {
        await ensureDaumPostcodeScript();
      } catch {
        setError("주소 검색 서비스를 불러오지 못했습니다. 주소를 직접 입력해 주세요.");
        return;
      }
    }

    const Postcode = window.daum?.Postcode;
    if (!Postcode) {
      setError("주소 검색 서비스를 사용할 수 없습니다. 주소를 직접 입력해 주세요.");
      return;
    }

    setError(null);
    const postcode = new Postcode({
      oncomplete(data) {
        const fullAddress = data.roadAddress || data.jibunAddress || data.address;
        onSelect(fullAddress);
        setIsEmbedOpen(false);
        focusNextField();
      },
      onresize(size) {
        if (embedContainerRef.current) {
          embedContainerRef.current.style.height = `${Math.max(size.height, 380)}px`;
        }
      },
      theme: {
        searchBgColor: "#064e3b",
        queryTextColor: "#ffffff",
      },
      width: "100%",
      height: "100%",
    });

    if (isMobile) {
      if (!embedContainerRef.current) {
        setError("모바일 주소 검색 영역을 준비하지 못했습니다. 다시 시도해 주세요.");
        return;
      }

      setIsEmbedOpen(true);
      postcode.embed(embedContainerRef.current, { autoClose: true });
      return;
    }

    postcode.open({ popupTitle: "RecycleMap 주소 검색", autoClose: true });
  }, [focusNextField, isMobile, onSelect]);

  return (
    <div className="space-y-1">
      <button
        ref={triggerButtonRef}
        type="button"
        onClick={handleOpen}
        className="rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-xs text-stone-700 transition hover:bg-emerald-50"
      >
        주소 검색 (Daum 우편번호)
      </button>

      {isMobile ? (
        <div className={`${isEmbedOpen ? "block" : "hidden"} space-y-2 rounded-xl border border-emerald-900/15 bg-white p-2`}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-stone-500">모바일 주소 검색</p>
            <button
              type="button"
              onClick={() => setIsEmbedOpen(false)}
              className="rounded-md border border-stone-300 bg-stone-50 px-2 py-1 text-[11px] text-stone-600"
            >
              닫기
            </button>
          </div>
          <div
            ref={embedContainerRef}
            className="min-h-[380px] w-full overflow-hidden rounded-lg border border-stone-200"
          />
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
