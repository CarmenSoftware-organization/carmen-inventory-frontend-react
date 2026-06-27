
import { lazy, Suspense } from "react";
import { useTranslations } from "use-intl";
import { useEcoLabel, useDeleteEcoLabel } from "@/hooks/use-eco-label";
import type { EcoLabel } from "@/types/eco-label";
import { ConfigListTemplate } from "@/components/templates/config-list-template";
import { useEcoLabelTable } from "./use-eco-table";
import EcoLabelCard from "./eco-card";

// แทน next/dynamic ด้วย React.lazy (code-split dialog chunk เหมือนเดิม)
const EcoLabelDialog = lazy(() =>
  import("./eco-dialog").then((mod) => ({ default: mod.EcoLabelDialog })),
);

export default function EcoComponent() {
  const t = useTranslations("config.eco");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  return (
    <ConfigListTemplate<EcoLabel>
      translationNamespace="config.eco"
      entityNameField="name"
      useList={useEcoLabel}
      useDelete={useDeleteEcoLabel}
      useTable={useEcoLabelTable}
      defaultSort="code:asc"
      exportColumns={[
        { header: t("iso"), value: (r) => r.code, width: 16 },
        { header: tfl("name"), value: (r) => r.name, width: 28 },
        {
          header: tfl("status"),
          value: (r) => (r.is_active ? ts("active") : ts("inactive")),
          width: 10,
        },
      ]}
      renderDialog={({ open, onOpenChange, entity, readOnly }) => (
        <Suspense fallback={null}>
          <EcoLabelDialog
            open={open}
            onOpenChange={onOpenChange}
            ecoLabel={entity}
            readOnly={readOnly}
          />
        </Suspense>
      )}
      renderCard={({ item, onEdit, onDelete }) => (
        <EcoLabelCard item={item} onEdit={onEdit} onDelete={onDelete} />
      )}
    />
  );
}
