import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocActionsMenu } from "@/components/share/doc-actions-menu";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { usePurchaseRequestComments } from "./use-purchase-request";
import { useCreatableWorkflows } from "@/hooks/use-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";
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
  const tc = useTranslations("common");
  const t = useTranslations("procurement.purchaseRequest");
  const navigate = useNavigate();
  // Duplicate = สร้างใบใหม่ — เกณฑ์เดียวกับปุ่ม Add: ต้องมี workflow ที่เริ่มได้
  // (PR ไม่มี permission .create ใน catalog) กดไม่ผ่านเด้ง dialog บอกเหตุผล
  const { canCreate: canCreatePr } = useCreatableWorkflows(WORKFLOW_TYPE.PR);
  const handleDuplicate = () => {
    if (!canCreatePr) {
      dispatchPermissionDenied(undefined, t("noCreatableWorkflow"));
      return;
    }
    navigate(`/procurement/purchase-request/new?duplicate_id=${prId}`);
  };
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
            <Button type="button" size="sm" variant="outline" onClick={onEdit}>
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
          variant="outline"
          size="sm"
          onClick={onDelete}
          disabled={isPending || isDeletePending}
        >
          <Trash2 />
          {tc("delete")}
        </Button>
      )}

      {hasRecord && (
        <DocActionsMenu
          // Duplicate/Print เฉพาะ view — ตอน edit ค่าบนจออาจยังไม่ save
          // การก๊อป/พิมพ์จาก server คนละเรื่องกับที่เห็นอยู่
          onDuplicate={isView && prId ? handleDuplicate : undefined}
          onComment={onComment}
          commentCount={comments?.length}
          activity={prId ? { id: prId, label: prNo } : undefined}
          print={
            isView && prId
              ? {
                  documentType: "PR",
                  documentId: prId,
                  filters: prNo ? { DocumentNo: prNo } : undefined,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
