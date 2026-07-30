import { useFormatter, useTranslations } from "use-intl";
import { useWatch, type useForm } from "react-hook-form";
import { SummaryFooterBar } from "@/components/ui/summary-bar";
import { useProfile } from "@/hooks/use-profile";
import type { AdjFormValues } from "./ia-form-schema";

interface AdjSummaryFooterProps {
  readonly form: ReturnType<typeof useForm<AdjFormValues>>;
  readonly formatter: ReturnType<typeof useFormatter>;
  readonly t: ReturnType<typeof useTranslations>;
}

/**
 * แถบสรุปท้ายฟอร์ม — ยอดรวมอย่างเดียว
 *
 * ของเดิมเป็น sidebar ติดขวา 20rem ที่เอา status/วันที่/เหตุผล/คลัง มาโชว์ซ้ำกับ
 * hero และ document info อยู่แล้ว ย้ายลง `SummaryFooterBar` ตำแหน่งเดียวกับ
 * PR/PO/GRN/CN/SR แล้วคืนความกว้างให้ตารางรายการ · ขนาด/สไตล์ตาม PO เป๊ะ
 * (`emphasis` + suffix เป็นรหัสสกุลเงิน ไม่ override ขนาดเอง)
 */
export function AdjSummaryFooter({
  form,
  formatter,
  t,
}: AdjSummaryFooterProps) {
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const { defaultCurrencyCode } = useProfile();

  const grandTotal = items.reduce(
    (sum, it) => sum + (Number(it.total_cost) || 0),
    0,
  );

  // ยังไม่มีรายการ = ไม่มีอะไรให้สรุป — ไม่ต้องมีแถบเปล่าค้างอยู่ก้นจอ
  if (items.length === 0) return null;

  return (
    <SummaryFooterBar
      hasRecord
      items={[
        {
          key: "grandTotal",
          label: t("grandTotal"),
          value: formatter.number(grandTotal, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          emphasis: true,
          suffix: defaultCurrencyCode,
        },
      ]}
    />
  );
}
