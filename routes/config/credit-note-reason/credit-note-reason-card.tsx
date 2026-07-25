import { Clock } from "lucide-react";
import { useTranslations } from "use-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type { CnReason } from "@/types/cn-reason";

interface CreditNoteReasonCardProps {
  readonly item: CnReason;
  readonly index?: number;
  readonly onEdit: (item: CnReason) => void;
}

/**
 * การ์ดแสดงข้อมูล Credit Note Reason สำหรับมุมมอง mobile
 * @param props - ข้อมูล item, index และ callback onEdit
 * @returns React element ของการ์ด Credit Note Reason
 * @example
 * // route: /config/credit-note-reason (mobile card view)
 * <CreditNoteReasonCard item={item} index={0} onEdit={handleEdit} />
 */
export default function CreditNoteReasonCard({
  item,
  index,
  onEdit,
}: CreditNoteReasonCardProps) {
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
      className="hover:border-primary/30 focus-visible:ring-ring cursor-pointer gap-0 py-0 transition-colors focus-visible:ring-2"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <CardTitle className="min-w-0 flex-1 truncate text-sm">
            {item.name || "..."}
          </CardTitle>
        </div>
        <CardAction>
          <StatusBadge active={item.is_active} />
        </CardAction>
      </CardHeader>

      {(item.description || item.audit?.updated?.at) && (
        <>
          <Separator />
          <CardContent className="space-y-1.5 px-4 py-2 text-xs">
            {item.description && (
              <p className="text-muted-foreground line-clamp-2 text-xs">
                {item.description}
              </p>
            )}
            {item.audit?.updated?.at && (
              <div className="flex items-center gap-1.5">
                <Clock
                  className="text-muted-foreground size-3 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground truncate">
                  {tfl("updated")}:{" "}
                  {formatDate(item.audit.updated.at, dateTimeFormat)}
                </span>
              </div>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
}
