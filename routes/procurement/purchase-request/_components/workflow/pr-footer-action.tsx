import { useState } from "react";
import { useWatch, type Control } from "react-hook-form";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { Check, Eye, SendHorizonal, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STAGE_ROLE } from "@/types/stage-role";
import { formatCurrency } from "@/lib/currency-utils";
import type { PrFormValues } from "../pr-form-schema";
import { isAllItemsComplete } from "../pr-form-schema";
import { PR_STATUS, PR_ITEM_STAGE_STATUS } from "@/types/purchase-request";
import { PrActionDialog, type StageOption, type ActionDialogItem } from "./pr-action-dialog";

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
  readonly onReview?: (messages: Record<number, string>, desStage: string) => void;
  readonly onPurchaseApprove?: () => void;
}

type ConfirmConfig = {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: "default" | "destructive" | "success" | "info" | "warning";
  onConfirm: () => void;
};

/**
 * คำนวณ action รวมของ stage ปัจจุบันจากสถานะของ items ทุกตัวใน PR โดยใช้
 * ลำดับความสำคัญ: review (มีอย่างน้อยหนึ่งรายการขอ review) > rejected
 * (ทุกรายการปฏิเสธ) > approved (ทุกรายการเป็น approve/reject และมีอย่างน้อย
 * หนึ่งรายการ approve) ใช้เพื่อตัดสินใจว่าควรแสดงปุ่ม workflow ปุ่มใดใน footer
 * @param statuses - รายการสถานะ `current_stage_status` ของแต่ละ item ใน PR
 * @returns ค่า `"none" | "review" | "rejected" | "approved"` สะท้อนปุ่มที่ควรแสดง
 * @example
 * computePurchaseAction(["approve", "reject"]); // => "approved"
 * computePurchaseAction(["review", "approve"]); // => "review"
 */
const computePurchaseAction = (
  statuses: string[],
): "none" | "review" | "rejected" | "approved" => {
  if (statuses.length === 0) return "none";
  const isReject = (s: string) => s === PR_ITEM_STAGE_STATUS.REJECT || s === PR_ITEM_STAGE_STATUS.REJECTED;
  const isApprove = (s: string) => s === PR_ITEM_STAGE_STATUS.APPROVE || s === PR_ITEM_STAGE_STATUS.APPROVED;
  if (statuses.some((s) => s === PR_ITEM_STAGE_STATUS.REVIEW)) return "review";
  if (statuses.every(isReject)) return "rejected";
  if (statuses.every((s) => isApprove(s) || isReject(s)) && statuses.some(isApprove)) return "approved";
  return "none";
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

  const hasMixedCurrency = items.some(
    (item) => item?.currency_code && item.currency_code !== currencyCode,
  );

  let subtotal = 0;
  let totalDiscount = 0;
  let totalNet = 0;
  let totalTax = 0;
  let grandTotal = 0;

  for (const item of items) {
    const rate = hasMixedCurrency ? Number(item?.exchange_rate ?? 1) : 1;
    const price = Number(item?.pricelist_price ?? 0);
    const qty = Number(item?.requested_qty ?? 0);
    subtotal += price * qty * rate;
    totalDiscount += Number(item?.discount_amount ?? 0) * rate;
    totalNet += Number(item?.net_amount ?? 0) * rate;
    totalTax += Number(item?.tax_amount ?? 0) * rate;
    grandTotal += Number(item?.total_price ?? 0) * rate;
  }

  const summary = { subtotal, totalDiscount, totalNet, totalTax, grandTotal };

  // const canSubmit = role === STAGE_ROLE.CREATE && prStatus !== "in_progress";
  const canSubmit = role === STAGE_ROLE.CREATE;
  const canApprove = role === STAGE_ROLE.APPROVE;
  const canPurchaseApprove = role === STAGE_ROLE.PURCHASE;
  const purchaseAction = computePurchaseAction(itemStatuses);

  const allItemsComplete = isAllItemsComplete(items);

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
      ((canApprove && purchaseAction !== "none") ||
        canPurchaseApprove));

  const reviewItems: ActionDialogItem[] = items
    .map((item, index) => ({ index, item }))
    .filter(({ item }) => item?.current_stage_status === PR_ITEM_STAGE_STATUS.REVIEW)
    .map(({ index, item }) => ({
      index,
      productName: item?.product_name ?? "",
      locationName: item?.location_name ?? "",
    }));

  return (
    <>
      <div
        className={`bg-background sticky bottom-0 z-20 mt-auto flex flex-wrap items-center gap-3 border-t p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:flex-nowrap sm:gap-4 ${hasRecord ? "justify-between" : "justify-end"}`}
      >
        {hasRecord && (
          <div className="flex items-center gap-4 text-xs tabular-nums">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{tfl("subtotal")}</span>
              <span className="font-medium">
                {formatCurrency(summary.subtotal)}
              </span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{tfl("discount")}</span>
              <span
                className={
                  summary.totalDiscount > 0
                    ? "text-destructive font-medium"
                    : "font-medium"
                }
              >
                {summary.totalDiscount > 0
                  ? `-${formatCurrency(summary.totalDiscount)}`
                  : formatCurrency(0)}
              </span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{tfl("net")}</span>
              <span className="font-medium">
                {formatCurrency(summary.totalNet)}
              </span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{tfl("tax")}</span>
              <span className="font-medium">
                {formatCurrency(summary.totalTax)}
              </span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold">{tfl("total")}</span>
              <span className="font-semibold">
                {formatCurrency(summary.grandTotal)}
              </span>
              {currencyCode && (
                <span className="text-muted-foreground text-xs font-normal">
                  {currencyCode}
                </span>
              )}
            </div>
          </div>
        )}

        {hasVisibleButton && (
          <div className="flex shrink-0 items-center gap-2">
            {showSubmit && (
              <Button
                type="button"
                size="sm"
                variant="info"
                disabled={isPending || !allItemsComplete}
                onClick={() =>
                  openConfirm({
                    title: t("submitTitle"),
                    description: t("submitConfirm"),
                    confirmLabel: tc("submit"),
                    confirmVariant: "info",
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
                  onClick={() => {
                    if (!allItemsReadyForPurchase) {
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
      </div>

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
        onOpenChange={(open) => { if (!open) setConfirm(null); }}
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
