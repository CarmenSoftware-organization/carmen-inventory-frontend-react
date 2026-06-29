import { lazy, Suspense } from "react";
import { useTranslations } from "use-intl";
import { useCurrency, useDeleteCurrency } from "@/hooks/use-currency";
import type { Currency } from "@/types/currency";
import { ConfigListTemplate } from "@/components/templates/config-list-template";
import { useCurrencyTable } from "./use-currency-table";
import CurrencyCard from "./currency-card";

// แทน next/dynamic ด้วย React.lazy (code-split dialog chunk เหมือนเดิม)
const CurrencyDialog = lazy(() =>
  import("./currency-dialog").then((mod) => ({ default: mod.CurrencyDialog })),
);

/**
 * Component หลักของหน้ารายการ Currency ใช้ ConfigListTemplate พร้อม dialog
 * @returns React element ของหน้ารายการ Currency
 * @example
 * // route: /config/currency
 * <CurrencyComponent />
 */
export default function CurrencyComponent() {
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  return (
    <ConfigListTemplate<Currency>
      translationNamespace="config.currency"
      entityNameField="code"
      useList={useCurrency}
      useDelete={useDeleteCurrency}
      useTable={useCurrencyTable}
      permissionPrefix="configuration.currency"
      defaultSort="code:asc"
      exportColumns={[
        { header: tfl("code"), value: (r) => r.code, width: 10 },
        { header: tfl("name"), value: (r) => r.name, width: 24 },
        { header: tfl("symbol"), value: (r) => r.symbol ?? "", width: 8 },
        {
          header: tfl("exchangeRate"),
          value: (r) => r.exchange_rate ?? 0,
          width: 14,
        },
        {
          header: tfl("decimalPlaces"),
          value: (r) => r.decimal_places ?? 0,
          width: 10,
        },
        {
          header: tfl("description"),
          value: (r) => r.description ?? "",
          width: 32,
        },
        {
          header: tfl("status"),
          value: (r) => (r.is_active ? ts("active") : ts("inactive")),
          width: 10,
        },
      ]}
      renderDialog={({ open, onOpenChange, entity, readOnly }) => (
        <Suspense fallback={null}>
          <CurrencyDialog
            open={open}
            onOpenChange={onOpenChange}
            currency={entity}
            readOnly={readOnly}
          />
        </Suspense>
      )}
      renderCard={({ item, index, onEdit }) => (
        <CurrencyCard item={item} index={index} onEdit={onEdit} />
      )}
    />
  );
}
