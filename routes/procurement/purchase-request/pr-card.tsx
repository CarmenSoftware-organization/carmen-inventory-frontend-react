import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatAmount } from "@/lib/currency-utils";
import { PR_STATUS_CONFIG } from "@/constant/purchase-request";
import type { PurchaseRequest } from "@/types/purchase-request";
import { PR_STATUS } from "@/types/purchase-request";

interface PrCardProps {
  readonly item: PurchaseRequest;
  readonly onEdit: (item: PurchaseRequest) => void;
  readonly onApprove?: (item: PurchaseRequest) => void;
  readonly onReject?: (item: PurchaseRequest) => void;
  readonly onDelete?: (item: PurchaseRequest) => void;
  readonly isMyPending?: boolean;
}

/**
 * การ์ดใบขอซื้อ 1 ใบ สำหรับหน้ารายการโหมด grid/mobile
 *
 * ใช้ `ListCard` ตัวเดียวกับการ์ด SR/IA — ไฟล์นี้เหลือแค่ "ข้อมูลอะไรอยู่แถวไหน"
 * กับปุ่มพิเศษของ PR (approve/reject ใน view my-pending)
 *
 * @param props.item - ข้อมูลใบขอซื้อ
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onApprove - callback เมื่อกด approve
 * @param props.onReject - callback เมื่อกด reject
 * @param props.onDelete - callback เมื่อกด delete (เฉพาะ draft ใน my-pending)
 * @param props.isMyPending - flag ว่าอยู่ใน view my-pending
 * @example
 * <PrCard item={pr} onEdit={handleEdit} isMyPending />
 */
export default function PrCard({
  item,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  isMyPending = false,
}: PrCardProps) {
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const { dateFormat, dateTimeFormat, amountFormat, defaultCurrencyCode } =
    useProfile();

  const config = PR_STATUS_CONFIG[item.pr_status] ?? PR_STATUS_CONFIG.draft;
  const totalAmount = item.base_total_amount;
  const hasTotal = totalAmount != null && !Number.isNaN(Number(totalAmount));
  const isDraft = item.pr_status === PR_STATUS.DRAFT;
  const isPendingApproval = item.pr_status === PR_STATUS.IN_PROGRESS;
  // ตัดสินรายใบได้เฉพาะใน view my-pending และเฉพาะสถานะที่ตรงกับการกระทำนั้น
  const showApproveReject =
    isMyPending && isPendingApproval && (onApprove || onReject);
  const canDelete = isMyPending && isDraft && !!onDelete;

  return (
    <ListCard
      title={item.pr_no}
      badge={
        <Badge size="xs" className={config.className}>
          {config.label}
        </Badge>
      }
      onOpen={() => onEdit(item)}
      onDelete={canDelete ? () => onDelete?.(item) : undefined}
      actions={
        showApproveReject ? (
          <>
            {onApprove && (
              <Button
                type="button"
                size="xs"
                variant="success"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove(item);
                }}
              >
                <CheckCircle2 aria-hidden="true" />
                {tc("approve")}
              </Button>
            )}
            {onReject && (
              <Button
                type="button"
                size="xs"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject(item);
                }}
              >
                <XCircle aria-hidden="true" />
                {tc("reject")}
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      <ListCardRow label={tfl("date")}>
        <span className="tabular-nums">
          {formatDate(item.pr_date, dateFormat)}
        </span>
      </ListCardRow>
      {item.requestor_name && (
        <ListCardRow label={tfl("requester")}>
          {item.requestor_name}
        </ListCardRow>
      )}
      {item.department_name && (
        <ListCardRow label={tfl("department")}>
          {item.department_name}
        </ListCardRow>
      )}
      {item.workflow_name && (
        <ListCardRow label={tfl("type")}>{item.workflow_name}</ListCardRow>
      )}
      {item.workflow_current_stage && (
        <ListCardRow label={tfl("stage")}>
          {item.workflow_current_stage}
        </ListCardRow>
      )}
      {hasTotal && (
        <ListCardRow label={tfl("totalAmount")}>
          <span className="font-semibold tabular-nums">
            {formatAmount(Number(totalAmount), amountFormat)}
            {defaultCurrencyCode && (
              <span className="text-muted-foreground ml-1 font-normal">
                {defaultCurrencyCode}
              </span>
            )}
          </span>
        </ListCardRow>
      )}
      {item.audit?.created?.at && (
        <ListCardRow label={tfl("created")}>
          <span className="tabular-nums">
            {formatDate(item.audit.created.at, dateTimeFormat)}
          </span>
        </ListCardRow>
      )}
      {item.audit?.created?.name && (
        <ListCardRow label={tfl("by")}>{item.audit.created.name}</ListCardRow>
      )}
      {item.audit?.updated?.at && (
        <ListCardRow label={tfl("updated")}>
          <span className="tabular-nums">
            {formatDate(item.audit.updated.at, dateTimeFormat)}
          </span>
        </ListCardRow>
      )}
    </ListCard>
  );
}
