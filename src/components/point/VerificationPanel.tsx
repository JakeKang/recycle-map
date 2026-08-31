import {
  ACCURATE_RATIO_THRESHOLD,
  ACCURATE_VOTE_THRESHOLD,
  INACCURATE_VOTE_THRESHOLD,
  verificationStatusDescription,
  verificationStatusLabel,
} from "@/lib/point-verification";
import type {
  PublicPointDetail,
  VerificationVoteValue,
} from "@/types/point";
import { BadgeCheck, CircleAlert, Clock3, ThumbsDown, ThumbsUp } from "lucide-react";

interface VerificationPanelProps {
  point: PublicPointDetail;
  isVoting?: boolean;
  voteError?: string | null;
  onVote?: (value: VerificationVoteValue) => void;
}

const STATUS_ICON = {
  pending: Clock3,
  verified: BadgeCheck,
  inaccurate: CircleAlert,
} as const;

export default function VerificationPanel({
  point,
  isVoting = false,
  voteError,
  onVote,
}: VerificationPanelProps) {
  const StatusIcon = STATUS_ICON[point.verificationStatus];
  const totalVotes = point.accurateVoteCount + point.inaccurateVoteCount;
  const accurateRatio = totalVotes === 0 ? 0 : point.accurateVoteCount / totalVotes;
  const voteHelp =
    point.voteEligibility === "login_required"
      ? "로그인하면 이 위치를 검증할 수 있습니다."
      : point.voteEligibility === "owner"
        ? "제보자는 자신의 위치에 투표할 수 없습니다."
        : "현장에서 확인한 정보에 한 표를 남겨주세요. 선택은 나중에 바꿀 수 있습니다.";

  return (
    <section className="verification-ledger" aria-labelledby={`verification-${point.id}`}>
      <div className="verification-ledger__heading">
        <div>
          <h3 id={`verification-${point.id}`}>위치 검증</h3>
          <p>{verificationStatusDescription(point.verificationStatus)}</p>
        </div>
        <span
          className={`verification-state verification-state--${point.verificationStatus}`}
        >
          <StatusIcon size={15} aria-hidden="true" />
          {verificationStatusLabel(point.verificationStatus)}
        </span>
      </div>

      <dl className="verification-tally">
        <div>
          <dt>정확해요</dt>
          <dd>
            <strong>{point.accurateVoteCount}</strong>
            <span>{ACCURATE_VOTE_THRESHOLD}표 이상 필요</span>
          </dd>
        </div>
        <div>
          <dt>잘못됐어요</dt>
          <dd>
            <strong>{point.inaccurateVoteCount}</strong>
            <span>{INACCURATE_VOTE_THRESHOLD}표 도달 시 주의 표시</span>
          </dd>
        </div>
        <div>
          <dt>찬성률</dt>
          <dd>
            <strong>{totalVotes === 0 ? "—" : `${Math.round(accurateRatio * 100)}%`}</strong>
            <span>{Math.round(ACCURATE_RATIO_THRESHOLD * 100)}% 이상 필요</span>
          </dd>
        </div>
      </dl>

      <div className="verification-actions" aria-label="위치 검증 투표">
        <button
          type="button"
          className="verification-vote verification-vote--accurate"
          aria-pressed={point.currentUserVote === "accurate"}
          disabled={!point.canVote || isVoting}
          onClick={() => onVote?.("accurate")}
        >
          <ThumbsUp size={16} aria-hidden="true" />
          {isVoting && point.currentUserVote !== "inaccurate" ? "반영 중" : "정확해요"}
        </button>
        <button
          type="button"
          className="verification-vote verification-vote--inaccurate"
          aria-pressed={point.currentUserVote === "inaccurate"}
          disabled={!point.canVote || isVoting}
          onClick={() => onVote?.("inaccurate")}
        >
          <ThumbsDown size={16} aria-hidden="true" />
          {isVoting && point.currentUserVote !== "accurate" ? "반영 중" : "잘못됐어요"}
        </button>
      </div>
      <p className="verification-help">{voteHelp}</p>
      {point.verificationSource === "admin" ? (
        <p className="verification-admin-note">관리자 검토로 조정된 상태입니다.</p>
      ) : null}
      {voteError ? <p className="form-error">{voteError}</p> : null}
    </section>
  );
}
