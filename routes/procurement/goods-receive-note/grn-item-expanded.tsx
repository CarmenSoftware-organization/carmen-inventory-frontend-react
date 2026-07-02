import { useTranslations } from "use-intl";
import type { UseFormReturn } from "react-hook-form";
import type { GrnFormValues } from "./grn-form-schema";
import GrnTabPricing from "./grn-tab-pricing";
import GrnTabDetails from "./grn-tab-details";

const EYEBROW =
  "text-muted-foreground text-[0.625rem] font-semibold tracking-wider uppercase";

interface GrnItemExpandedProps {
  readonly form: UseFormReturn<GrnFormValues>;
  readonly index: number;
  readonly disabled: boolean;
}

/**
 * เนื้อหาแถวที่ expand ของ GRN item — Pricing + Details
 * (Quantity ย้ายไปอยู่ line เดียวกับ location แล้ว; reuse GrnTab* เดิม)
 */
export function GrnItemExpanded({
  form,
  index,
  disabled,
}: GrnItemExpandedProps) {
  const tfl = useTranslations("field");
  return (
    // pl-[2.375rem] = pl-3 (12px) + chevron (size-4=16px) + gap-2.5 (10px)
    // → indent เนื้อหาให้ตรงแนวเดียวกับ location ในแถว collapsed
    <div className="space-y-4 px-4 pt-2 pb-4 pl-[2.375rem]">
      <section className="space-y-2">
        <p className={EYEBROW}>{tfl("pricing")}</p>
        <GrnTabPricing form={form} index={index} disabled={disabled} />
      </section>

      <section className="space-y-2 border-t pt-3">
        <p className={EYEBROW}>{tfl("details")}</p>
        <GrnTabDetails form={form} index={index} disabled={disabled} />
      </section>
    </div>
  );
}
