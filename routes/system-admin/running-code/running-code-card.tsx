import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { RunningCode } from "@/types/running-code";

interface RunningCodeCardProps {
  readonly item: RunningCode;
  readonly index?: number;
  readonly onEdit: (item: RunningCode) => void;
}

/**
 * การ์ดแสดงข้อมูล Running Code สำหรับ mobile view
 * @param props - ข้อมูล item, ลำดับ index และ callback onEdit เมื่อคลิกการ์ด
 * @returns React element ของการ์ด Running Code
 * @example
 * <RunningCodeCard item={rc} index={0} onEdit={handleEdit} />
 */
export default function RunningCodeCard({ item, index, onEdit }: RunningCodeCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onEdit(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(item);
        }
      }}
      className="cursor-pointer gap-0 py-0 transition-colors hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <CardTitle className="truncate text-sm">{item.type}</CardTitle>
        </div>
      </CardHeader>
      {item.note && (
        <>
          <Separator />
          <CardContent className="px-4 py-3 text-xs">
            <p className="text-muted-foreground line-clamp-2">{item.note}</p>
          </CardContent>
        </>
      )}
    </Card>
  );
}
