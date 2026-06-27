"use no memo";

import { useWatch, type UseFormReturn, type Control } from "react-hook-form";
import { memo } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PR_ITEM_STATUS_CONFIG } from "@/constant/purchase-request";
import { STAGE_ROLE } from "@/types/stage-role";
import { PR_ITEM_STAGE_STATUS } from "@/types/purchase-request";
import type { PrFormValues } from "../pr-form-schema";
import { STATUS_NORMALIZE } from "./helpers";

export const StatusCell = memo(function StatusCell({
  control,
  form,
  index,
  role,
}: {
  control: Control<PrFormValues>;
  form?: UseFormReturn<PrFormValues>;
  index: number;
  role?: string;
}) {
  const currentStageStatus =
    useWatch({ control, name: `items.${index}.current_stage_status` }) ?? "";
  const initialStageStatus =
    useWatch({ control, name: `items.${index}._initial_stage_status` }) ?? "";

  const normalizedStatus =
    STATUS_NORMALIZE[currentStageStatus] ?? currentStageStatus;
  const initialNormalized =
    STATUS_NORMALIZE[initialStageStatus] ?? initialStageStatus;
  const config =
    PR_ITEM_STATUS_CONFIG[normalizedStatus] ?? PR_ITEM_STATUS_CONFIG.pending;

  const canEdit =
    !!form && (role === STAGE_ROLE.APPROVE || role === STAGE_ROLE.PURCHASE);

  const isLockedFromServer =
    initialNormalized === PR_ITEM_STAGE_STATUS.APPROVED ||
    initialNormalized === PR_ITEM_STAGE_STATUS.REJECTED;

  const handleReset = () => {
    form?.setValue(`items.${index}.stage_status`, PR_ITEM_STAGE_STATUS.PENDING);
    form?.setValue(
      `items.${index}.current_stage_status`,
      PR_ITEM_STAGE_STATUS.PENDING,
    );
  };

  if (!currentStageStatus) return null;

  const showReset =
    canEdit &&
    !isLockedFromServer &&
    (normalizedStatus === PR_ITEM_STAGE_STATUS.APPROVED ||
      normalizedStatus === PR_ITEM_STAGE_STATUS.REJECTED ||
      normalizedStatus === PR_ITEM_STAGE_STATUS.REVIEW);

  return (
    <Badge
      className={`${config.className} inline-flex items-center gap-1`}
      size="xs"
    >
      {config.label}
      {showReset && (
        <button
          type="button"
          aria-label="Reset status"
          className="rounded-full opacity-60 hover:opacity-100 focus-visible:outline-none"
          onClick={handleReset}
        >
          <X className="size-2.5" />
        </button>
      )}
    </Badge>
  );
});
