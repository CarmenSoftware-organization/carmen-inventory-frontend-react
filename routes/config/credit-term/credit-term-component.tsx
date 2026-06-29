
import { useTranslations } from "use-intl";
import { useCreditTerm, useDeleteCreditTerm } from "@/hooks/use-credit-term";
import type { CreditTerm } from "@/types/credit-term";
import { ConfigListTemplate } from "@/components/templates/config-list-template";
import { CreditTermDialog } from "./credit-term-dialog";
import { useCreditTermTable } from "./use-credit-term-table";
import CreditTermCard from "./credit-term-card";

/**
 * Component หลักของหน้ารายการ Credit Term ใช้ ConfigListTemplate พร้อม dialog
 * @returns React element ของหน้ารายการ Credit Term
 * @example
 * // route: /config/credit-term
 * <CreditTermComponent />
 */
export default function CreditTermComponent() {
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  return (
    <ConfigListTemplate<CreditTerm>
      translationNamespace="config.creditTerm"
      entityNameField="name"
      useList={useCreditTerm}
      useDelete={useDeleteCreditTerm}
      useTable={useCreditTermTable}
      defaultSort="name:asc"
      exportColumns={[
        { header: tfl("name"), value: (r) => r.name, width: 24 },
        {
          header: tfl("creditTermDays"),
          value: (r) => r.value ?? 0,
          width: 12,
        },
        {
          header: tfl("description"),
          value: (r) => r.description ?? "",
          width: 40,
        },
        {
          header: tfl("status"),
          value: (r) => (r.is_active ? ts("active") : ts("inactive")),
          width: 10,
        },
      ]}
      renderDialog={({ open, onOpenChange, entity, readOnly }) => (
        <CreditTermDialog
          open={open}
          onOpenChange={onOpenChange}
          creditTerm={entity}
          readOnly={readOnly}
        />
      )}
      renderCard={({ item, index, onEdit }) => (
        <CreditTermCard item={item} index={index} onEdit={onEdit} />
      )}
    />
  );
}
