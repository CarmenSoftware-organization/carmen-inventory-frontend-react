import { WORKFLOW_TYPE } from "@/types/workflows";

export const workflowTypeField = [
  { label: "Purchase Request", value: WORKFLOW_TYPE.PR },
  { label: "Store Requisition", value: WORKFLOW_TYPE.SR },
  { label: "Purchase Order", value: WORKFLOW_TYPE.PO },
];

export const WF_ROW_TYPE = {
  PR: "purchase_request",
  PO: "purchase_order",
  SR: "store_requisition",
} as const;

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
