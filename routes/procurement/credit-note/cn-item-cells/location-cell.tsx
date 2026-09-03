import { useWatch, type Control } from "react-hook-form";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import type { CnFormValues } from "../cn-form-schema";

/** Location — plain text เสมอ (เลือกจาก dialog แล้ว) */
export function LocationCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const locationName =
    useWatch({ control, name: `items.${index}.location_name` }) ?? "";
  const locationCode =
    useWatch({ control, name: `items.${index}.location_code` }) ?? "";
  return <NameWithSubtext primary={locationName} secondary={locationCode} />;
}
