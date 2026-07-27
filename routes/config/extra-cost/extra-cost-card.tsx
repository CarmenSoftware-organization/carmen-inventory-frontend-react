import { Clock } from "lucide-react";
import { useTranslations } from "use-intl";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type { ExtraCost } from "@/types/extra-cost";

interface ExtraCostCardProps {
  readonly item: ExtraCost;
  readonly index?: number;
  readonly onEdit: (item: ExtraCost) => void;
}

/**
 * การ์ดแสดงข้อมูล Extra Cost สำหรับมุมมอง mobile
 * @param props - ข้อมูล item, index และ callback onEdit
 * @returns React element ของการ์ด Extra Cost
 * @example
 * // route: /config/extra-cost (mobile card view)
 * <ExtraCostCard item={item} index={0} onEdit={handleEdit} />
 */
export default function ExtraCostCard({ item, index, onEdit }: ExtraCostCardProps) {
  const tfl = useTranslations("field");
  const { dateTimeFormat } = useProfile();

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
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-micro-legal font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <CardTitle className="truncate text-sm flex-1 min-w-0">{item.name || "..."}</CardTitle>
        </div>
        <CardAction>
          <StatusBadge active={item.is_active} />
        </CardAction>
      </CardHeader>

      {item.audit?.updated?.at && (
        <>
          <Separator />
          <CardContent className="flex items-center gap-1.5 px-4 py-2 text-xs">
            <Clock
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="text-muted-foreground truncate">
              {tfl("updated")}: {formatDate(item.audit.updated.at, dateTimeFormat)}
            </span>
          </CardContent>
        </>
      )}
    </Card>
  );
}
