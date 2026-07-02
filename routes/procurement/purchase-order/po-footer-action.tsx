import { useState } from "react";
import { useTranslations } from "use-intl";
import { useWatch, type Control } from "react-hook-form";
import { Check, Eye, Info, SendHorizonal, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const openConfirm = (config: ConfirmConfig) => setConfirm(config);

  const items = useWatch({ control, name: "items" });

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
  const showBar = isEditMode || showActions;

  if (!showBar) return null;

  return (
    <>
      <div className="bg-background sticky bottom-0 z-20 mt-auto flex flex-wrap items-center justify-between gap-3 border-t p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-nowrap sm:gap-4">
        {isEditMode && (
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
            <Info className="size-3.5" aria-hidden="true" />
            {t("totalsRecalc")}
          </span>
        )}
        <span className="flex-1" />

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
