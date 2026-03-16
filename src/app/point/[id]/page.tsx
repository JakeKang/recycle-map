"use client";

import NavigationLinks from "@/components/point/NavigationLinks";
import { extractErrorMessage } from "@/lib/api-error";
import { buildClientJsonHeaders } from "@/lib/client-dev-user";
import { PointDetail } from "@/types/point";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function PointDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reportReason, setReportReason] = useState("");

  const { data, isLoading, error } = useQuery<PointDetail>({
    queryKey: ["point", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/points/${params.id}`);
      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        throw new Error(extractErrorMessage(payload, "상세 데이터를 불러올 수 없습니다."));
      }
      return response.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/points/${params.id}/reviews`, {
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
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["point", params.id] });
      queryClient.invalidateQueries({ queryKey: ["points"] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/points/${params.id}/reports`, {
        method: "POST",
        headers: buildClientJsonHeaders(),
        body: JSON.stringify({
          type: "incorrect_location",
          reason: reportReason || undefined,
        }),
      });

      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        throw new Error(extractErrorMessage(payload, "신고에 실패했습니다."));
      }
    },
    onSuccess: () => {
      setReportReason("");
      queryClient.invalidateQueries({ queryKey: ["point", params.id] });
      queryClient.invalidateQueries({ queryKey: ["points"] });
    },
  });

  function submitReview(event: { preventDefault: () => void }) {
    event.preventDefault();
    reviewMutation.mutate();
  }

  function submitReport(event: { preventDefault: () => void }) {
    event.preventDefault();
    reportMutation.mutate();
  }

  if (isLoading) {
    return <main className="p-6 text-stone-700">상세 정보를 불러오는 중...</main>;
  }

  if (error || !data) {
    return <main className="p-6 text-stone-700">포인트를 찾을 수 없습니다.</main>;
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-4 bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,0.12),transparent_45%),linear-gradient(180deg,#f7fcf6_0%,#f1f7f3_100%)] p-4 md:p-6">
      <Link href="/" className="text-sm font-medium text-emerald-900/80">
        ← 지도 화면으로 돌아가기
      </Link>

      <section className="rounded-3xl border border-emerald-900/12 bg-white/85 p-5 shadow-[0_14px_30px_rgba(10,45,28,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900/60">Point Detail</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900">{data.title}</h1>
        <p className="mt-1 text-sm text-stone-600">{data.address ?? "주소 미입력"}</p>
        <p className="mt-3 rounded-xl border border-emerald-900/10 bg-emerald-50/60 p-3 text-sm text-stone-700">
          {data.description ?? "설명 없음"}
        </p>
        {data.photoIds && data.photoIds.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
            {data.photoIds.map((photoId) => (
              <a
                key={photoId}
                href={`/api/upload/${photoId}/download`}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-xl border border-emerald-900/10 bg-stone-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/upload/${photoId}`}
                  alt="포인트 첨부 이미지"
                  className="h-28 w-full object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        ) : null}
        <p className="mt-3 text-xs text-stone-500">
          평점 {data.avgRating} ({data.reviewCount}) | 신고 {data.reportCount}
        </p>
        <div className="mt-4">
          <NavigationLinks lat={data.lat} lng={data.lng} name={data.title} />
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-900/12 bg-white/85 p-5 shadow-[0_14px_30px_rgba(10,45,28,0.08)]">
        <h2 className="text-base font-semibold text-stone-900">리뷰 작성</h2>
        <form className="mt-3 space-y-2" onSubmit={submitReview}>
          <select
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className="rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
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
            placeholder="리뷰 코멘트 (선택)"
            className="h-20 w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl border border-emerald-900 bg-emerald-900 px-3 py-2 text-sm font-semibold text-emerald-50"
          >
            리뷰 등록
          </button>
          {reviewMutation.error ? (
            <p className="text-xs text-rose-600">
              {reviewMutation.error instanceof Error
                ? reviewMutation.error.message
                : "리뷰 등록 실패"}
            </p>
          ) : null}
        </form>

        <div className="mt-4 space-y-2">
          {data.reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-emerald-900/10 bg-white p-3">
              <p className="text-sm font-semibold">{review.rating}점</p>
              <p className="text-sm text-stone-700">{review.comment ?? "코멘트 없음"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-rose-900/12 bg-white/85 p-5 shadow-[0_14px_30px_rgba(70,20,20,0.06)]">
        <h2 className="text-base font-semibold text-stone-900">정보 신고</h2>
        <form className="mt-3 space-y-2" onSubmit={submitReport}>
          <textarea
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            placeholder="신고 사유 (선택)"
            className="h-20 w-full rounded-xl border border-rose-900/20 bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl border border-rose-400 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
          >
            잘못된 위치 신고
          </button>
        </form>
      </section>
    </main>
  );
}
