import { useWatch, type UseFormReturn, type Control } from "react-hook-form";
import { memo } from "react";
import { Clock, Check, X, Eye, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PR_ITEM_STATUS_CONFIG } from "@/constant/purchase-request";
import { STAGE_ROLE } from "@/types/stage-role";
import { PR_ITEM_STAGE_STATUS } from "@/types/purchase-request";
import type { PrFormValues } from "../pr-form-schema";
import { STATUS_NORMALIZE } from "./helpers";

// ไอคอนในวงกลม solid bg แบบ workflow-step — สีจาก globals.css semantic tokens
const STATUS_STYLE: Record<string, { icon: LucideIcon; className: string }> = {
  // bg สว่าง (info/success/warning) → icon สีดำอ่านชัดกว่า *-foreground
  pending: { icon: Clock, className: "bg-info text-black" },
  approved: { icon: Check, className: "bg-success text-black" },
  rejected: {
    icon: X,
    className: "bg-destructive text-destructive-foreground",
  },
  review: { icon: Eye, className: "bg-warning text-black" },
};

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
  "use no memo";
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

  const statusStyle = STATUS_STYLE[normalizedStatus] ?? STATUS_STYLE.pending;
  const Icon = statusStyle.icon;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded-full",
              statusStyle.className,
            )}
            aria-label={config.label}
          >
            <Icon className="size-2.5" strokeWidth={2.75} aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          <span>{config.label}</span>
          {showReset && (
            <button
              type="button"
              aria-label="Reset status"
              title="Clear"
              className="text-muted-foreground hover:text-foreground inline-flex items-center rounded focus-visible:outline-none"
              onClick={handleReset}
            >
              <X className="size-3.5" />
            </button>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
