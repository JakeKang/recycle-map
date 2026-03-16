import { CollectionPoint } from "@/types/point";

interface PointPopupContentProps {
  point: CollectionPoint;
  onPointSelect: (id: string) => void;
}

export default function PointPopupContent({ point, onPointSelect }: PointPopupContentProps) {
  return (
    <div className="space-y-1">
      <p className="font-semibold">{point.title}</p>
      <p className="text-xs text-slate-600">{point.address ?? "주소 미입력"}</p>
      <button
        type="button"
        onClick={() => onPointSelect(point.id)}
        className="mt-1 rounded-md border border-emerald-900/20 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-900"
      >
        상세 보기
      </button>
    </div>
  );
}
