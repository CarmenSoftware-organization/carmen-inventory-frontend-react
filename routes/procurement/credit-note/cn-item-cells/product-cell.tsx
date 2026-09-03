import { useWatch, type Control } from "react-hook-form";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import type { CnFormValues } from "../cn-form-schema";

/** Product — plain text เสมอ (เลือกจาก dialog แล้ว) */
export function ProductCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const itemName =
    useWatch({ control, name: `items.${index}.item_name` }) ?? "";
  const productLocalName =
    useWatch({ control, name: `items.${index}.item_local_name` }) ?? "";
  return <NameWithSubtext primary={itemName} secondary={productLocalName} />;
}
