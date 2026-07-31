import { useState } from "react";
import { useWatch, type Control } from "react-hook-form";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { Check, Eye, SendHorizonal, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SummaryFooterBar } from "@/components/ui/summary-bar";
import { STAGE_ROLE } from "@/types/stage-role";
import { formatCurrency } from "@/lib/currency-utils";
import type { PrFormValues } from "../pr-form-schema";
import { computePrSummary } from "../pr-summary";
import { PR_STATUS, PR_ITEM_STAGE_STATUS } from "@/types/purchase-request";
import {
  PrActionDialog,
  type StageOption,
  type ActionDialogItem,
} from "./pr-action-dialog";
import { computePurchaseAction } from "./pr-purchase-action";

interface PrFooterActionProps {
  readonly role?: string;
  readonly prStatus?: string;
  readonly isPending: boolean;
  readonly hasRecord: boolean;
  readonly control: Control<PrFormValues>;
  readonly currencyCode?: string;
  readonly previousStages?: StageOption[];
  readonly stagesLoading?: boolean;
  readonly onSubmitPr?: () => void;
  readonly onApprove?: () => void;
  readonly onReject?: () => void;
  readonly onReview?: (
    messages: Record<number, string>,
    desStage: string,
  ) => void;
  readonly onPurchaseApprove?: () => void;
  readonly onValidatePurchase?: () => Promise<boolean>;
}

type ConfirmConfig = {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: "default" | "destructive" | "success" | "info" | "warning";
  onConfirm: () => void;
};

/**
 * แถบ footer แบบ sticky ของฟอร์ม PR แสดงยอดรวม (subtotal / discount / net /
 * tax / total) พร้อมแปลงค่าเป็นสกุลหลักด้วย `exchange_rate` ของแต่ละ item
 * เมื่อมีหลายสกุลเงิน และแสดงปุ่ม workflow actions ที่ผันตาม `role` และ
 * สถานะรวมของ items (submit / approve / reject / send back / purchase approve)
 * รวมถึงเชื่อมกับ `PrActionDialog` สำหรับยืนยันและรับข้อความ/destination stage
 * @param props - คุณสมบัติของ footer
 * @param props.role - stage role ปัจจุบันของผู้ใช้ (CREATE / APPROVE / PURCHASE / VIEW_ONLY)
 * @param props.prStatus - สถานะของ PR ใช้ตรวจเงื่อนไข voided
 * @param props.isPending - สถานะกำลังประมวลผล ปิดการใช้งานปุ่ม
 * @param props.hasRecord - มีเรคคอร์ดที่บันทึกแล้วหรือยัง ใช้ซ่อน/แสดงสรุปยอด
 * @param props.control - control ของ react-hook-form สำหรับอ่านค่า items
 * @param props.currencyCode - สกุลเงินหลักของเอกสารสำหรับแสดงผลรวม
 * @param props.previousStages - รายการ stage ก่อนหน้าสำหรับส่งกลับ (send back)
 * @param props.stagesLoading - สถานะกำลังโหลด previousStages
 * @param props.onSubmitPr - callback เมื่อกดส่งใบ PR
 * @param props.onApprove - callback เมื่อกดอนุมัติ
 * @param props.onReject - callback เมื่อกดปฏิเสธ
 * @param props.onReview - callback เมื่อกดส่งกลับ (send back) รับ messages และ destination stage
 * @param props.onPurchaseApprove - callback เมื่อกด purchase approve
 * @returns React element ของแถบ footer พร้อม PrActionDialog สำหรับยืนยัน
 * @example
 * <PrFooterAction
 *   role={role}
 *   prStatus={pr.pr_status}
 *   isPending={mutation.isPending}
 *   hasRecord
 *   control={form.control}
 *   currencyCode="THB"
 *   onSubmitPr={handleSubmit}
 *   onApprove={handleApprove}
 *   onReject={handleReject}
 * />
 */
