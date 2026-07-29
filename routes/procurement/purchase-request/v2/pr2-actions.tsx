import { useState } from "react";
import { useWatch, type Control } from "react-hook-form";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { Ban, Check, Eye, SendHorizonal, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STAGE_ROLE } from "@/types/stage-role";
import { PR_STATUS, PR_ITEM_STAGE_STATUS } from "@/types/purchase-request";
import type { PrFormValues } from "../pr-form-schema";
import { isAllItemsComplete } from "../pr-form-schema";
import {
  PrActionDialog,
  type StageOption,
  type ActionDialogItem,
} from "../workflow/pr-action-dialog";
import { computePurchaseAction } from "../workflow/pr-purchase-action";

type ConfirmConfig = {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: "default" | "destructive" | "success" | "info" | "warning";
  onConfirm: () => void;
};

interface Pr2ActionsProps {
  readonly role?: string;
  readonly prStatus?: string;
  readonly isPending: boolean;
  readonly hasRecord: boolean;
  readonly control: Control<PrFormValues>;
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

/**
 * ปุ่ม workflow ของ v2 — เงื่อนไข "ปุ่มไหนโผล่ตอนไหน" ยกมาจาก PrFooterAction
 * ทั้งดุ้น (ใช้ computePurchaseAction ตัวเดียวกัน) เปลี่ยนแค่ที่วางกับหน้าตา
 * เพื่อไม่ให้ business rule แตกเป็นสองชุด
 *
 * สีต่างจากหน้าเดิมโดยตั้งใจ: footer เดิมวางปุ่มพื้นทึบ 4 สี (ส่ง=ฟ้า อนุมัติ=เขียว
 * ปฏิเสธ=แดง ส่งกลับ=เหลือง) เรียงกันในแถวเดียว ซึ่ง DESIGN.md ห้ามไว้ตรงๆ
 * ("accent ปรากฏครั้งเดียวต่อ element ห้ามกระจุก") และใช้งานจริงก็ไม่ได้ผล —
 * พอมีสี่สีแข่งกัน ไม่มีอันไหนเด่น คนอ่านป้ายเอาอยู่ดี แล้ว "ปฏิเสธ" ก็ดูน่ากด
 * เท่ากับ "อนุมัติ"
 *
 * กติกาใหม่: **การกระทำที่พา stage เดินหน้า** ได้ accent เดียว (primary ทึบ)
 * ปฏิเสธเป็น outline ตัวหนังสือแดง (ทำลายจริง แต่ไม่ควรชวนกด) ส่งกลับเป็น
 * outline เป็นกลาง
 */
export function Pr2Actions({
  role,
  prStatus,
  isPending,
  hasRecord,
  control,
  previousStages,
  stagesLoading,
  onSubmitPr,
  onApprove,
  onReject,
  onReview,
  onPurchaseApprove,
  onValidatePurchase,
}: Pr2ActionsProps) {
  "use no memo";
  const t = useTranslations("procurement.purchaseRequest");
  const tc = useTranslations("common");
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const items = useWatch({ control, name: "items" }) ?? [];
  const itemStatuses = items.map((item) => item?.current_stage_status ?? "");

  const isVoided = prStatus === PR_STATUS.VOIDED;
  const isViewOnly = role === STAGE_ROLE.VIEW_ONLY;
  const showWorkflowActions = hasRecord && !isVoided && !isViewOnly;

  const canSubmit = role === STAGE_ROLE.CREATE;
  const canApprove = role === STAGE_ROLE.APPROVE;
  const canPurchaseApprove = role === STAGE_ROLE.PURCHASE;
  const purchaseAction = computePurchaseAction(itemStatuses);
  const allItemsComplete = isAllItemsComplete(items);

  const reviewItems: ActionDialogItem[] = items
    .map((item, index) => ({ index, item }))
    .filter(
      ({ item }) =>
        item?.current_stage_status === PR_ITEM_STAGE_STATUS.REVIEW,
    )
    .map(({ index, item }) => ({
      index,
      productName: item?.product_name ?? "",
      locationName: item?.location_name ?? "",
    }));

  const openConfirm = (config: ConfirmConfig) => setConfirm(config);

  return (
    <>
      {canSubmit && !isVoided && (
        <Button
          type="button"
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

      {showWorkflowActions && canApprove && purchaseAction === "approved" && (
        <Button
          type="button"
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

      {showWorkflowActions &&
        (canApprove || canPurchaseApprove) &&
        purchaseAction === "rejected" && (
          <Button
            type="button"
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
            <Ban />
            {tc("reject")}
          </Button>
        )}

      {showWorkflowActions &&
        (canApprove || canPurchaseApprove) &&
        purchaseAction === "review" && (
          <Button
            type="button"
            variant="warning"
            disabled={isPending}
            onClick={() => setReviewOpen(true)}
          >
            <Eye />
            {tc("sendBack")}
          </Button>
        )}

      {showWorkflowActions &&
        canPurchaseApprove &&
        purchaseAction === "approved" && (
          <Button
            type="button"
            disabled={isPending}
            onClick={async () => {
              // validate เฉพาะตอนกด approve (action-aware) เหมือนหน้าเดิม —
              // send back ไม่ผ่านตรงนี้จึงไม่โดนบังคับกรอก vendor/price/tax
              const valid = (await onValidatePurchase?.()) ?? true;
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
