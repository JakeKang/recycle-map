import type { CollectionPoint } from "@/types/point";
import type { Review } from "@/types/review";

/**
 * 공개 API 응답에서 PII(userId 등 내부 식별자)를 제거한 형태.
 * userId는 소셜 로그인 sub claim이므로 외부에 노출하면 안 됨.
 */

export type PublicPoint = Omit<CollectionPoint, "userId">;
export type PublicReview = Omit<Review, "userId">;

export function toPublicPoint({ userId: _userId, ...rest }: CollectionPoint): PublicPoint {
  return rest;
}

export function toPublicReview({ userId: _userId, ...rest }: Review): PublicReview {
  return rest;
}

export function toPublicPoints(points: CollectionPoint[]): PublicPoint[] {
  return points.map(toPublicPoint);
}

export function toPublicReviews(reviews: Review[]): PublicReview[] {
  return reviews.map(toPublicReview);
}
