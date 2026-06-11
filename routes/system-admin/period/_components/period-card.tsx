import { Calendar } from "lucide-react";

import { formatDate } from "@/lib/date-utils";
import { useProfile } from "@/hooks/use-profile";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Period } from "@/types/period";

const STATUS_VARIANT: Record<Period["status"], "success" | "secondary" | "destructive"> = {
  open: "success",
  closed: "secondary",
  locked: "destructive",
};

interface PeriodCardProps {
  readonly item: Period;
  readonly index?: number;
  readonly onEdit: (item: Period) => void;
}

/**
 * การ์ดแสดงข้อมูลงวดบัญชี (Period) สำหรับ mobile view
 * @param props - ข้อมูล item งวดบัญชี, ลำดับ index และ callback onEdit เมื่อคลิกการ์ด
 * @returns React element ของการ์ด Period
 * @example
 * <PeriodCard item={period} index={0} onEdit={handleEdit} />
 */
export default function PeriodCard({ item, index, onEdit }: PeriodCardProps) {
  const { dateFormat } = useProfile();
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
      className="cursor-pointer gap-0 py-0 transition-all hover:border-primary/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm">{item.period}</CardTitle>
            <p className="text-muted-foreground text-xs">
              FY {item.fiscal_year} · M{item.fiscal_month}
            </p>
          </div>
        </div>
        <CardAction>
          <Badge variant={STATUS_VARIANT[item.status]} size="sm" className="text-xs">
            {item.status}
          </Badge>
        </CardAction>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-2 px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar
            className="text-muted-foreground size-3 shrink-0"
            aria-hidden="true"
          />
          <p className="text-muted-foreground">
            {formatDate(item.start_at, dateFormat)} –{" "}
            {formatDate(item.end_at, dateFormat)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
