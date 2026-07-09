import { useTranslations } from "use-intl";
import { useWatch, type Control } from "react-hook-form";
import { formatCurrency } from "@/lib/currency-utils";
import { useCurrency } from "@/hooks/use-currency";
import { SummaryFooterBar } from "@/components/ui/summary-bar";
import type { CnFormValues } from "./cn-form-schema";

interface CnFooterActionProps {
  readonly control: Control<CnFormValues>;
}

export function CnFooterAction({ control }: CnFooterActionProps) {
  const tfl = useTranslations("field");
  const items = useWatch({ control, name: "items" });
  // currency_code เก็บ id → resolve เป็นตัวอักษรสกุลเงินสำหรับต่อท้าย total
  const currencyId = useWatch({ control, name: "currency_code" }) ?? "";
  const { data: currencyData } = useCurrency({ perpage: -1 });
  const currencyCode =
    currencyData?.data?.find((c) => c.id === currencyId)?.code ?? "";

  // CN ไม่มีส่วนลดต่อบรรทัด → net_amount = ยอดก่อนภาษี (subtotal)
  let totalNet = 0;
  let totalTax = 0;
  let grandTotal = 0;
  for (const item of items) {
    totalNet += Number(item?.net_amount ?? 0);
    totalTax += Number(item?.tax_amount ?? 0);
    grandTotal += Number(item?.total_amount ?? 0);
  }
  const summary = { totalNet, totalTax, grandTotal };

  return (
    <SummaryFooterBar
      hasRecord={items.length > 0}
      items={[
        {
          key: "subtotal",
          label: tfl("subtotal"),
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
    />
  );
}
