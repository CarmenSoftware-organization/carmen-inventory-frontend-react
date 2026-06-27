
import { useTranslations } from "use-intl";
import {
  Check,
  FileText,
  MessageSquare,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
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
import type { GoodsReceiveNote } from "@/types/goods-receive-note";
import { GRN_FORM_STATUS_CONFIG } from "@/constant/goods-receive-note";
import { getGrnDocTypeLabel } from "@/constant/grn-doc-type";
import {
  DocFormHeader,
  DocumentRibbon,
  RibbonCell,
} from "@/components/share/doc-form-header";

interface GrnHeaderProps {
  readonly goodsReceiveNote?: GoodsReceiveNote;
  readonly mode: FormMode;
  readonly isPending: boolean;
  readonly isActionPending: boolean;
  readonly isCommitted: boolean;
  readonly isVoid: boolean;
  readonly deleteIsPending: boolean;
  /** display only — ไม่เข้า payload */
  readonly receivedByName: string;
  /** display only — ไม่เข้า payload */
  readonly departmentName: string;
  readonly grnDate?: string;
  readonly dateFormat: string;
  readonly onBack: () => void;
  readonly onEnterEdit: () => void;
  readonly onCancel: () => void;
  readonly onShowCommit: () => void;
  readonly onShowVoid: () => void;
  readonly onShowComment: () => void;
  readonly onShowDelete: () => void;
  readonly onSaveDraft: () => void;
  readonly onSave: () => void;
}

/**
 * Header ของฟอร์ม GRN — ใช้ `DocFormHeader` กลางร่วมกับ PO/PR
 * คง permission guard (Edit/Delete ผ่าน useCan) จาก FormToolbar เดิมไว้
 */
export function GrnHeader({
  goodsReceiveNote,
  mode,
  isPending,
  isActionPending,
  isCommitted,
  isVoid,
  deleteIsPending,
  receivedByName,
  departmentName,
  grnDate,
  dateFormat,
  onBack,
  onEnterEdit,
  onCancel,
  onShowCommit,
  onShowVoid,
  onShowComment,
  onShowDelete,
  onSaveDraft,
  onSave,
}: GrnHeaderProps) {
  const t = useTranslations("procurement.goodsReceiveNote");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  const { can, isAdmin } = useCan();
  const prefix = usePermissionPrefix();
  const updatePermission = prefix
    ? buildPermissionKey(prefix, "update")
    : undefined;
  const deletePermission = prefix
    ? buildPermissionKey(prefix, "delete")
    : undefined;
  const editDenied = !!updatePermission && !isAdmin && !can(updatePermission);
  const deleteDenied = !!deletePermission && !isAdmin && !can(deletePermission);

  const isView = mode === "view";
  const isEdit = mode === "edit";
  const canEdit = !isCommitted && !isVoid;

  const statusCfg = goodsReceiveNote
    ? GRN_FORM_STATUS_CONFIG[goodsReceiveNote.doc_status]
    : null;

  const badges = (
    <>
      {statusCfg && (
        <Badge className={statusCfg.className} size="sm">
          {statusCfg.label ?? goodsReceiveNote?.doc_status}
        </Badge>
      )}
      {goodsReceiveNote && (
        <Badge variant="info-light" size="sm">
          {getGrnDocTypeLabel(t, goodsReceiveNote.doc_type)}
        </Badge>
      )}
    </>
  );

  const actions = (
    <>
      {/* View mode — commit / void / edit */}
      {isView && goodsReceiveNote && canEdit && (
        <>
          <Button
            type="button"
            variant="success"
            size="sm"
            disabled={isActionPending}
            onClick={onShowCommit}
          >
            <Check aria-hidden="true" />
            {tc("commit")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isActionPending}
            onClick={onShowVoid}
          >
            <X aria-hidden="true" />
            {tc("void")}
          </Button>
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

      {/* Edit / add mode — cancel / save draft / save / delete */}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={onSaveDraft}
          >
            <FileText aria-hidden="true" />
            {tc("saveDraft")}
          </Button>
          <Button type="button" size="sm" disabled={isPending} onClick={onSave}>
            <Save aria-hidden="true" />
            {isEdit ? tc("save") : t("create")}
          </Button>
          {isEdit && goodsReceiveNote && (
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
      {goodsReceiveNote && (
        <Button size="sm" variant="info" onClick={onShowComment}>
          <MessageSquare aria-hidden="true" />
          {tc("comment")}
        </Button>
      )}
      {isView && goodsReceiveNote?.id && (
        <PrintDocumentButton
          documentType="GRN"
          documentId={goodsReceiveNote.id}
          filters={
            goodsReceiveNote.grn_no
              ? { DocumentNo: goodsReceiveNote.grn_no }
              : undefined
          }
        />
      )}
    </>
  );

  const ribbon = (
    <DocumentRibbon>
      <RibbonCell label={tfl("receivedBy")}>{receivedByName || "—"}</RibbonCell>
      <RibbonCell label={tfl("department")}>{departmentName || "—"}</RibbonCell>
      <RibbonCell label={tfl("grnDate")}>
        {grnDate ? formatDate(grnDate, dateFormat) : "—"}
      </RibbonCell>
    </DocumentRibbon>
  );

  const subtitle =
    goodsReceiveNote?.doc_version != null
      ? `${tfl("version")} ${goodsReceiveNote.doc_version}`
      : undefined;

  return (
    <DocFormHeader
      title={goodsReceiveNote?.grn_no ?? t("entity")}
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
