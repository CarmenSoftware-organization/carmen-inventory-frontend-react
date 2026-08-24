import { useTranslations } from "use-intl";
import {
  Building2,
  FileText,
  Pencil,
  Save,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocActionsMenu } from "@/components/share/doc-actions-menu";
import { useGoodsReceiveNoteComments } from "@/hooks/use-goods-receive-note";
import { useCan } from "@/hooks/use-can";
import { usePermissionPrefix } from "@/hooks/use-permission-prefix";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { buildPermissionKey } from "@/constant/permissions";
import { cn } from "@/lib/utils";
import type { FormMode } from "@/types/form";
import type { GoodsReceiveNote } from "@/types/goods-receive-note";
import { StatusIconLabel } from "@/components/ui/status-icon-label";
import { GRN_FORM_STATUS_CONFIG } from "@/constant/goods-receive-note";
import { getGrnDocTypeLabel } from "@/constant/grn-doc-type";
import { DocFormHeader } from "@/components/share/doc-form-header";

interface GrnHeaderProps {
  readonly goodsReceiveNote?: GoodsReceiveNote;
  readonly mode: FormMode;
  readonly isPending: boolean;
  readonly isCommitted: boolean;
  readonly isVoid: boolean;
  readonly deleteIsPending: boolean;
  /** display only — ไม่เข้า payload */
  readonly receivedByName: string;
  /** display only — ไม่เข้า payload */
  readonly departmentName: string;
  readonly onBack: () => void;
  readonly onEnterEdit: () => void;
  readonly onCancel: () => void;
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
  isCommitted,
  isVoid,
  deleteIsPending,
  receivedByName,
  departmentName,
  onBack,
  onEnterEdit,
  onCancel,
  onShowComment,
  onShowDelete,
  onSaveDraft,
  onSave,
}: GrnHeaderProps) {
  const t = useTranslations("procurement.goodsReceiveNote");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const { data: comments } = useGoodsReceiveNoteComments(goodsReceiveNote?.id);

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
  // ใบที่พ้นขั้นร่างไปแล้วแก้ไม่ได้ — ซ่อนปุ่มแก้ไขตั้งแต่หน้าอ่าน จะได้ไม่ต้องพา
  // คนเข้าไปถึงโหมดแก้แล้วค่อยพบว่าไม่มีปุ่มบันทึกให้กด
  const isSaved = goodsReceiveNote?.doc_status === "saved";
  const canEdit = !isCommitted && !isVoid && !isSaved;

  const statusCfg = goodsReceiveNote
    ? GRN_FORM_STATUS_CONFIG[goodsReceiveNote.doc_status]
    : null;

  // แยกเป็นคนละกลุ่มกับเลขที่ใบด้วยเส้นคั่น + ระยะห่าง — เลขที่ใบคือตัวตนของ
  // เอกสาร ส่วนสถานะ/ชนิดใบ/รุ่นคือ "ตอนนี้มันอยู่ตรงไหน" คนละคำถามกัน
  const badges = (
    <div className="border-border/60 ms-1 flex items-center gap-2 border-s ps-3">
      {statusCfg && goodsReceiveNote && (
        <StatusIconLabel
          status={goodsReceiveNote.doc_status}
          label={statusCfg.label ?? goodsReceiveNote.doc_status}
          // เบากว่าในตาราง: ตัวเอกของแถบนี้คือเลขที่ใบ สถานะเป็นข้อมูลประกอบ
          // เหลือสีไว้ที่ไอคอนจุดเดียวซึ่งเป็นสัญญาณที่ต้องเห็นจริง ๆ
          className="text-muted-foreground text-micro [&>svg]:size-3"
        />
      )}
      {goodsReceiveNote && (
        <StatusIconLabel
          status={goodsReceiveNote.doc_type}
          label={getGrnDocTypeLabel(t, goodsReceiveNote.doc_type)}
          className="text-muted-foreground text-micro [&>svg]:size-3"
        />
      )}
      {/* เลขที่ใบ · สถานะ · ชนิดใบ · รุ่น = ตัวตนของเอกสาร อยู่บรรทัดเดียวกันหมด
          (ทรงเดียวกับใบลดหนี้) — ไม่ใช่ Badge เพราะรุ่นเป็นตัวเลขอ้างอิง ไม่ใช่
          สถานะที่ต้องสะดุดตา */}
      {goodsReceiveNote?.doc_version != null && (
        <span className="text-muted-foreground text-micro">
          {tfl("version")} {goodsReceiveNote.doc_version}
        </span>
      )}
    </div>
  );

  const actions = (
    <>
      {/* View mode — edit (commit/void ย้ายไป footer ขวาล่าง = GrnFooterAction) */}
      {isView && goodsReceiveNote && canEdit && (
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
          {/* ทั้งเก็บร่างและบันทึกใช้กับใบที่ยังเป็นร่างเท่านั้น — หลังบ้านตอบ
              "Only draft GRN can be saved" ถ้ายิงกับใบที่บันทึกไปแล้ว */}
          {!isSaved && (
            <>
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
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={onSave}
              >
                <Save aria-hidden="true" />
                {isEdit ? tc("save") : tc("create")}
              </Button>
            </>
          )}
          {goodsReceiveNote && (
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
      {goodsReceiveNote && (
        <DocActionsMenu
          onComment={onShowComment}
          commentCount={comments?.length}
          activity={{
            id: goodsReceiveNote.id,
            label: goodsReceiveNote.grn_no,
          }}
          print={
            isView && goodsReceiveNote.id
              ? {
                  documentType: "GRN",
                  documentId: goodsReceiveNote.id,
                  filters: goodsReceiveNote.grn_no
                    ? { DocumentNo: goodsReceiveNote.grn_no }
                    : undefined,
                }
              : undefined
          }
        />
      )}
    </>
  );

  /**
   * ผู้รับ + แผนก อยู่ใต้เลขที่ใบเป็นข้อความ ไม่ใช่ช่องกรอกที่จางทั้งแถว (ทรง
   * เดียวกับใบลดหนี้) — สองค่านี้อ่านอย่างเดียว ไม่เข้า payload การทำเป็นช่อง
   * disabled กินพื้นที่เท่าช่องที่กรอกได้จริงและชวนให้เข้าใจผิดว่าแก้ได้
   *
   * วันที่ย้ายไปเป็นช่องกรอกในฟอร์มแล้ว (ต่อจากวันที่รับของ) จึงไม่โชว์ซ้ำที่นี่
   */
  const subtitle = (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
      {receivedByName && (
        <span className="flex items-center gap-1">
          <User className="size-3 shrink-0" aria-hidden="true" />
          {receivedByName}
        </span>
      )}
      {departmentName && (
        <span className="flex items-center gap-1">
          <Building2 className="size-3 shrink-0" aria-hidden="true" />
          {departmentName}
        </span>
      )}
    </span>
  );

  return (
    <DocFormHeader
      title={goodsReceiveNote?.grn_no ?? t("entity")}
      subtitle={subtitle}
      backLabel={tc("goBack")}
      onBack={onBack}
      badges={badges}
      actions={actions}
    />
  );
}
