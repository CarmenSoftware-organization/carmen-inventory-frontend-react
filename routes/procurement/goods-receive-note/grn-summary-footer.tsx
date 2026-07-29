import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import { SummaryFooterBar } from "@/components/ui/summary-bar";
import { useCurrency } from "@/hooks/use-currency";
import type { GrnFormValues } from "./grn-form-schema";
import { GrnFooterAction } from "./grn-footer-action";

interface GrnSummaryFooterProps {
  readonly form: UseFormReturn<GrnFormValues>;
  readonly isActionPending: boolean;
  readonly hasRecord: boolean;
  readonly isView: boolean;
  readonly isCommitted: boolean;
  readonly isVoid: boolean;
  readonly onCommit: () => void;
  readonly onVoid: () => void;
}

/**
 * แถบสรุปยอด + ปุ่ม commit/void ท้ายฟอร์ม — watch `items` เองในนี้ (mirror
 * po-footer-action) เพื่อ**ไม่ให้ GrnForm root re-render ทุก keystroke**: การ watch
 * ทั้ง items array ที่ระดับ form ทำให้ item table subtree churn → product lookup ของ
 * row ที่เพิ่งเพิ่ม (defaultOpen) remount แล้วเด้ง focus ออกจากช่องที่กำลังพิมพ์
 */
export function GrnSummaryFooter({
  form,
  isActionPending,
  hasRecord,
  isView,
  isCommitted,
  isVoid,
  onCommit,
  onVoid,
}: GrnSummaryFooterProps) {
  "use no memo";
  const tfl = useTranslations("field");

  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const currencyId = useWatch({ control: form.control, name: "currency_id" });
  const currencyName =
    useWatch({ control: form.control, name: "currency_name" }) ?? "";

  const { data: currencyData } = useCurrency({ perpage: -1 });
  const currencies = currencyData?.data?.filter((c) => c.is_active) ?? [];
  const currencyCode =
    currencies.find((c) => c.id === currencyId)?.code || currencyName;

  // grand summary — รวมยอดจากทุก item (net/discount/tax/total ที่คำนวณไว้แล้ว)
  let totalDiscount = 0;
  let totalNet = 0;
  let totalTax = 0;
  let grandTotal = 0;
  for (const it of items) {
    totalDiscount += Number(it?.discount_amount) || 0;
    totalNet += Number(it?.net_amount) || 0;
    totalTax += Number(it?.tax_amount) || 0;
    grandTotal += Number(it?.total_price) || 0;
  }
  const summary = {
    subtotal: round2(totalNet + totalDiscount),
    totalDiscount: round2(totalDiscount),
    totalNet: round2(totalNet),
    totalTax: round2(totalTax),
    grandTotal: round2(grandTotal),
  };

  if (items.length === 0) return null;

  return (
    <SummaryFooterBar
      hasRecord
      items={[
        {
          key: "subtotal",
          label: tfl("subtotal"),
          value: formatCurrency(summary.subtotal),
        },
        {
          key: "discount",
          label: tfl("discount"),
          value:
            summary.totalDiscount > 0
              ? `-${formatCurrency(summary.totalDiscount)}`
              : formatCurrency(0),
          valueClassName:
            summary.totalDiscount > 0
              ? "text-destructive font-semibold"
              : "font-semibold",
        },
        {
          key: "net",
          label: tfl("net"),
          value: formatCurrency(summary.totalNet),
        },
        {
          key: "tax",
          label: tfl("tax"),
          value: formatCurrency(summary.totalTax),
        },
        {
          key: "grandTotal",
          label: tfl("grandTotal"),
          value: formatCurrency(summary.grandTotal),
          emphasis: true,
          suffix: currencyCode,
        },
      ]}
    >
      {/* commit/void อยู่ line เดียวกับ summary (ขวาล่าง เหมือน PR footer) */}
      <GrnFooterAction
        isActionPending={isActionPending}
        hasRecord={hasRecord}
        isView={isView}
        isCommitted={isCommitted}
        isVoid={isVoid}
        onCommit={onCommit}
        onVoid={onVoid}
      />
    </SummaryFooterBar>
  );
}
