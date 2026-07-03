import { useTranslations } from "use-intl";
import type { UseFormReturn } from "react-hook-form";
import { EyeBrow } from "@/components/ui/eye-brow";
import type { GrnFormValues } from "./grn-form-schema";
import GrnTaxDiscountFields from "./grn-tax-discount-fields";
import GrnDetailFields from "./grn-detail-fields";

interface GrnLocationExpandedProps {
  readonly form: UseFormReturn<GrnFormValues>;
  readonly index: number;
  readonly disabled: boolean;
  /** view mode → Pricing/Details แสดงเป็น plain text */
  readonly plainText?: boolean;
}

/**
 * เนื้อหาแถวที่ expand ของ GRN item — Pricing + Details
 * (Quantity ย้ายไปอยู่ line เดียวกับ location แล้ว; reuse GrnTab* เดิม)
 */
export function GrnLocationExpanded({
  form,
  index,
  disabled,
  plainText = false,
}: GrnLocationExpandedProps) {
  const tfl = useTranslations("field");
  return (
    // pl-[2.375rem] = pl-3 (12px) + chevron (size-4=16px) + gap-2.5 (10px)
    // → indent เนื้อหาให้ตรงแนวเดียวกับ location ในแถว collapsed
    <div className="space-y-4 px-4 pt-2 pb-4 pl-9.5">
      <section className="space-y-2">
        <EyeBrow>{tfl("taxDiscount")}</EyeBrow>
        <GrnTaxDiscountFields
          form={form}
          index={index}
          disabled={disabled}
          plainText={plainText}
        />
      </section>

      <section className="space-y-2 border-t pt-3">
        <EyeBrow>{tfl("details")}</EyeBrow>
        <GrnDetailFields
          form={form}
          index={index}
          disabled={disabled}
          plainText={plainText}
        />
      </section>
    </div>
  );
}
