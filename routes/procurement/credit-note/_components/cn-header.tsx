
import { useTranslations } from "use-intl";
import { MessageSquare, Pencil, Save, SendHorizonal, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PrintDocumentButton } from "@/components/print-document-button";
import { useCan } from "@/hooks/use-can";
import { usePermissionPrefix } from "@/hooks/use-permission-prefix";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { buildPermissionKey } from "@/constant/permissions";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import type { FormMode } from "@/types/form";
import { CN_STATUS, type CreditNote } from "@/types/credit-note";
import { CN_STATUS_CONFIG } from "@/constant/credit-note";
import {
  DocFormHeader,
  DocumentRibbon,
  RibbonCell,
} from "@/components/share/doc-form-header";

interface CnHeaderProps {
  readonly creditNote?: CreditNote;
  readonly mode: FormMode;
  readonly isPending: boolean;
  readonly deleteIsPending: boolean;
  readonly isLocked: boolean;
  /** display only — ไม่เข้า payload */
  readonly createdByName: string;
  readonly cnDate?: string;
  readonly dateFormat: string;
  readonly onBack: () => void;
  readonly onEnterEdit: () => void;
  readonly onCancel: () => void;
  readonly onShowDelete: () => void;
  readonly onShowComment: () => void;
  readonly onSubmitCn: () => void;
}

/**
 * Header ของฟอร์ม Credit Note — ใช้ `DocFormHeader` กลางร่วมกับ PO/PR/GRN
 * คง permission guard (save/edit/delete ผ่าน useCan) จาก FormToolbar เดิมไว้
 */
export function CnHeader({
  creditNote,
  mode,
  isPending,
  deleteIsPending,
  isLocked,
  createdByName,
  cnDate,
  dateFormat,
  onBack,
  onEnterEdit,
  onCancel,
  onShowDelete,
  onShowComment,
  onSubmitCn,
}: CnHeaderProps) {
  const t = useTranslations("procurement.creditNote");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  const { can, isAdmin } = useCan();
  const prefix = usePermissionPrefix();
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const savePermission = prefix
    ? buildPermissionKey(prefix, isAdd ? "create" : "update")
    : undefined;
  const updatePermission = prefix
    ? buildPermissionKey(prefix, "update")
    : undefined;
  const deletePermission = prefix
    ? buildPermissionKey(prefix, "delete")
    : undefined;
  const saveDenied = !!savePermission && !isAdmin && !can(savePermission);
  const editDenied = !!updatePermission && !isAdmin && !can(updatePermission);
  const deleteDenied =
    !!deletePermission && !isAdmin && !can(deletePermission);

  const statusCfg = creditNote
    ? CN_STATUS_CONFIG[creditNote.doc_status]
    : null;
  const typeLabel =
    creditNote?.credit_note_type === "amount_discount"
      ? t("amountDiscount")
      : t("quantityReturn");

  const badges = (
    <>
      {statusCfg && (
        <Badge className={statusCfg.className} size="sm">
          {statusCfg.label ?? creditNote?.doc_status}
        </Badge>
      )}
      {creditNote && (
        <Badge variant="info-light" size="sm">
          {typeLabel}
        </Badge>
      )}
    </>
  );

  const actions = (
    <>
      {/* View — submit (draft) + edit */}
      {isView && !isLocked && (
        <>
          {creditNote?.doc_status === CN_STATUS.DRAFT && (
            <Button
              type="button"
              size="sm"
              variant="info"
              disabled={isPending}
              onClick={onSubmitCn}
            >
              <SendHorizonal aria-hidden="true" />
              {tc("submit")}
            </Button>
          )}
          <Button
            size="sm"
            onClick={
              editDenied
                ? () => dispatchPermissionDenied(updatePermission)
                : onEnterEdit
            }
            aria-disabled={editDenied || undefined}
            className={cn(editDenied && "opacity-50")}
          >
            <Pencil aria-hidden="true" />
            {tc("edit")}
          </Button>
        </>
      )}

      {/* Edit / add — cancel + save + delete */}
      {!isView && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
          >
            <X aria-hidden="true" />
            {tc("cancel")}
          </Button>
          {saveDenied ? (
            <Button
              type="button"
              size="sm"
              onClick={() => dispatchPermissionDenied(savePermission)}
              aria-disabled
              className="opacity-50"
            >
              <Save aria-hidden="true" />
              {isAdd ? tc("create") : tc("save")}
            </Button>
          ) : (
            <Button type="submit" form="cn-form" size="sm" disabled={isPending}>
              <Save aria-hidden="true" />
              {isAdd ? tc("create") : tc("save")}
            </Button>
          )}
          {isEdit && creditNote && !isLocked && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={
                deleteDenied
                  ? () => dispatchPermissionDenied(deletePermission)
                  : onShowDelete
              }
              disabled={!deleteDenied && (isPending || deleteIsPending)}
              aria-disabled={deleteDenied || undefined}
              className={cn(deleteDenied && "opacity-50")}
            >
              <Trash2 aria-hidden="true" />
              {tc("delete")}
            </Button>
          )}
        </>
      )}

      {/* Always (มี record) — comment + print */}
      {creditNote && (
        <Button size="sm" variant="info" onClick={onShowComment}>
          <MessageSquare aria-hidden="true" />
          {tc("comment")}
        </Button>
      )}
      {isView && creditNote?.id && (
        <PrintDocumentButton
          documentType="CN"
          documentId={creditNote.id}
          filters={
            creditNote.cn_no ? { DocumentNo: creditNote.cn_no } : undefined
          }
        />
      )}
    </>
  );

  const ribbon = (
    <DocumentRibbon>
      <RibbonCell label={tfl("createdBy")}>{createdByName || "—"}</RibbonCell>
      <RibbonCell label={tfl("date")}>
        {cnDate ? formatDate(cnDate, dateFormat) : "—"}
      </RibbonCell>
    </DocumentRibbon>
  );

  const subtitle =
    creditNote?.doc_version != null
      ? `${tfl("version")} ${creditNote.doc_version}`
      : undefined;

  return (
    <DocFormHeader
      title={creditNote?.cn_no ?? t("entity")}
      subtitle={subtitle}
      backLabel={tc("goBack")}
      onBack={onBack}
      badges={badges}
      actions={actions}
      infoLabel={t("documentInfo")}
      ribbon={ribbon}
    />
  );
}
