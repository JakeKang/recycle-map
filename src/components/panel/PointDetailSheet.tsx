"use client";

import ActionDialog from "@/components/common/ActionDialog";
import NavigationLinks from "@/components/point/NavigationLinks";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSuggestions } from "@/hooks/usePoints";
import { extractErrorMessage } from "@/lib/api-error";
import { buildClientJsonHeaders } from "@/lib/client-dev-user";
import { categoryLabel, getCategoryVisual } from "@/lib/point-visuals";
import { PointCategory, PointDetail } from "@/types/point";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Flag, MessageCircle, PenSquare } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface PointDetailSheetProps {
  pointId: string | null;
  mobileSnap: MobileSnap;
  onMobileSnapChange: (next: MobileSnap) => void;
  onClose: () => void;
}

export type MobileSnap = "peek" | "mid" | "full";

const SNAP_ORDER: MobileSnap[] = ["peek", "mid", "full"];

export default function PointDetailSheet({
  pointId,
  mobileSnap,
  onMobileSnapChange,
  onClose,
}: PointDetailSheetProps) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reportType, setReportType] = useState("incorrect_location");
  const [reportReason, setReportReason] = useState("");
  const [suggestCategory, setSuggestCategory] = useState<PointCategory>("other");
  const [suggestAddress, setSuggestAddress] = useState("");
  const [suggestDescription, setSuggestDescription] = useState("");
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false);
  const dragStartYRef = useRef<number | null>(null);

  const {
    data: suggestions = [],
    isLoading: isSuggestionsLoading,
    error: suggestionsError,
  } = useSuggestions(pointId);

  const { data, isLoading, error } = useQuery<PointDetail>({
    queryKey: ["point", pointId],
    enabled: Boolean(pointId),
    queryFn: async () => {
      const response = await fetch(`/api/points/${pointId}`);
      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        throw new Error(extractErrorMessage(payload, "포인트 상세를 불러오지 못했습니다."));
      }

      return response.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!pointId) {
        throw new Error("포인트 정보가 없습니다.");
      }

      const response = await fetch(`/api/points/${pointId}/reviews`, {
        method: "POST",
        headers: buildClientJsonHeaders(),
        body: JSON.stringify({ rating, comment }),
      });

      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        throw new Error(extractErrorMessage(payload, "리뷰 등록 실패"));
      }
    },
    onSuccess: async () => {
      setComment("");
      setIsReviewDialogOpen(false);
      setSuccessNotice("리뷰가 등록됐어요.");
      await queryClient.invalidateQueries({ queryKey: ["point", pointId] });
      await queryClient.invalidateQueries({ queryKey: ["points"] });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!pointId) {
        throw new Error("포인트 정보가 없습니다.");
      }

      const response = await fetch(`/api/points/${pointId}/confirm`, {
        method: "POST",
        headers: buildClientJsonHeaders(),
      });

      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        throw new Error(extractErrorMessage(payload, "현장 확인 처리에 실패했습니다."));
      }
    },
    onSuccess: async () => {
      setSuccessNotice("현장에서 확인된 위치로 반영했어요.");
      await queryClient.invalidateQueries({ queryKey: ["point", pointId] });
      await queryClient.invalidateQueries({ queryKey: ["points"] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (payload: { type: string; reason?: string }) => {
      if (!pointId) {
        throw new Error("포인트 정보가 없습니다.");
      }

      const response = await fetch(`/api/points/${pointId}/reports`, {
        method: "POST",
        headers: buildClientJsonHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let body: unknown = null;
        try {
          body = await response.json();
        } catch {
          body = null;
        }
        throw new Error(extractErrorMessage(body, "신고 전송 실패"));
      }
    },
    onSuccess: async () => {
      setReportReason("");
      setIsReportDialogOpen(false);
      setSuccessNotice("신고가 접수됐어요. 검토 후 반영됩니다.");
      await queryClient.invalidateQueries({ queryKey: ["point", pointId] });
      await queryClient.invalidateQueries({ queryKey: ["points"] });
    },
  });

  const suggestionMutation = useMutation({
    mutationFn: async (payload: {
      category: PointCategory;
      address?: string;
      description?: string;
    }) => {
      if (!pointId) {
        throw new Error("포인트 정보가 없습니다.");
      }

      const response = await fetch(`/api/points/${pointId}/suggestions`, {
        method: "POST",
        headers: buildClientJsonHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let body: unknown = null;
        try {
          body = await response.json();
        } catch {
          body = null;
        }
        throw new Error(extractErrorMessage(body, "수정 제안 전송 실패"));
      }
    },
    onSuccess: async () => {
      setSuggestAddress("");
      setSuggestDescription("");
      setSuggestCategory("other");
      setIsSuggestionDialogOpen(false);
      setSuccessNotice("수정 제안을 보냈어요.");
      await queryClient.invalidateQueries({ queryKey: ["point", pointId] });
      await queryClient.invalidateQueries({ queryKey: ["points"] });
      await queryClient.invalidateQueries({ queryKey: ["point", pointId, "suggestions"] });
    },
  });



  useEffect(() => {
    if (!isDragging || !isMobile) {
      return;
    }

    const onMove = (event: PointerEvent) => {
      if (dragStartYRef.current === null) {
        return;
      }

      const delta = event.clientY - dragStartYRef.current;
      setDragOffset(Math.max(-240, Math.min(240, delta)));
    };

    const onUp = () => {
      if (dragStartYRef.current === null) {
        return;
      }

      const threshold = 56;
      const currentIndex = SNAP_ORDER.indexOf(mobileSnap);

      if (dragOffset <= -threshold && currentIndex < SNAP_ORDER.length - 1) {
        onMobileSnapChange(SNAP_ORDER[currentIndex + 1]);
      } else if (dragOffset >= threshold && currentIndex > 0) {
        onMobileSnapChange(SNAP_ORDER[currentIndex - 1]);
      } else if (dragOffset >= threshold && currentIndex === 0) {
        onClose();
      }

      dragStartYRef.current = null;
      setDragOffset(0);
      setIsDragging(false);
    };

    const onCancel = () => {
      dragStartYRef.current = null;
      setDragOffset(0);
      setIsDragging(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [dragOffset, isDragging, isMobile, mobileSnap, onClose, onMobileSnapChange]);

  const mobileSnapClass =
    mobileSnap === "peek" ? "h-[44vh]" : mobileSnap === "mid" ? "h-[72vh]" : "h-[92vh]";

  if (!pointId) {
    return null;
  }

  return (
    <>
      <aside
        className={`fixed bottom-0 right-0 z-[1100] w-full overflow-y-auto rounded-t-3xl border border-emerald-900/15 bg-[linear-gradient(180deg,#f9fcf8_0%,#eef7f2_100%)] p-4 shadow-[0_-14px_30px_rgba(15,23,42,0.2)] ${mobileSnapClass} md:top-0 md:h-screen md:max-w-[420px] md:rounded-none md:rounded-l-3xl md:border-l md:border-t-0`}
        aria-label="포인트 상세 시트"
        style={
          isMobile
            ? {
                transform: `translateY(${dragOffset > 0 ? dragOffset : dragOffset * 0.35}px)`,
                transition: isDragging ? "none" : "transform 180ms ease, height 180ms ease",
              }
            : undefined
        }
      >
        <div className="mb-2 flex flex-col gap-2 md:hidden">
          <button
            type="button"
            aria-label="상세 시트 높이 조절"
            style={{ touchAction: "none" }}
            onPointerDown={(event) => {
              dragStartYRef.current = event.clientY;
              setIsDragging(true);
              setDragOffset(0);
            }}
            className="mx-auto h-1.5 w-12 rounded-full bg-stone-300"
          />
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => onMobileSnapChange("peek")}
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                mobileSnap === "peek" ? "bg-emerald-900 text-emerald-50" : "bg-white text-stone-600"
              }`}
            >
              요약
            </button>
            <button
              type="button"
              onClick={() => onMobileSnapChange("mid")}
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                mobileSnap === "mid" ? "bg-emerald-900 text-emerald-50" : "bg-white text-stone-600"
              }`}
            >
              중간
            </button>
            <button
              type="button"
              onClick={() => onMobileSnapChange("full")}
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                mobileSnap === "full" ? "bg-emerald-900 text-emerald-50" : "bg-white text-stone-600"
              }`}
            >
              전체
            </button>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-stone-900">포인트 상세</h2>
            <p className="hidden text-[11px] text-stone-500 md:block">
              스냅 단축키: <kbd className="rounded border border-stone-300 bg-white px-1">[</kbd> /
              <kbd className="rounded border border-stone-300 bg-white px-1">]</kbd>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700"
          >
            닫기
          </button>
        </div>

        {isLoading ? <p className="text-sm text-stone-600">상세 정보를 불러오는 중...</p> : null}

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
            {error instanceof Error ? error.message : "상세 정보를 불러오지 못했습니다."}
          </p>
        ) : null}

        {successNotice ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">
            {successNotice}
          </p>
        ) : null}

        {data ? (
          <div className="space-y-3 pb-6">
            <section className="rounded-2xl border border-emerald-900/10 bg-white/90 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-stone-900">{data.title}</h3>
                  <p className="text-xs text-stone-500">{data.address ?? "주소 미입력"}</p>
                </div>
                <span
                  className="rounded-full border px-2 py-1 text-[11px] font-semibold"
                  style={(() => {
                    const visual = getCategoryVisual(data.category);
                    return {
                      backgroundColor: visual.softBg,
                      color: visual.textColor,
                      borderColor: `${visual.ringColor}66`,
                    };
                  })()}
                >
                  {categoryLabel(data.category)}
                </span>
              </div>

              <p className="mt-2 text-sm text-stone-700">{data.description ?? "설명 없음"}</p>

              {data.photoIds && data.photoIds.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {data.photoIds.map((photoId) => (
                    <a
                      key={photoId}
                      href={`/api/upload/${photoId}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-lg border border-emerald-900/10 bg-stone-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/upload/${photoId}`}
                        alt="포인트 첨부 이미지"
                        className="h-20 w-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              ) : null}

              <p className="mt-2 text-xs text-stone-500">
                평점 {data.avgRating} ({data.reviewCount}) · 신고 {data.reportCount}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                최근 확인: {data.verifiedAt ? new Date(data.verifiedAt).toLocaleString("ko-KR") : "기록 없음"}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <NavigationLinks lat={data.lat} lng={data.lng} name={data.title} />
                <button
                  type="button"
                  onClick={() => {
                    setSuccessNotice(null);
                    confirmMutation.mutate();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-900/20 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-900"
                  disabled={confirmMutation.isPending}
                >
                  <CheckCircle2 size={14} />
                  {confirmMutation.isPending ? "확인 중..." : "여기에 있어요"}
                </button>
                <Link
                  href={`/point/${data.id}`}
                  className="inline-flex items-center rounded-lg border border-emerald-900/20 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-900"
                >
                  전체 상세 보기
                </Link>
              </div>
              {confirmMutation.error ? (
                <p className="mt-1 text-xs text-rose-700">
                  {confirmMutation.error instanceof Error
                    ? confirmMutation.error.message
                    : "현장 확인 처리에 실패했습니다."}
                </p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-emerald-900/10 bg-white/90 p-3">
              <p className="text-xs font-semibold text-stone-900">빠른 액션</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessNotice(null);
                    setIsReviewDialogOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-900/20 bg-emerald-50 px-2 py-2 text-xs font-semibold text-emerald-900"
                >
                  <MessageCircle size={14} /> 리뷰 작성
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessNotice(null);
                    setIsReportDialogOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-900/20 bg-rose-50 px-2 py-2 text-xs font-semibold text-rose-700"
                >
                  <Flag size={14} /> 문제 신고
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessNotice(null);
                    setIsSuggestionDialogOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-blue-900/20 bg-blue-50 px-2 py-2 text-xs font-semibold text-blue-700"
                >
                  <PenSquare size={14} /> 정보 수정
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-blue-900/10 bg-white/90 p-3">
              <p className="text-[11px] font-semibold text-blue-900">최근 수정 제안</p>
              {isSuggestionsLoading ? (
                <p className="text-xs text-stone-600">수정 제안 목록을 불러오는 중...</p>
              ) : null}
              {suggestionsError ? (
                <p className="text-xs text-rose-700">
                  {suggestionsError instanceof Error
                    ? suggestionsError.message
                    : "수정 제안 목록을 불러오지 못했습니다."}
                </p>
              ) : null}
              {!isSuggestionsLoading && !suggestionsError && suggestions.length === 0 ? (
                <p className="text-xs text-stone-600">아직 등록된 수정 제안이 없습니다.</p>
              ) : null}
              {!isSuggestionsLoading && !suggestionsError && suggestions.length > 0 ? (
                <ul className="mt-1 space-y-1 text-xs text-stone-700">
                  {suggestions.slice(0, 3).map((item) => (
                    <li key={item.id} className="rounded-lg border border-blue-900/10 bg-white px-2 py-1">
                      <p>
                        카테고리 {categoryLabel(item.payload.category)} · 상태 {item.status}
                      </p>
                      {item.payload.address ? <p>주소: {item.payload.address}</p> : null}
                      {item.payload.description ? <p>설명: {item.payload.description}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </div>
        ) : null}
      </aside>

      <ActionDialog
        title="리뷰 작성"
        open={isReviewDialogOpen}
        onClose={() => {
          if (!reviewMutation.isPending) {
            setIsReviewDialogOpen(false);
          }
        }}
      >
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSuccessNotice(null);
            reviewMutation.mutate();
          }}
        >
          <select
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className="w-full rounded-xl border border-emerald-900/20 bg-white px-2.5 py-2 text-sm"
            disabled={reviewMutation.isPending}
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value}점
              </option>
            ))}
          </select>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="리뷰 코멘트"
            className="h-20 w-full rounded-xl border border-emerald-900/20 bg-white px-2.5 py-2 text-sm"
            disabled={reviewMutation.isPending}
          />
          <button
            type="submit"
            disabled={reviewMutation.isPending}
            className="w-full rounded-xl border border-emerald-900 bg-emerald-900 px-3 py-2 text-sm font-semibold text-emerald-50"
          >
            {reviewMutation.isPending ? "등록 중..." : "리뷰 등록"}
          </button>
          {reviewMutation.error ? (
            <p className="text-xs text-rose-700">
              {reviewMutation.error instanceof Error ? reviewMutation.error.message : "리뷰 등록 실패"}
            </p>
          ) : null}
        </form>
      </ActionDialog>

      <ActionDialog
        title="문제 신고"
        open={isReportDialogOpen}
        onClose={() => {
          if (!reportMutation.isPending) {
            setIsReportDialogOpen(false);
          }
        }}
      >
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSuccessNotice(null);
            reportMutation.mutate({
              type: reportType,
              reason: reportReason || undefined,
            });
          }}
        >
          <select
            value={reportType}
            onChange={(event) => setReportType(event.target.value)}
            className="w-full rounded-xl border border-rose-900/20 bg-white px-2.5 py-2 text-sm"
            disabled={reportMutation.isPending}
          >
            <option value="incorrect_location">위치 오류</option>
            <option value="no_longer_exists">현재 없음</option>
            <option value="wrong_category">카테고리 오류</option>
            <option value="spam">스팸</option>
            <option value="inappropriate">부적절 내용</option>
            <option value="other">기타</option>
          </select>
          <textarea
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            placeholder="신고 사유 (선택)"
            className="h-20 w-full rounded-xl border border-rose-900/20 bg-white px-2.5 py-2 text-sm"
            disabled={reportMutation.isPending}
          />
          <button
            type="submit"
            disabled={reportMutation.isPending}
            className="w-full rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
          >
            {reportMutation.isPending ? "신고 중..." : "신고하기"}
          </button>
          {reportMutation.error ? (
            <p className="text-xs text-rose-700">
              {reportMutation.error instanceof Error ? reportMutation.error.message : "신고 전송 실패"}
            </p>
          ) : null}
        </form>
      </ActionDialog>

      <ActionDialog
        title="정보 수정 제안"
        open={isSuggestionDialogOpen}
        onClose={() => {
          if (!suggestionMutation.isPending) {
            setIsSuggestionDialogOpen(false);
          }
        }}
      >
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSuccessNotice(null);
            suggestionMutation.mutate({
              category: suggestCategory,
              address: suggestAddress || undefined,
              description: suggestDescription || undefined,
            });
          }}
        >
          <select
            value={suggestCategory}
            onChange={(event) => setSuggestCategory(event.target.value as PointCategory)}
            className="w-full rounded-xl border border-blue-900/20 bg-white px-2.5 py-2 text-sm"
            disabled={suggestionMutation.isPending}
          >
            <option value="battery">폐건전지</option>
            <option value="electronics">폐소형가전</option>
            <option value="medicine">폐의약품</option>
            <option value="fluorescent">폐형광등</option>
            <option value="toner">폐토너</option>
            <option value="other">기타</option>
          </select>
          <input
            value={suggestAddress}
            onChange={(event) => setSuggestAddress(event.target.value)}
            placeholder="제안 주소 (선택)"
            className="w-full rounded-xl border border-blue-900/20 bg-white px-2.5 py-2 text-sm"
            disabled={suggestionMutation.isPending}
          />
          <textarea
            value={suggestDescription}
            onChange={(event) => setSuggestDescription(event.target.value)}
            placeholder="제안 설명"
            className="h-20 w-full rounded-xl border border-blue-900/20 bg-white px-2.5 py-2 text-sm"
            disabled={suggestionMutation.isPending}
          />
          <button
            type="submit"
            disabled={suggestionMutation.isPending}
            className="w-full rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
          >
            {suggestionMutation.isPending ? "전송 중..." : "수정 제안 보내기"}
          </button>
          {suggestionMutation.error ? (
            <p className="text-xs text-rose-700">
              {suggestionMutation.error instanceof Error
                ? suggestionMutation.error.message
                : "수정 제안 전송 실패"}
            </p>
          ) : null}
        </form>
      </ActionDialog>
    </>
  );
}
