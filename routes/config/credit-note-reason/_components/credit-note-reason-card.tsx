import { useTranslations } from "use-intl";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  const ts = useTranslations("status");

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
          <Badge
            variant={item.is_active ? "success" : "destructive"}
            size="sm"
            className="text-xs"
          >
            {item.is_active ? ts("active") : ts("inactive")}
          </Badge>
        </CardAction>
      </CardHeader>

      {item.description && (
        <>
          <Separator />
          <CardContent className="px-4 py-2">
            <p className="text-muted-foreground line-clamp-2 text-xs">
              {item.description}
            </p>
          </CardContent>
        </>
      )}
    </Card>
  );
}
