import { CalendarDays, Building2, User, Workflow, MapPin } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { SR_STATUS_CONFIG } from "@/constant/store-requisition";
import type { StoreRequisition } from "@/types/store-requisition";

interface SrCardProps {
  readonly item: StoreRequisition;
  readonly index?: number;
  readonly onEdit: (item: StoreRequisition) => void;
}

/**
 * การ์ดแสดงรายการใบเบิกสินค้า 1 รายการสำหรับหน้ารายการ mobile/grid
 * คลิกหรือกด Enter เพื่อเข้าสู่หน้าแก้ไข
 *
 * @param props - item, index และ onEdit handler
 * @param props.item - ข้อมูล StoreRequisition
 * @param props.index - ลำดับในรายการ (optional)
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @returns คอมโพเนนต์การ์ด SR
 * @example
 * <SrCard item={sr} index={0} onEdit={(it) => router.push(`/.../${it.id}`)} />
 */
export default function SrCard({ item, index, onEdit }: SrCardProps) {
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();

  const config =
    SR_STATUS_CONFIG[item.doc_status] ?? SR_STATUS_CONFIG.draft;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    onEdit(item);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEdit(item);
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className="cursor-pointer gap-0 py-0 transition-all hover:border-primary/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm break-words leading-tight">
              {item.sr_no}
            </CardTitle>
            <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
              <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
              {formatDate(item.sr_date, dateFormat)}
            </div>
          </div>
        </div>
        <CardAction>
          <Badge className={`${config.className} text-xs`} size="sm">
            {config.label}
          </Badge>
        </CardAction>
      </CardHeader>

      <Separator />

      <CardContent className="space-y-2 px-4 py-3 text-xs">
        <div className="flex items-center gap-1.5">
          <MapPin
            className="text-muted-foreground size-3 shrink-0"
            aria-hidden="true"
          />
          <span className="truncate font-medium">
            {item.from_location_name}
            {item.to_location_name && (
              <span className="text-muted-foreground">
                {" → "}
                {item.to_location_name}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <User
            className="text-muted-foreground size-3 shrink-0"
            aria-hidden="true"
          />
          <span className="font-medium">{item.requestor_name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Building2
            className="text-muted-foreground size-3 shrink-0"
            aria-hidden="true"
          />
          <span className="text-muted-foreground">{item.department_name}</span>
        </div>
        {item.workflow_name && (
          <div className="flex items-center gap-1.5">
            <Workflow
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="text-muted-foreground truncate">
              {item.workflow_name}
              {item.workflow_current_stage && ` / ${item.workflow_current_stage}`}
            </span>
          </div>
        )}
      </CardContent>

      <Separator />

      <CardFooter className="justify-between px-4 py-2">
        <span className="text-muted-foreground text-xs">{tfl("items")}</span>
        <Badge variant="secondary" size="xs" className="text-xs">
          {item.store_requisition_detail?.length ?? 0}
        </Badge>
      </CardFooter>
    </Card>
  );
}
