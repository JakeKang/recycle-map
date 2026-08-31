"use client";

import NavigationLinks from "@/components/point/NavigationLinks";
import VerificationPanel from "@/components/point/VerificationPanel";
import { extractErrorMessage } from "@/lib/api-error";
import { buildClientHeaders, buildClientJsonHeaders } from "@/lib/client-dev-user";
import { PublicPointDetail, VerificationVoteValue } from "@/types/point";
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

  const { data, isLoading, error, refetch } = useQuery<PublicPointDetail>({
    queryKey: ["point", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/points/${params.id}`, {
        headers: buildClientHeaders(),
      });
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

  const voteMutation = useMutation({
    mutationFn: async (value: VerificationVoteValue) => {
      const response = await fetch(`/api/points/${params.id}/votes`, {
        method: "POST",
        headers: buildClientJsonHeaders(),
        body: JSON.stringify({ value }),
      });

      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        throw new Error(extractErrorMessage(payload, "검증 투표를 반영하지 못했습니다."));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["point", params.id] });
      await queryClient.invalidateQueries({ queryKey: ["points"] });
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
    return (
      <main className="mx-auto min-h-screen max-w-3xl bg-[var(--paper)] p-6 text-stone-700">
        <h1 className="font-ledger text-xl font-bold text-[var(--ink)]">위치 정보를 불러오지 못했습니다.</h1>
        <p className="mt-2 text-sm">네트워크 연결을 확인한 뒤 다시 시도해 주세요.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 border border-[var(--danger)] px-3 py-2 text-sm font-semibold text-[var(--danger)]"
        >
          다시 불러오기
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl bg-[var(--paper)] px-4 py-6 md:px-8 md:py-10">
      <Link href="/" className="text-sm font-semibold text-[var(--trust)] underline decoration-[var(--trust)]/30 underline-offset-4">
        ← 지도 화면으로 돌아가기
      </Link>

      <section className="mt-8 border-y border-stone-300 py-6">
        <h1 className="font-ledger text-3xl font-bold tracking-[-0.03em] text-[var(--ink)]">{data.title}</h1>
        <p className="mt-1 text-sm text-stone-600">{data.address ?? "주소 미입력"}</p>
        <p className="mt-5 max-w-[var(--measure-reading)] text-sm leading-7 text-stone-700">
          {data.description ?? "설명 없음"}
        </p>
        {data.photoIds && data.photoIds.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
            {data.photoIds.map((photoId: string) => (
              <a
                key={photoId}
                href={`/api/upload/${photoId}/download`}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden border border-stone-300 bg-stone-50"
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

      <VerificationPanel
        point={data}
        isVoting={voteMutation.isPending}
        voteError={voteMutation.error instanceof Error ? voteMutation.error.message : null}
        onVote={(value) => voteMutation.mutate(value)}
      />

      <section className="border-b border-stone-300 py-6">
        <h2 className="font-ledger text-xl font-bold text-[var(--ink)]">리뷰</h2>
        <form className="mt-3 space-y-2" onSubmit={submitReview}>
          <select
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className="border border-stone-300 bg-[var(--paper-raised)] px-3 py-2 text-sm"
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
            className="h-20 w-full border border-stone-300 bg-[var(--paper-raised)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="border border-[var(--trust)] bg-[var(--trust)] px-3 py-2 text-sm font-semibold text-white"
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
          {data.reviews.map((review: { id: string; rating: number; comment: string | null }) => (
            <div key={review.id} className="border-t border-stone-300 py-3">
              <p className="text-sm font-semibold">{review.rating}점</p>
              <p className="text-sm text-stone-700">{review.comment ?? "코멘트 없음"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-6">
        <h2 className="font-ledger text-xl font-bold text-[var(--ink)]">정보 신고</h2>
        <form className="mt-3 space-y-2" onSubmit={submitReport}>
          <textarea
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            placeholder="신고 사유 (선택)"
            className="h-20 w-full border border-stone-300 bg-[var(--paper-raised)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="border border-[var(--danger)] bg-transparent px-3 py-2 text-sm font-semibold text-[var(--danger)]"
          >
            잘못된 위치 신고
          </button>
        </form>
      </section>
    </main>
  );
}