export function PrFooterAction({
  role,
  prStatus,
  isPending,
  hasRecord,
  control,
  currencyCode,
  previousStages,
  stagesLoading,
  onSubmitPr,
  onApprove,
  onReject,
  onReview,
  onPurchaseApprove,
  onValidatePurchase,
}: PrFooterActionProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const openConfirm = (config: ConfirmConfig) => setConfirm(config);

  const isVoided = prStatus === PR_STATUS.VOIDED;
  const isViewOnly = role === STAGE_ROLE.VIEW_ONLY;
  const showWorkflowActions = hasRecord && !isVoided && !isViewOnly;

  const items = useWatch({ control, name: "items" });

  const itemStatuses = items.map((item) => item?.current_stage_status ?? "");

  const summary = computePrSummary(items);

  // const canSubmit = role === STAGE_ROLE.CREATE && prStatus !== "in_progress";
  const canSubmit = role === STAGE_ROLE.CREATE;
  const canApprove = role === STAGE_ROLE.APPROVE;
  const canPurchaseApprove = role === STAGE_ROLE.PURCHASE;
  const purchaseAction = computePurchaseAction(itemStatuses);

  const allItemsReadyForPurchase =
    items.length > 0 &&
    items.every(
      (item) =>
        item.vendor_id && item.pricelist_price > 0 && item.tax_profile_id,
    );

  const showSubmit = canSubmit && !isVoided;
  const hasVisibleButton =
    showSubmit ||
    (showWorkflowActions &&
      ((canApprove && purchaseAction !== "none") || canPurchaseApprove));

  const reviewItems: ActionDialogItem[] = items
    .map((item, index) => ({ index, item }))
    .filter(
      ({ item }) => item?.current_stage_status === PR_ITEM_STAGE_STATUS.REVIEW,
    )
    .map(({ index, item }) => ({
      index,
      productName: item?.product_name ?? "",
      locationName: item?.location_name ?? "",
    }));

  return (
    <>
      <SummaryFooterBar
        hasRecord={hasRecord}
        items={[
          {
            key: "subtotal",
            label: tfl("subtotal"),
            value: formatCurrency(summary.subtotal),
          },
          {
            key: "discount",
            label: tfl("discount"),
            value:
              summary.totalDiscount > 0
                ? `-${formatCurrency(summary.totalDiscount)}`
                : formatCurrency(0),
            valueClassName:
              summary.totalDiscount > 0
                ? "text-destructive"
                : undefined,
          },
          {
            key: "net",
            label: tfl("net"),
            value: formatCurrency(summary.totalNet),
          },
          {
            key: "tax",
            label: tfl("tax"),
            value: formatCurrency(summary.totalTax),
          },
          {
            key: "grandTotal",
            label: tfl("grandTotal"),
            value: formatCurrency(summary.grandTotal),
            emphasis: true,
            suffix: currencyCode,
          },
        ]}
      >
        {hasVisibleButton && (
          <div className="flex shrink-0 items-center gap-2">
            {showSubmit && (
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  openConfirm({
                    title: t("submitTitle"),
                    description: t("submitConfirm"),
                    confirmLabel: tc("submit"),
                    confirmVariant: "default",
                    onConfirm: () => onSubmitPr?.(),
                  })
                }
              >
                <SendHorizonal />
                {tc("submit")}
              </Button>
            )}

            {canApprove && purchaseAction === "approved" && (
              <Button
                type="button"
                size="sm"
                variant="success"
                disabled={isPending}
                onClick={() =>
                  openConfirm({
                    title: t("approveTitle"),
                    description: t("approveConfirm"),
                    confirmLabel: tc("approve"),
                    confirmVariant: "success",
                    onConfirm: () => onApprove?.(),
                  })
                }
              >
                <Check />
                {tc("approve")}
              </Button>
            )}

            {canApprove && purchaseAction === "rejected" && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isPending}
                onClick={() =>
                  openConfirm({
                    title: t("rejectTitle"),
                    description: t("rejectConfirm"),
                    confirmLabel: tc("reject"),
                    confirmVariant: "destructive",
                    onConfirm: () => onReject?.(),
                  })
                }
              >
                <X />
                {tc("reject")}
              </Button>
            )}

            {canApprove && purchaseAction === "review" && (
              <Button
                type="button"
                size="sm"
                variant="warning"
                disabled={isPending}
                onClick={() => setReviewOpen(true)}
              >
                <Eye />
                {tc("sendBack")}
              </Button>
            )}

            {canPurchaseApprove && purchaseAction === "approved" && (
              <Button
                type="button"
                size="sm"
                variant="success"
                disabled={isPending}
                onClick={async () => {
                  // validate เฉพาะตอนกด approve (action-aware): trigger schema
                  // เพื่อโชว์กรอบแดงที่ field ที่ขาด แล้วค่อยเปิด confirm
                  const valid =
                    (await onValidatePurchase?.()) ?? allItemsReadyForPurchase;
                  if (!valid) {
                    toast.warning(t("purchaseIncomplete"));
                    return;
                  }
                  openConfirm({
                    title: t("purchaseApproveTitle"),
                    description: t("purchaseApproveConfirm"),
                    confirmLabel: t("purchaseApproveTitle"),
                    confirmVariant: "success",
                    onConfirm: () => onPurchaseApprove?.(),
                  });
                }}
              >
                <ShoppingCart />
                {tc("approve")}
              </Button>
            )}

            {canPurchaseApprove && purchaseAction === "rejected" && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isPending}
                onClick={() =>
                  openConfirm({
                    title: t("rejectTitle"),
                    description: t("rejectConfirm"),
                    confirmLabel: tc("reject"),
                    confirmVariant: "destructive",
                    onConfirm: () => onReject?.(),
                  })
                }
              >
                <X />
                {tc("reject")}
              </Button>
            )}

            {canPurchaseApprove && purchaseAction === "review" && (
              <Button
                type="button"
                size="sm"
                variant="warning"
                disabled={isPending}
                onClick={() => setReviewOpen(true)}
              >
                <Eye />
                {tc("sendBack")}
              </Button>
            )}
          </div>
        )}
      </SummaryFooterBar>

      <PrActionDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        title={t("sendBackTitle")}
        description={t("sendBackConfirm")}
        confirmLabel={tc("sendBack")}
        confirmVariant="warning"
        isPending={isPending}
        stages={previousStages}
        stagesLoading={stagesLoading}
        items={reviewItems}
        onConfirm={(messages, desStage) => {
          onReview?.(messages, desStage ?? "");
          setReviewOpen(false);
        }}
      />

      <PrActionDialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        confirmVariant={confirm?.confirmVariant ?? "default"}
        isPending={isPending}
        showMessage={false}
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
      />
    </>
  );
}
