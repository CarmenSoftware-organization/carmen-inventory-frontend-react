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

  // grand summary — โครง 5 ช่องเหมือน PO (subtotal · discount · net · tax · grand)
  // subtotal = net + discount (net_amount = subtotal − discount ต่อบรรทัดแล้ว)
  let subtotal = 0;
  let totalDiscount = 0;
  let totalNet = 0;
  let totalTax = 0;
  let grandTotal = 0;
  for (const item of items) {
    const net = Number(item?.net_amount ?? 0);
    const disc = Number(item?.discount_amount ?? 0);
    subtotal += net + disc;
    totalDiscount += disc;
    totalNet += net;
    totalTax += Number(item?.tax_amount ?? 0);
    grandTotal += Number(item?.total_amount ?? 0);
  }
  const summary = { subtotal, totalDiscount, totalNet, totalTax, grandTotal };

  return (
    <SummaryFooterBar
      hasRecord={items.length > 0}
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
    />
  );
}
