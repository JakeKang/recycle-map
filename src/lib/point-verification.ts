import type {
  PointVerificationStatus,
  VerificationVoteValue,
} from "@/types/point";

export const ACCURATE_VOTE_THRESHOLD = 5;
export const ACCURATE_RATIO_THRESHOLD = 0.7;
export const INACCURATE_VOTE_THRESHOLD = 3;

export function deriveVerificationStatus(
  accurateVoteCount: number,
  inaccurateVoteCount: number,
): PointVerificationStatus {
  if (inaccurateVoteCount >= INACCURATE_VOTE_THRESHOLD) {
    return "inaccurate";
  }

  const totalVotes = accurateVoteCount + inaccurateVoteCount;
  const accurateRatio = totalVotes === 0 ? 0 : accurateVoteCount / totalVotes;
  if (
    accurateVoteCount >= ACCURATE_VOTE_THRESHOLD &&
    accurateRatio >= ACCURATE_RATIO_THRESHOLD
  ) {
    return "verified";
  }

  return "pending";
}

export function verificationStatusLabel(status: PointVerificationStatus) {
  if (status === "verified") return "확정";
  if (status === "inaccurate") return "정확하지 않음";
  return "확인 중";
}

export function verificationStatusDescription(status: PointVerificationStatus) {
  if (status === "verified") {
    return "주민 검증 기준을 통과한 위치입니다.";
  }
  if (status === "inaccurate") {
    return "잘못됐다는 의견이 기준에 도달했습니다. 이용 전 현장을 다시 확인해 주세요.";
  }
  return "아직 충분한 검증을 받지 않은 제보입니다.";
}

export function voteValueLabel(value: VerificationVoteValue) {
  return value === "accurate" ? "정확해요" : "잘못됐어요";
}
