import { useTranslations } from "use-intl";
import type { UseFormReturn, FieldArrayWithId } from "react-hook-form";
import type { CnFormValues } from "./cn-form-schema";
import CnTabPricing from "./cn-tab-pricing";
import CnTabDetails from "./cn-tab-details";

export type CnItemField = FieldArrayWithId<CnFormValues, "items", "id">;

const EYEBROW =
  "text-muted-foreground text-[0.625rem] font-semibold tracking-wider uppercase";

interface CnItemExpandedProps {
  readonly item: CnItemField;
  readonly form: UseFormReturn<CnFormValues>;
  readonly itemFields: CnItemField[];
  readonly disabled: boolean;
  /** % ของความกว้าง table ที่ต้อง indent ให้ตรงขอบซ้าย column Product */
  readonly leftInsetPct: number;
}

/** เนื้อหาแถวที่ expand ของ CN item — Pricing + Details (reuse CnTab* เดิม) */
export function CnItemExpanded({
  item,
  form,
  itemFields,
  disabled,
  leftInsetPct,
}: CnItemExpandedProps) {
  const tfl = useTranslations("field");
  const index = Math.max(
    itemFields.findIndex((f) => f.id === item.id),
    0,
  );
  return (
    // w-0 min-w-full → เนื้อหา expand กว้างเท่า table (ไม่ดัน column ให้ยืด)
    // paddingLeft = % ให้ตรงขอบ column Product + 0.75rem (px-3 ของ cell) ให้ตรงตัวอักษร
    <div
      className="w-0 min-w-full space-y-4 overflow-x-auto py-3 pr-4"
      style={{ paddingLeft: `calc(${leftInsetPct}% + 0.75rem)` }}
    >
      <section className="space-y-2">
        <p className={EYEBROW}>{tfl("pricing")}</p>
        <CnTabPricing form={form} index={index} disabled={disabled} />
      </section>
      <section className="space-y-2 border-t pt-3">
        <p className={EYEBROW}>{tfl("details")}</p>
        <CnTabDetails form={form} index={index} disabled={disabled} />
      </section>
    </div>
  );
}
