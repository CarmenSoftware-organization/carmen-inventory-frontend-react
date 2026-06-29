
import { useTranslations } from "use-intl";
import {
  useCnReasonConfig,
  useDeleteCnReasonConfig,
} from "@/hooks/use-cn-reason-config";
import type { CnReason } from "@/types/cn-reason";
import { ConfigListTemplate } from "@/components/templates/config-list-template";
import { CreditNoteReasonDialog } from "./credit-note-reason-dialog";
import { useCreditNoteReasonTable } from "./use-credit-note-reason-table";
import CreditNoteReasonCard from "./credit-note-reason-card";

/**
 * Component หลักของหน้ารายการ Credit Note Reason ใช้ ConfigListTemplate พร้อม dialog
 * @returns React element ของหน้ารายการ Credit Note Reason
 * @example
 * // route: /config/credit-note-reason
 * <CreditNoteReasonComponent />
 */
export default function CreditNoteReasonComponent() {
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  return (
    <ConfigListTemplate<CnReason>
      translationNamespace="config.creditNoteReason"
      entityNameField="name"
      useList={useCnReasonConfig}
      useDelete={useDeleteCnReasonConfig}
      useTable={useCreditNoteReasonTable}
      defaultSort="name:asc"
      hideStatusFilter
      exportColumns={[
        { header: tfl("name"), value: (r) => r.name, width: 28 },
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
        <CreditNoteReasonDialog
          open={open}
          onOpenChange={onOpenChange}
          reason={entity}
          readOnly={readOnly}
        />
      )}
      renderCard={({ item, index, onEdit }) => (
        <CreditNoteReasonCard item={item} index={index} onEdit={onEdit} />
      )}
    />
  );
}
