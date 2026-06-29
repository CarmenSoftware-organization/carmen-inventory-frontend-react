
import { lazy, Suspense } from "react";
import { useTranslations } from "use-intl";
import { useTaxProfile, useDeleteTaxProfile } from "@/hooks/use-tax-profile";
import type { TaxProfile } from "@/types/tax-profile";
import { ConfigListTemplate } from "@/components/templates/config-list-template";
import { useTaxProfileTable } from "./use-tax-profile-table";
import TaxProfileCard from "./tax-profile-card";

// แทน next/dynamic ด้วย React.lazy (code-split dialog chunk เหมือนเดิม)
const TaxProfileDialog = lazy(() =>
  import("./tax-profile-dialog").then((mod) => ({ default: mod.TaxProfileDialog })),
);

/**
 * Component หลักของหน้ารายการ Tax Profile ใช้ ConfigListTemplate พร้อม dialog
 * @returns React element ของหน้ารายการ Tax Profile
 * @example
 * // route: /config/tax-profile
 * <TaxProfileComponent />
 */
export default function TaxProfileComponent() {
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  return (
    <ConfigListTemplate<TaxProfile>
      translationNamespace="config.taxProfile"
      entityNameField="name"
      useList={useTaxProfile}
      useDelete={useDeleteTaxProfile}
      useTable={useTaxProfileTable}
      permissionPrefix="configuration.tax_profile"
      defaultSort="tax_rate:asc"
      exportColumns={[
        { header: tfl("name"), value: (r) => r.name, width: 28 },
        {
          header: tfl("taxRate"),
          value: (r) => r.tax_rate ?? 0,
          width: 12,
        },
        {
          header: tfl("status"),
          value: (r) => (r.is_active ? ts("active") : ts("inactive")),
          width: 10,
        },
      ]}
      renderDialog={({ open, onOpenChange, entity, readOnly }) => (
        <Suspense fallback={null}>
          <TaxProfileDialog
            open={open}
            onOpenChange={onOpenChange}
            taxProfile={entity}
            readOnly={readOnly}
          />
        </Suspense>
      )}
      renderCard={({ item, index, onEdit }) => (
        <TaxProfileCard item={item} index={index} onEdit={onEdit} />
      )}
    />
  );
}
