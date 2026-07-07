import { CalendarDays, Building2, User, Workflow, Check, X, Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatAmount } from "@/lib/currency-utils";
import { PR_STATUS_CONFIG } from "@/constant/purchase-request";
import type { PurchaseRequest } from "@/types/purchase-request";
import { PR_STATUS } from "@/types/purchase-request";

interface PrCardProps {
  readonly item: PurchaseRequest;
  readonly index?: number;
  readonly onEdit: (item: PurchaseRequest) => void;
  readonly onApprove?: (item: PurchaseRequest) => void;
  readonly onReject?: (item: PurchaseRequest) => void;
  readonly onDelete?: (item: PurchaseRequest) => void;
  readonly isMyPending?: boolean;
}

/**
 * การ์ดแสดงข้อมูล PR 1 รายการสำหรับ mobile/grid card view
 * แสดงเลขที่ PR, วันที่, requester, department, workflow, total และปุ่ม approve/reject/delete ตามสถานะ
 * @param props - Props ของ `PrCard`
 * @param props.item - ข้อมูลใบขอซื้อ
 * @param props.index - ลำดับการ์ดในรายการ (ใช้แสดงเลขลำดับ)
 * @param props.onEdit - callback เมื่อคลิกการ์ดเพื่อแก้ไข
 * @param props.onApprove - callback เมื่อกด approve
 * @param props.onReject - callback เมื่อกด reject
 * @param props.onDelete - callback เมื่อกด delete (เฉพาะ draft)
 * @param props.isMyPending - flag ว่าอยู่ใน view my-pending
 * @returns React element ของการ์ด PR
 * @example
 * <PrCard item={pr} index={0} onEdit={handleEdit} isMyPending />
 */
export default function PrCard({
  item,
  index,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  isMyPending = false,
}: PrCardProps) {
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const { dateFormat, amountFormat, defaultCurrencyCode } = useProfile();

  const config = PR_STATUS_CONFIG[item.pr_status] ?? PR_STATUS_CONFIG.draft;
  const totalAmount = item.base_total_amount;
  const isDraft = item.pr_status === PR_STATUS.DRAFT;
  const isPendingApproval = item.pr_status === PR_STATUS.IN_PROGRESS;
  const showApproveReject = isMyPending && isPendingApproval && (onApprove || onReject);
  const showDelete = isMyPending && isDraft && onDelete;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on buttons
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
      className="cursor-pointer gap-0 py-0 transition-colors hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm">{item.pr_no}</CardTitle>
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
              {formatDate(item.pr_date, dateFormat)}
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
        <div className="flex items-start gap-2">
          <User
            className="text-muted-foreground mt-0.5 size-3 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">
              {tfl("requester")}
            </p>
            <p className="truncate font-semibold">{item.requestor_name}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Building2
            className="text-muted-foreground mt-0.5 size-3 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">
              {tfl("department")}
            </p>
            <p className="truncate font-semibold">{item.department_name}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Workflow
            className="text-muted-foreground mt-0.5 size-3 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs">
              {tfl("type")} / {tfl("stage")}
            </p>
            <p className="truncate font-semibold">
              {item.workflow_name}
              {item.workflow_current_stage && (
                <span className="text-muted-foreground">
                  {" "}
                  / {item.workflow_current_stage}
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>

      {totalAmount != null && !Number.isNaN(Number(totalAmount)) && (
        <>
          <Separator />
          <CardFooter className="justify-between px-4 py-2">
            <span className="text-muted-foreground text-xs">
              {tfl("totalAmount")}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {formatAmount(totalAmount, amountFormat)}
              {defaultCurrencyCode && (
                <span className="text-muted-foreground ml-1 text-xs font-normal">
                  {defaultCurrencyCode}
                </span>
              )}
            </span>
          </CardFooter>
        </>
      )}

      {(showApproveReject || showDelete) && (
        <>
          <Separator />
          <div className="flex gap-2 px-4 py-2">
            {showApproveReject && (
              <>
                {onApprove && (
                  <Button
                    size="xs"
                    variant="success"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onApprove(item);
                    }}
                  >
                    <Check className="size-3" aria-hidden="true" />
                    {tc("approve")}
                  </Button>
                )}
                {onReject && (
                  <Button
                    size="xs"
                    variant="destructive"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject(item);
                    }}
                  >
                    <X className="size-3" aria-hidden="true" />
                    {tc("reject")}
                  </Button>
                )}
              </>
            )}
            {showDelete && onDelete && (
              <Button
                size="xs"
                variant="destructive"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item);
                }}
              >
                <Trash2 className="size-3" aria-hidden="true" />
                {tc("delete")}
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
