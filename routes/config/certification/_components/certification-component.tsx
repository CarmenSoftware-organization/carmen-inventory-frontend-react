
import { lazy, Suspense } from "react";
import { useTranslations } from "use-intl";
import {
  useCertification,
  useDeleteCertification,
} from "@/hooks/use-certification";
import type { Certification } from "@/types/certification";
import { ConfigListTemplate } from "@/components/templates/config-list-template";
import { useCertificationTable } from "./use-certification-table";
import CertificationCard from "./certification-card";

// แทน next/dynamic ด้วย React.lazy (code-split dialog chunk เหมือนเดิม)
const CertificationDialog = lazy(() =>
  import("./certification-dialog").then((mod) => ({ default: mod.CertificationDialog })),
);

export default function CertificationComponent() {
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  return (
    <ConfigListTemplate<Certification>
      translationNamespace="config.certification"
      entityNameField="name"
      useList={useCertification}
      useDelete={useDeleteCertification}
      useTable={useCertificationTable}
      defaultSort="code:asc"
      exportColumns={[
        { header: tfl("code"), value: (r) => r.code, width: 16 },
        { header: tfl("name"), value: (r) => r.name, width: 28 },
        {
          header: tfl("status"),
          value: (r) => (r.is_active ? ts("active") : ts("inactive")),
          width: 10,
        },
      ]}
      renderDialog={({ open, onOpenChange, entity, readOnly }) => (
        <Suspense fallback={null}>
          <CertificationDialog
            open={open}
            onOpenChange={onOpenChange}
            certification={entity}
            readOnly={readOnly}
          />
        </Suspense>
      )}
      renderCard={({ item, onEdit, onDelete }) => (
        <CertificationCard item={item} onEdit={onEdit} onDelete={onDelete} />
      )}
    />
  );
}
