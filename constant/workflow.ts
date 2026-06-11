import { WORKFLOW_TYPE } from "@/types/workflows";
import { createStatusConfig } from "@/constant/status-config";

export const workflowTypeField = [
  { label: "Purchase Request", value: WORKFLOW_TYPE.PR },
  { label: "Store Requisition", value: WORKFLOW_TYPE.SR },
  { label: "Purchase Order", value: WORKFLOW_TYPE.PO },
];

export const WF_TYPE_CONFIG = createStatusConfig(
  [WORKFLOW_TYPE.PR, WORKFLOW_TYPE.PO, WORKFLOW_TYPE.SR] as const,
);

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

export function getWorkflowTypeLabels(t: WfI18nFn): Record<string, string> {
  return Object.fromEntries(
    WORKFLOW_TYPES.map((tp) => [tp.value, t(tp.i18nKey)]),
  );
}
