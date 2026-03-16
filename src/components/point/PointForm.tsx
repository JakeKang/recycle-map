"use client";

import AddressSearch from "@/components/point/AddressSearch";
import { buildClientHeaders } from "@/lib/client-dev-user";
import { useCreatePoint } from "@/hooks/usePoints";
import { CATEGORIES, PointCategory } from "@/types/point";
import { ImagePlus, X } from "lucide-react";
import { useMemo, useState } from "react";

interface PointFormProps {
  position: { lat: number; lng: number } | null;
  onSuccess: () => void;
}

const CATEGORY_OPTIONS = Object.entries(CATEGORIES) as Array<
  [PointCategory, (typeof CATEGORIES)[PointCategory]]
>;

export default function PointForm({ position, onSuccess }: PointFormProps) {
  const { mutateAsync, isPending } = useCreatePoint();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PointCategory>("battery");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState<
    Array<{ id: string; readUrl: string; name: string }>
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPosition = useMemo(() => Boolean(position), [position]);
  const normalizedTitle = useMemo(() => title.trim(), [title]);
  const canSubmit = hasPosition && !isPending && !isUploading && normalizedTitle.length >= 2;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const remaining = Math.max(0, 5 - uploadedPhotos.length);
    if (remaining === 0) {
      setError("이미지는 최대 5장까지 첨부할 수 있습니다.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const selected = files.slice(0, remaining);
      const uploaded = await Promise.all(
        selected.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/upload", {
            method: "POST",
            headers: buildClientHeaders(),
            body: formData,
          });

          if (!response.ok) {
            let payload: unknown = null;
            try {
              payload = await response.json();
            } catch {
              payload = null;
            }

            if (
              payload &&
              typeof payload === "object" &&
              "message" in payload &&
              typeof payload.message === "string"
            ) {
              throw new Error(payload.message);
            }

            throw new Error("이미지 업로드에 실패했습니다.");
          }

          const payload = (await response.json()) as {
            id: string;
            readUrl: string;
            name: string;
          };

          return {
            id: payload.id,
            readUrl: payload.readUrl,
            name: payload.name,
          };
        }),
      );

      setUploadedPhotos((prev) => [...prev, ...uploaded]);
      event.target.value = "";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!position) {
      setError("지도에서 등록 위치를 먼저 클릭하세요.");
      return;
    }

    setError(null);
    try {
      if (normalizedTitle.length < 2) {
        setError("제목은 공백 제외 2자 이상으로 입력해 주세요.");
        return;
      }

      const normalizedAddress = address.trim();
      const normalizedDescription = description.trim();

      await mutateAsync({
        title: normalizedTitle,
        category,
        description: normalizedDescription || undefined,
        address: normalizedAddress || undefined,
        photoIds: uploadedPhotos.map((photo) => photo.id),
        lat: position.lat,
        lng: position.lng,
      });

      setTitle("");
      setAddress("");
      setDescription("");
      setUploadedPhotos([]);
      onSuccess();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "등록에 실패했습니다.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-3xl border border-emerald-900/10 bg-[rgba(254,255,251,0.94)] p-3 shadow-[0_12px_30px_rgba(8,42,22,0.08)]"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-900/60">
          Report
        </p>
        <h2 className="mt-1 text-sm font-semibold text-stone-900">수거함 제보 등록</h2>
      </div>

      <p className="rounded-lg border border-emerald-900/15 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-900/80">
        좌표: {position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : "지도에서 위치를 선택하세요"}
      </p>

      <input
        className="w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm text-stone-800 outline-none ring-emerald-600/40 placeholder:text-stone-400 focus:ring"
        placeholder="제목 (예: OO아파트 폐건전지함)"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
      />
      {normalizedTitle.length > 0 && normalizedTitle.length < 2 ? (
        <p className="text-[11px] text-amber-700">제목은 최소 2자 이상이어야 합니다.</p>
      ) : null}

      <select
        className="w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm text-stone-800 outline-none ring-emerald-600/40 focus:ring"
        value={category}
        onChange={(event) => setCategory(event.target.value as PointCategory)}
      >
        {CATEGORY_OPTIONS.map(([value, item]) => (
          <option key={value} value={value}>
            {item.label}
          </option>
        ))}
      </select>

      <input
        className="w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm text-stone-800 outline-none ring-emerald-600/40 placeholder:text-stone-400 focus:ring"
        placeholder="주소 (선택)"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
      />
      <AddressSearch onSelect={setAddress} />

      <textarea
        className="h-24 w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm text-stone-800 outline-none ring-emerald-600/40 placeholder:text-stone-400 focus:ring"
        placeholder="상세 설명 (선택, 운영 시간/위치 팁 등)"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />

      <div className="space-y-2 rounded-xl border border-emerald-900/15 bg-white/80 p-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-stone-700">현장 사진 (선택, 최대 5장)</p>
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-900/20 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100">
            <ImagePlus size={13} /> 사진 추가
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading || uploadedPhotos.length >= 5}
            />
          </label>
        </div>

        {uploadedPhotos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {uploadedPhotos.map((photo) => (
              <div key={photo.id} className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.readUrl} alt={photo.name} className="h-20 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setUploadedPhotos((prev) => prev.filter((item) => item.id !== photo.id));
                  }}
                  className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(15,23,42,0.75)] text-white"
                  aria-label="첨부 이미지 제거"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-stone-500">첨부된 사진이 없습니다.</p>
        )}

        {isUploading ? <p className="text-[11px] text-emerald-700">이미지 업로드 중...</p> : null}
      </div>

      {error ? <p className="text-xs text-rose-700">{error}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl border border-emerald-900 bg-emerald-900 px-3 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:border-stone-300 disabled:bg-stone-300"
      >
        {isPending ? "등록 중..." : "제보 등록하기"}
      </button>
    </form>
  );
}
