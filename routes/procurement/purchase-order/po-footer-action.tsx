import { useState } from "react";
import { useTranslations } from "use-intl";
import { useWatch, type Control } from "react-hook-form";
import { Check, Eye, SendHorizonal, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import { PO_STATUS } from "@/types/purchase-order";
import { STAGE_ROLE } from "@/types/stage-role";
import { computePoAction } from "@/constant/purchase-order";
import type { PoFormValues } from "./po-form-schema";
import {
  PoActionDialog,
  type StageOption,
  type ActionDialogItem,
} from "./po-action-dialog";

interface PoFooterActionProps {
  readonly control: Control<PoFormValues>;
  readonly currencyCode?: string;
  readonly isPending: boolean;
  readonly role?: string;
  readonly poStatus?: string;
  readonly previousStages?: StageOption[];
  readonly stagesLoading?: boolean;
  readonly isEditMode?: boolean;
  readonly onSubmit?: () => void;
  readonly onApprove?: () => void;
  readonly onReject?: () => void;
  readonly onReview?: (
    messages: Record<number, string>,
    desStage: string,
  ) => void;
}

type ConfirmConfig = {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: "default" | "destructive" | "success" | "info" | "warning";
  onConfirm: () => void;
};

export function PoFooterAction({
  control,
  isPending,
  role,
  poStatus,
  previousStages,
  stagesLoading,
  isEditMode = false,
  onSubmit,
  onApprove,
  onReject,
  onReview,
}: PoFooterActionProps) {
  const tc = useTranslations("common");
  const t = useTranslations("procurement.purchaseOrder");
  const tfl = useTranslations("field");
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const openConfirm = (config: ConfirmConfig) => setConfirm(config);

  const items = useWatch({ control, name: "items" });
  const docCurrencyCode = useWatch({ control, name: "currency_code" }) ?? "";

  // grand summary — คำนวณ live จาก raw leaf fields (qty = sum locations.order_qty)
  // pattern เดียวกับ po-notes-summary / pr-footer-action
  let subtotal = 0;
  let totalDiscount = 0;
  let totalNet = 0;
  let totalTax = 0;
  let grandTotal = 0;
  for (const item of items ?? []) {
    const p = Number(item?.price ?? 0);
    const q = (item?.locations ?? []).reduce(
      (acc, l) => acc + (Number(l?.order_qty) || 0),
      0,
    );
    const dr = Number(item?.discount_rate ?? 0);
    const tr = Number(item?.tax_rate ?? 0);
    const sub = round2(p * q);
    const disc = round2((sub * dr) / 100);
    const net = round2(sub - disc);
    const tax = round2((net * tr) / 100);
    subtotal += sub;
    totalDiscount += disc;
    totalNet += net;
    totalTax += tax;
    grandTotal += round2(net + tax);
  }
  const summary = { subtotal, totalDiscount, totalNet, totalTax, grandTotal };

  const itemStatuses = items.map((item) =>
    typeof item?.current_stage_status === "string"
      ? item.current_stage_status
      : "",
  );

  const reviewItems: ActionDialogItem[] = items
    .map((item, index) => ({ index, item }))
    .filter(({ item }) => item?.current_stage_status === "review")
    .map(({ index, item }) => ({
      index,
      productName: item?.product_name ?? "",
    }));

  const canSubmit = !!onSubmit && role === STAGE_ROLE.CREATE;

  const isApprover =
    role === STAGE_ROLE.APPROVE && poStatus === PO_STATUS.IN_PROGRESS;
  const poAction = computePoAction(itemStatuses);
  const canApprove = !!onApprove && isApprover && poAction === "approved";
  const canReject = !!onReject && isApprover && poAction === "rejected";
  const canReview = !!onReview && isApprover && poAction === "review";

  const showActions = canSubmit || canApprove || canReject || canReview;
  const hasItems = (items?.length ?? 0) > 0;
  const showBar = isEditMode || showActions || hasItems;

  if (!showBar) return null;

  return (
    <>
      <div
        className={`bg-background sticky bottom-0 z-20 mt-auto flex flex-wrap items-center gap-3 border-t p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:flex-nowrap sm:gap-4 ${hasItems ? "justify-between" : "justify-end"}`}
      >
        {hasItems && (
          <div className="flex items-center gap-4 text-xs tabular-nums">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{tfl("subtotal")}</span>
              <span className="font-semibold">
                {formatCurrency(summary.subtotal)}
              </span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{tfl("discount")}</span>
              <span
                className={
                  summary.totalDiscount > 0
                    ? "text-destructive font-semibold"
                    : "font-semibold"
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
              <span className="font-semibold">
                {formatCurrency(summary.totalNet)}
              </span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{tfl("tax")}</span>
              <span className="font-semibold">
                {formatCurrency(summary.totalTax)}
              </span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold">{tfl("total")}</span>
              <span className="font-semibold">
                {formatCurrency(summary.grandTotal)}
              </span>
              {docCurrencyCode && (
                <span className="text-muted-foreground text-xs font-normal">
                  {docCurrencyCode}
                </span>
              )}
            </div>
          </div>
        )}

        {showActions && (
          <div className="flex shrink-0 items-center gap-2">
            {canSubmit && (
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  openConfirm({
                    title: t("submitTitle"),
                    description: t("submitConfirm"),
                    confirmLabel: tc("submit"),
                    confirmVariant: "info",
                    onConfirm: () => onSubmit?.(),
                  })
                }
              >
                <SendHorizonal aria-hidden="true" />
                {tc("submit")}
              </Button>
            )}
            {canApprove && (
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
                <Check aria-hidden="true" />
                {tc("approve")}
              </Button>
            )}
            {canReject && (
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
                <ThumbsDown aria-hidden="true" />
                {tc("reject")}
              </Button>
            )}
            {canReview && (
              <Button
                type="button"
                size="sm"
                variant="warning"
                disabled={isPending}
                onClick={() => setReviewOpen(true)}
              >
                <Eye aria-hidden="true" />
                {tc("sendBack")}
              </Button>
            )}
          </div>
        )}
      </div>

      <PoActionDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        title={t("reviewTitle")}
        description={t("reviewConfirm")}
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

      <PoActionDialog
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
