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
        className="rounded-xl border border-yellow-700/30 bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-900 transition hover:bg-yellow-100"
      >
        카카오맵 길안내
      </a>
      <a
        href={naverUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded-xl border border-emerald-700/30 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
      >
        네이버맵 길안내
      </a>
    </div>
  );
}
