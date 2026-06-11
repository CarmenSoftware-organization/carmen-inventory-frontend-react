import { createLabelGetter } from "@/lib/i18n/label-map";

export type GrnDocType = "purchase_order" | "manual";

const GRN_DOC_TYPE_LABEL_KEYS = {
  purchase_order: "purchaseOrder",
  manual: "manual",
} as const satisfies Record<GrnDocType, string>;

export const getGrnDocTypeLabel = createLabelGetter(
  GRN_DOC_TYPE_LABEL_KEYS,
  "purchase_order",
);
