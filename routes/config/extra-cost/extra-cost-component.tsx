
import { lazy, Suspense } from "react";
import { useTranslations } from "use-intl";
import { useExtraCost, useDeleteExtraCost } from "@/hooks/use-extra-cost";
import type { ExtraCost } from "@/types/extra-cost";
import { ConfigListTemplate } from "@/components/templates/config-list-template";
import { useExtraCostTable } from "./use-extra-cost-table";
import ExtraCostCard from "./extra-cost-card";

// แทน next/dynamic ด้วย React.lazy (code-split dialog chunk เหมือนเดิม)
const ExtraCostDialog = lazy(() =>
  import("./extra-cost-dialog").then((mod) => ({ default: mod.ExtraCostDialog })),
);

/**
 * Component หลักของหน้ารายการ Extra Cost ใช้ ConfigListTemplate พร้อม dialog
 * @returns React element ของหน้ารายการ Extra Cost
 * @example
 * // route: /config/extra-cost
 * <ExtraCostComponent />
 */
export default function ExtraCostComponent() {
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  return (
    <ConfigListTemplate<ExtraCost>
      translationNamespace="config.extraCost"
      entityNameField="name"
      useList={useExtraCost}
      useDelete={useDeleteExtraCost}
      useTable={useExtraCostTable}
      permissionPrefix="configuration.extra_cost"
      defaultSort="name:asc"
      exportColumns={[
        { header: tfl("name"), value: (r) => r.name, width: 28 },
        {
          header: tfl("status"),
          value: (r) => (r.is_active ? ts("active") : ts("inactive")),
          width: 10,
        },
      ]}
      renderDialog={({ open, onOpenChange, entity, readOnly }) => (
        <Suspense fallback={null}>
          <ExtraCostDialog
            open={open}
            onOpenChange={onOpenChange}
            extraCost={entity}
            readOnly={readOnly}
          />
        </Suspense>
      )}
      renderCard={({ item, index, onEdit }) => (
        <ExtraCostCard item={item} index={index} onEdit={onEdit} />
      )}
    />
  );
}
