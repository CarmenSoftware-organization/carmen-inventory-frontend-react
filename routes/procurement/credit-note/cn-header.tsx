import { useTranslations } from "use-intl";
import { Pencil, Save, Trash2, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocActionsMenu } from "@/components/share/doc-actions-menu";
import { useCreditNoteComments } from "@/hooks/use-credit-note";
import { useCan } from "@/hooks/use-can";
import { usePermissionPrefix } from "@/hooks/use-permission-prefix";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { buildPermissionKey } from "@/constant/permissions";
import { cn } from "@/lib/utils";
import type { FormMode } from "@/types/form";
import type { CreditNoteDetail } from "@/types/credit-note";
import { CN_STATUS_CONFIG } from "@/constant/credit-note";
import { DocFormHeader } from "@/components/share/doc-form-header";

interface CnHeaderProps {
  readonly creditNote?: CreditNoteDetail;
  readonly mode: FormMode;
  readonly isPending: boolean;
  readonly deleteIsPending: boolean;
  readonly isLocked: boolean;
  /** display only — ไม่เข้า payload */
  readonly createdByName: string;
  readonly onBack: () => void;
  readonly onEnterEdit: () => void;
  readonly onCancel: () => void;
  readonly onShowDelete: () => void;
  readonly onShowComment: () => void;
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
  onBack,
  onEnterEdit,
  onCancel,
  onShowDelete,
  onShowComment,
}: CnHeaderProps) {
  const t = useTranslations("procurement.creditNote");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const { data: comments } = useCreditNoteComments(creditNote?.id);

  const { can, isAdmin } = useCan();
  const prefix = usePermissionPrefix();
  const isView = mode === "view";
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
  const deleteDenied = !!deletePermission && !isAdmin && !can(deletePermission);

  const statusCfg = creditNote ? CN_STATUS_CONFIG[creditNote.doc_status] : null;

  const badges = (
    <>
      {statusCfg && (
        <Badge className={statusCfg.className} size="sm">
          {statusCfg.label ?? creditNote?.doc_status}
        </Badge>
      )}
      {/* เลขที่ใบ · สถานะ · รุ่น = ตัวตนของเอกสาร อยู่บรรทัดเดียวกันหมด */}
      {creditNote?.doc_version != null && (
        <span className="text-muted-foreground text-xs">
          {tfl("version")} {creditNote.doc_version}
        </span>
      )}
    </>
  );

  const actions = (
    <>
      {/* View — edit (ส่งใบย้ายไป footer ขวาล่าง = CnFooterAction) */}
      {isView && !isLocked && (
        <Button
          size="sm"
          variant="outline"
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
          {creditNote && !isLocked && (
            <Button
              type="button"
              variant="outline"
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

      {/* Always (มี record) — comment / activity / print ยุบอยู่ในเมนู ⋯ */}
      {creditNote && (
        <DocActionsMenu
          onComment={onShowComment}
          commentCount={comments?.length}
          activity={{ id: creditNote.id, label: creditNote.cn_no }}
          print={
            isView && creditNote.id
              ? {
                  documentType: "CN",
                  documentId: creditNote.id,
                  filters: creditNote.cn_no
                    ? { DocumentNo: creditNote.cn_no }
                    : undefined,
                }
              : undefined
          }
        />
      )}
    </>
  );

  // ไอคอนบอกว่าอันไหนคือคนสร้าง อันไหนคือวันที่สร้าง — บรรทัดนี้ไม่มี label
  // กำกับ ถ้าปล่อยเป็นข้อความเปล่าสองก้อนคั่นด้วยจุด คนอ่านต้องเดาเอง
  // (ไอคอนขนาดเท่าตัวอักษร สีเดียวกับข้อความ ไม่ใช่ signal สีแยก)
  const subtitle = createdByName ? (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
      {createdByName && (
        <span className="flex items-center gap-1">
          <User className="size-3 shrink-0" aria-hidden="true" />
          {createdByName}
        </span>
      )}
    </span>
  ) : undefined;

  return (
    <DocFormHeader
      title={creditNote?.cn_no ?? t("entity")}
      subtitle={subtitle}
      backLabel={tc("goBack")}
      onBack={onBack}
      badges={badges}
      actions={actions}
    />
  );
}
