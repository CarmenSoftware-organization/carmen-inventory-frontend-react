import { useTranslations } from "use-intl";
import { History, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommentButton } from "@/components/comment-button";
import { PrintDocumentButton } from "@/components/print-document-button";
import { openActivity } from "@/components/share/activity-sheet-host";
import { usePurchaseRequestComments } from "@/hooks/use-purchase-request";
import { STAGE_ROLE } from "@/types/stage-role";
import { PR_STATUS } from "@/types/purchase-request";
import type { FormMode } from "@/types/form";

interface PrFormActionsProps {
  readonly mode: FormMode;
  readonly role?: string;
  readonly prStatus?: string;
  readonly prId?: string;
  readonly prNo?: string;
  readonly isPending: boolean;
  readonly isDeletePending: boolean;
  readonly hasRecord: boolean;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
  readonly onDelete: () => void;
  readonly onComment: () => void;
}

/**
 * แถบปุ่ม action ด้านบนของฟอร์มใบขอซื้อ โดยเปลี่ยนชุดปุ่มตาม `FormMode`
 * (view/edit), `role` ของผู้ใช้ และสถานะ `prStatus` รองรับปุ่ม edit, save
 * (submit ของฟอร์ม `purchase-request-form`), cancel, delete (เฉพาะ draft)
 * ปุ่ม comment และ activity เมื่อ record มีอยู่แล้ว ซ่อนปุ่ม edit เมื่อ voided
 * หรือผู้ใช้เป็น view-only role
 * @param props - คุณสมบัติของแถบปุ่ม
 * @param props.mode - โหมดฟอร์ม view หรือ edit (`FormMode`)
 * @param props.role - stage role ปัจจุบันของผู้ใช้
 * @param props.prStatus - สถานะของ PR ใช้ตรวจ draft/voided
 * @param props.isPending - สถานะกำลังบันทึก (disable ปุ่ม)
 * @param props.isDeletePending - สถานะกำลังลบ (disable ปุ่ม delete)
 * @param props.hasRecord - มี record แล้วหรือยัง ควบคุมการแสดงปุ่ม comment/activity
 * @param props.onEdit - callback เปลี่ยนเป็นโหมด edit
 * @param props.onCancel - callback ยกเลิกการแก้ไข
 * @param props.onDelete - callback ลบ PR
 * @param props.onComment - callback เปิด comment sheet
 * @returns React element ของแถบปุ่ม action สำหรับฟอร์ม PR
 * @example
 * <PrFormActions
 *   mode={mode}
 *   role={role}
 *   prStatus={pr.pr_status}
 *   hasRecord
 *   isPending={saving}
 *   isDeletePending={deleting}
 *   onEdit={() => setMode("edit")}
 *   onCancel={handleCancel}
 *   onDelete={handleDelete}
 *   onComment={() => setCommentOpen(true)}
 * />
 */
export function PrFormActions({
  mode,
  role,
  prStatus,
  prId,
  prNo,
  isPending,
  isDeletePending,
  hasRecord,
  onEdit,
  onCancel,
  onDelete,
  onComment,
}: PrFormActionsProps) {
  const tActivity = useTranslations("activity");
  const tc = useTranslations("common");
  const { data: comments } = usePurchaseRequestComments(
    hasRecord ? prId : undefined,
  );
  const isView = mode === "view";
  const isVoided = prStatus === PR_STATUS.VOIDED;
  const isViewOnly = role === STAGE_ROLE.VIEW_ONLY;

  return (
    <div className="flex items-center gap-2">
      {isView ? (
        <>
          {!isViewOnly && !isVoided && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onEdit}
            >
              <Pencil />
              {tc("edit")}
            </Button>
          )}
        </>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
          >
            <X />
            {tc("cancel")}
          </Button>
          <Button
            type="submit"
            size="sm"
            form="purchase-request-form"
            disabled={isPending}
          >
            <Save />
            {tc("save")}
          </Button>
        </>
      )}

      {prStatus === PR_STATUS.DRAFT && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={isPending || isDeletePending}
        >
          <Trash2 />
          {tc("delete")}
        </Button>
      )}

      {hasRecord && (
        <CommentButton count={comments?.length} onClick={onComment} />
      )}

      {hasRecord && prId && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => openActivity(prId, prNo)}
        >
          <History />
          {tActivity("title")}
        </Button>
      )}

      {hasRecord && isView && prId && (
        <PrintDocumentButton
          documentType="PR"
          documentId={prId}
          filters={prNo ? { DocumentNo: prNo } : undefined}
        />
      )}
    </div>
  );
}
