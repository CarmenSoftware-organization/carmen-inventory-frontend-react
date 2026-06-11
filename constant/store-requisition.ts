import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";
import { SR_TYPE, type StoreRequisitionType } from "@/types/store-requisition";
import {
  createStatusConfig,
  createStatusFilterOptions,
} from "./status-config";

export const SR_LIST_PATH = "/store-operation/store-requisition";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export const SR_TYPE_VARIANT: Record<StoreRequisitionType, BadgeVariant> = {
  [SR_TYPE.TRANSFER]: "info-light",
  [SR_TYPE.ISSUE]: "warning-light",
};

/** Badge variant สำหรับ per-item stage_status */
export const SR_STAGE_BADGE_VARIANT: Record<string, BadgeVariant> = {
  approve: "success",
  approved: "success",
  reject: "destructive",
  rejected: "destructive",
  review: "warning",
  submit: "info",
  submitted: "info",
};

/** Badge className + label for SR document-level status */
export const SR_STATUS_CONFIG = createStatusConfig([
  "draft",
  "in_progress",
  "completed",
  "cancelled",
  "voided",
] as const);

/** Badge className + label for workflow history actions */
export const SR_WORKFLOW_ACTION_CONFIG = createStatusConfig([
  "wf_submitted",
  "wf_approved",
  "wf_rejected",
  "wf_sent_back",
  "wf_reviewed",
] as const);

export const STORE_REQUISITION_STATUS_OPTIONS = createStatusFilterOptions(
  "doc_status",
  SR_STATUS_CONFIG,
);
