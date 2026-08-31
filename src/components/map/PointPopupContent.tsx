import { PublicPoint as CollectionPoint } from "@/lib/public-mappers";
import { verificationStatusLabel } from "@/lib/point-verification";

interface PointPopupContentProps {
  point: CollectionPoint;
  onPointSelect: (id: string) => void;
}

export default function PointPopupContent({ point, onPointSelect }: PointPopupContentProps) {
  return (
    <div className="space-y-1">
      <span
        className={`verification-state verification-state--${point.verificationStatus} !px-1.5 !py-0.5 !text-[10px]`}
      >
        {verificationStatusLabel(point.verificationStatus)}
      </span>
      <p className="font-semibold">{point.title}</p>
      <p className="text-xs text-slate-600">{point.address ?? "주소 미입력"}</p>
      <button
        type="button"
        onClick={() => onPointSelect(point.id)}
        className="mt-1 border border-[var(--trust)] bg-transparent px-2 py-1 text-[11px] font-semibold text-[var(--trust)]"
      >
        상세 보기
      </button>
    </div>
  );
}
