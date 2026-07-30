import { useTranslations } from "use-intl";
import { Check, Eye, PackageCheck, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SummaryFooterBar } from "@/components/ui/summary-bar";
import { formatCurrency } from "@/lib/currency-utils";
import { STAGE_ROLE } from "@/types/stage-role";

type SrAction = "none" | "review" | "rejected" | "approved";

interface SrFooterProps {
  readonly canSubmit: boolean;
  readonly isPending: boolean;
  readonly role?: string;
  readonly action: SrAction;
  /** ยอดรวมทั้งใบ — คำนวณจาก srGrandTotal ตัวเดียวกับคอลัมน์ amount ในตาราง */
  readonly grandTotal: number;
  readonly hasItems: boolean;
  readonly onSubmit: () => void;
  readonly onApprove: () => void;
  readonly onIssue: () => void;
  readonly onReject: () => void;
  readonly onSendBack: () => void;
}

export function SrFooter({
  canSubmit,
  isPending,
  role,
  action,
  grandTotal,
  hasItems,
  onSubmit,
  onApprove,
  onIssue,
  onReject,
  onSendBack,
}: SrFooterProps) {
  const t = useTranslations("storeOperation.storeRequisition");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  const isApprover = role === STAGE_ROLE.APPROVE;
  const isIssuer = role === STAGE_ROLE.ISSUE;
  const isWorkflowReviewer = isApprover || isIssuer;
  const hasAction = action !== "none";
  const showActions = canSubmit || (isWorkflowReviewer && hasAction);
  // มีรายการแล้วต้องเห็นยอดรวม แม้จะไม่มีปุ่มให้กด (view ใบที่ปิดแล้ว)
  const showBar = showActions || hasItems;

  if (!showBar) return null;

  return (
    <SummaryFooterBar
      hasRecord={hasItems}
      items={[
        {
          key: "grandTotal",
          label: tfl("grandTotal"),
          value: formatCurrency(grandTotal),
          emphasis: true,
        },
      ]}
    >
      {showActions && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {isWorkflowReviewer && action === "review" && (
            <Button
              type="button"
              size="sm"
              variant="warning"
              disabled={isPending}
              onClick={onSendBack}
            >
              <Eye />
              {tc("sendBack")}
            </Button>
          )}
          {isWorkflowReviewer && action === "rejected" && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isPending}
              onClick={onReject}
            >
              <X />
              {tc("reject")}
            </Button>
          )}
          {isApprover && action === "approved" && (
            <Button
              type="button"
              size="sm"
              variant="success"
              disabled={isPending}
              onClick={onApprove}
            >
              <Check />
              {tc("approve")}
            </Button>
          )}
          {isIssuer && action === "approved" && (
            <Button
              type="button"
              size="sm"
              variant="success"
              disabled={isPending}
              onClick={onIssue}
            >
              <PackageCheck />
              {tc("issue")}
            </Button>
          )}
          {!isWorkflowReviewer && (
            <Button
              type="button"
              size="sm"
              variant="info"
              disabled={isPending}
              onClick={onSubmit}
            >
              <Send />
              {t("submit")}
            </Button>
          )}
        </div>
      )}
    </SummaryFooterBar>
  );
}
