import { WORKFLOW_TYPE } from "@/types/workflows";
import { createVariantMap } from "@/constant/status-config";

export const workflowTypeField = [
  { label: "Purchase Request", value: WORKFLOW_TYPE.PR },
  { label: "Store Requisition", value: WORKFLOW_TYPE.SR },
  { label: "Purchase Order", value: WORKFLOW_TYPE.PO },
];

/**
 * Workflow type values as they appear in workflow ROW data.
 * These match the `WORKFLOW_TYPE` enum values one-to-one (both are the short
 * `purchase_request`/`purchase_order`/`store_requisition` form), so a map keyed
 * on these values also resolves lookups done with the enum.
 */
export const WF_ROW_TYPE = {
  PR: "purchase_request",
  PO: "purchase_order",
  SR: "store_requisition",
} as const;

/**
 * Badge variant per workflow type — semantic `-light` tokens (quiet, single
 * signal per DESIGN.md), distinct color per type: PR=green, PO=amber, SR=blue.
 * Keyed on the row values, which equal the `WORKFLOW_TYPE` enum values.
 */
export const WF_TYPE_VARIANT = createVariantMap({
  [WF_ROW_TYPE.PR]: "info",
  [WF_ROW_TYPE.PO]: "warning",
  [WF_ROW_TYPE.SR]: "success",
});

/**
 * Dot color per workflow type — for the muted "dot badge" (neutral chip +
 * colored dot, per DESIGN.md "avoid neon"), matching `LocationTypeBadge`.
 * Same color semantics as `WF_TYPE_VARIANT`: PR=info, PO=warning, SR=success.
 */
export const WF_TYPE_DOT_COLOR: Record<string, string> = {
  [WF_ROW_TYPE.PR]: "bg-info",
  [WF_ROW_TYPE.PO]: "bg-warning",
  [WF_ROW_TYPE.SR]: "bg-success",
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
 * i18n key per workflow_type value — keyed on the row values, which equal the
 * `WORKFLOW_TYPE` enum values, so labels resolve in every context.
 */
const WF_TYPE_I18N_KEY: Record<string, string> = {
  [WF_ROW_TYPE.PR]: "typePurchaseRequest",
  [WF_ROW_TYPE.PO]: "typePurchaseOrder",
  [WF_ROW_TYPE.SR]: "typeStoreRequisition",
};

export function getWorkflowTypeLabels(t: WfI18nFn): Record<string, string> {
  return Object.fromEntries(
    Object.entries(WF_TYPE_I18N_KEY).map(([value, key]) => [value, t(key)]),
  );
}
