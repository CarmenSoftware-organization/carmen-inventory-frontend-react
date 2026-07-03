import { useState } from "react";
import { useTranslations } from "use-intl";
import { useWatch, type Control } from "react-hook-form";
import { Check, Eye, SendHorizonal, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import { SummaryFooterBar } from "@/components/ui/summary-bar";
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
      <SummaryFooterBar
        hasRecord={hasItems}
        items={[
          {
            key: "price",
            label: tfl("price"),
            value: formatCurrency(summary.subtotal),
          },
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
                ? "text-destructive font-semibold"
                : "font-semibold",
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
            suffix: docCurrencyCode,
          },
        ]}
      >
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
      </SummaryFooterBar>

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
