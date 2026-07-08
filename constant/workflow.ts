import { WORKFLOW_TYPE } from "@/types/workflows";
import { createVariantMap } from "@/constant/status-config";

export const workflowTypeField = [
  { label: "Purchase Request", value: WORKFLOW_TYPE.PR },
  { label: "Store Requisition", value: WORKFLOW_TYPE.SR },
  { label: "Purchase Order", value: WORKFLOW_TYPE.PO },
];

/**
 * Workflow type values as they appear in workflow ROW data (short form).
 * NOTE: the WORKFLOW_TYPE enum holds the long form (`*_workflow`) used by the
 * workflow-type *query* API; list rows return these short values instead.
 */
export const WF_ROW_TYPE = {
  PR: "purchase_request",
  PO: "purchase_order",
  SR: "store_requisition",
} as const;

/**
 * Badge variant per workflow type — semantic `-light` tokens (quiet, single
 * signal per DESIGN.md), distinct color per type: PR=green, PO=amber, SR=blue.
 * Keyed on the short-form row values, with long-form (enum) aliases for safety.
 */
export const WF_TYPE_VARIANT = createVariantMap({
  [WF_ROW_TYPE.PR]: "info",
  [WF_ROW_TYPE.PO]: "warning",
  [WF_ROW_TYPE.SR]: "success",
  [WORKFLOW_TYPE.PR]: "info",
  [WORKFLOW_TYPE.PO]: "warning",
  [WORKFLOW_TYPE.SR]: "success",
});

/**
 * Dot color per workflow type — for the muted "dot badge" (neutral chip +
 * colored dot, per DESIGN.md "avoid neon"), matching `LocationTypeBadge`.
 * Same color semantics as `WF_TYPE_VARIANT`: PR=info, PO=warning, SR=success.
 * Keyed on both short-form row values and long-form (enum) aliases.
 */
export const WF_TYPE_DOT_COLOR: Record<string, string> = {
  [WF_ROW_TYPE.PR]: "bg-info",
  [WF_ROW_TYPE.PO]: "bg-warning",
  [WF_ROW_TYPE.SR]: "bg-success",
  [WORKFLOW_TYPE.PR]: "bg-info",
  [WORKFLOW_TYPE.PO]: "bg-warning",
  [WORKFLOW_TYPE.SR]: "bg-success",
};

type WfI18nFn = (key: string) => string;

export const WORKFLOW_TYPES = [
  { value: WORKFLOW_TYPE.PR, i18nKey: "typePurchaseRequest" },
  { value: WORKFLOW_TYPE.SR, i18nKey: "typeStoreRequisition" },
  { value: WORKFLOW_TYPE.PO, i18nKey: "typePurchaseOrder" },
] as const;

export function getWorkflowTypeOptions(t: WfI18nFn) {
  return WORKFLOW_TYPES.map((tp) => ({
    label: t(tp.i18nKey),
    value: tp.value,
  }));
}

/**
 * i18n key per workflow_type value — covers both short-form row values and
 * long-form (enum) query values so labels resolve in every context.
 */
const WF_TYPE_I18N_KEY: Record<string, string> = {
  [WF_ROW_TYPE.PR]: "typePurchaseRequest",
  [WF_ROW_TYPE.PO]: "typePurchaseOrder",
  [WF_ROW_TYPE.SR]: "typeStoreRequisition",
  [WORKFLOW_TYPE.PR]: "typePurchaseRequest",
  [WORKFLOW_TYPE.PO]: "typePurchaseOrder",
  [WORKFLOW_TYPE.SR]: "typeStoreRequisition",
};

export function getWorkflowTypeLabels(t: WfI18nFn): Record<string, string> {
  return Object.fromEntries(
    Object.entries(WF_TYPE_I18N_KEY).map(([value, key]) => [value, t(key)]),
  );
}
