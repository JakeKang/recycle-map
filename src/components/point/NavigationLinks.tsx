"use client";

import { getKakaoMapUrl, getNaverMapUrl } from "@/lib/navigation";

export default function NavigationLinks({
  lat,
  lng,
  name,
}: {
  lat: number;
  lng: number;
  name: string;
}) {
  const kakaoUrl = getKakaoMapUrl({ lat, lng, name });
  const naverUrl = getNaverMapUrl({ lat, lng, name }, "recyclemap");

  return (
    <div className="flex gap-2">
      <a
        href={kakaoUrl}
        target="_blank"
        rel="noreferrer"
        className="border border-stone-300 bg-transparent px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-500"
      >
        카카오맵 길안내
      </a>
      <a
        href={naverUrl}
        target="_blank"
        rel="noreferrer"
        className="border border-[var(--trust)] bg-transparent px-3 py-2 text-sm font-semibold text-[var(--trust)] transition hover:bg-[var(--trust-soft)]"
      >
        네이버맵 길안내
      </a>
    </div>
  );
}
