import { useState } from "react";
import { useNavigate } from "react-router";
import { History, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { WarningDialog } from "@/components/ui/warning-dialog";
import { DocFormHeader } from "@/components/share/doc-form-header";
import { useDeleteWorkflow } from "./use-wf-mutations";
import { useWorkflowEditAvailability } from "./use-wf-availability";
import type { Workflow } from "@/types/workflows";
import { getWorkflowTypeLabels } from "@/constant/workflow";
import { openActivity } from "@/components/share/activity-sheet-host";

interface WfHeaderProps {
  readonly workflow: Workflow;
  readonly isEditing: boolean;
  readonly isPending: boolean;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
  readonly formId: string;
}

export function WfHeader({
  workflow,
  isEditing,
  isPending,
  onEdit,
  onCancel,
  formId,
}: WfHeaderProps) {
  const navigate = useNavigate();
  const deleteWorkflow = useDeleteWorkflow();
  const [showDelete, setShowDelete] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const t = useTranslations("systemAdmin.workflow");
  const tActivity = useTranslations("activity");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const ts = useTranslations("status");
  const tw = useTranslations("systemAdmin.workflow.documents");
  const tt = useTranslations("toast");

  const typeLabels = getWorkflowTypeLabels(t);
  const { data: availability } = useWorkflowEditAvailability(workflow.id);

  // จำนวนเอกสารแยกตามสถานะ — in_progress คือตัวที่ทำให้แก้ workflow ไม่ได้ จึงเน้นให้เห็นต่างจาก
  // อีกสองถัง ผู้ใช้จะได้รู้ตั้งแต่ก่อนกด Edit ว่าติดอะไรและติดอยู่เท่าไร
  const docCounts = availability?.documents;
  const docBadges = docCounts ? (
    <>
      <Separator orientation="vertical" className="mx-0.5 h-3.5" />
      <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <span>
          {tw("draft")}: {docCounts.draft}
        </span>
        <span
          className={
            docCounts.in_progress > 0
              ? "text-amber-600 dark:text-amber-500"
              : ""
          }
          title={
            docCounts.in_progress > 0 ? tw("inProgressBlocksEdit") : undefined
          }
        >
          {tw("inProgress")}: {docCounts.in_progress}
        </span>
        <span>
          {tw("done")}: {docCounts.done}
        </span>
      </span>
    </>
  ) : null;

  // status + type-label (คั่นด้วย separator) แสดงข้าง title
  const badges = !isEditing ? (
    <>
      <Badge
        variant={workflow.is_active ? "success" : "secondary"}
        size="sm"
        className="text-sm"
      >
        {workflow.is_active ? ts("active") : ts("inactive")}
      </Badge>
      <Separator orientation="vertical" className="mx-0.5 h-3.5" />
      <span className="text-muted-foreground text-sm">
        {typeLabels[workflow.workflow_type] ?? workflow.workflow_type}
      </span>
      {docBadges}
    </>
  ) : undefined;

  const subtitle =
    workflow.description && !isEditing ? (
      <span className="line-clamp-2">{workflow.description}</span>
    ) : undefined;

  // ปุ่มประวัติอยู่นอก ternary — เป็นการดู ไม่ใช่การแก้ จึงเห็นได้ทั้งสองโหมด
  const activityButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => openActivity(workflow.id, workflow.name)}
      className="text-sm"
    >
      <History className="size-3" />
      {tActivity("title")}
    </Button>
  );

  // เข้าโหมดแก้ได้เสมอแล้ว: เอกสารที่เดินอยู่ล็อกแค่รายการ stage กับเส้นทางระหว่าง stage ส่วนชื่อ
  // ผู้อนุมัติ และรายการสินค้าบันทึกได้ตลอด การปิดทั้งปุ่มจึงกันคนออกจากงานที่ทำได้จริง — ตัวที่ยังปิด
  // อยู่คือส่วน stage ข้างในฟอร์ม ซึ่งปิดตรงจุดที่มันถูกล็อกจริง
  // ส่วนการลบยังทำไม่ได้ เพราะทำให้รายการ stage หายไปทั้งอัน เอกสารที่ค้างจะไม่มีอะไรให้เดินต่อ
  // ถ้ายังไม่รู้คำตอบ (query ยังโหลด หรือโหลดไม่สำเร็จ) ให้ผ่านไปก่อน แล้วไปตกที่การ์ดฝั่ง backend
  // แทนที่จะล็อกปุ่มเพราะอ่านสถานะไม่ได้
  const blockedFromDelete = availability?.can_delete === false;
  const handleDelete = () => {
    if (blockedFromDelete) {
      setShowBlocked(true);
      return;
    }
    setShowDelete(true);
  };

  const actions = isEditing ? (
    <>
      {activityButton}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCancel}
        disabled={isPending}
        className="text-sm"
      >
        {tc("cancel")}
      </Button>
      <Button
        type="submit"
        size="sm"
        form={formId}
        disabled={isPending}
        className="text-sm"
      >
        {isPending ? tf("saving") : t("saveChanges")}
      </Button>
    </>
  ) : (
    <>
      {activityButton}
      <Button size="sm" onClick={onEdit} className="text-sm">
        <Pencil className="size-3" />
        {tc("edit")}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={deleteWorkflow.isPending}
        className="text-sm"
      >
        <Trash2 className="size-3" />
        {tc("delete")}
      </Button>
    </>
  );

  return (
    <>
      <DocFormHeader
        title={isEditing ? t("editWorkflow") : workflow.name}
        subtitle={subtitle}
        backLabel={tc("goBack")}
        onBack={() => navigate("/system-admin/workflow")}
        badges={badges}
        actions={actions}
        flush
      />

      <WarningDialog
        open={showBlocked}
        title={tw("blockedTitle")}
        description={tw("blockedDescription", {
          count: docCounts?.in_progress ?? 0,
        })}
        confirmLabel={tc("close")}
        onConfirm={() => setShowBlocked(false)}
      />

      <DeleteDialog
        open={showDelete}
        onOpenChange={(open) =>
          !open && !deleteWorkflow.isPending && setShowDelete(false)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: workflow.name })}
        isPending={deleteWorkflow.isPending}
        onConfirm={() => {
          deleteWorkflow.mutate(workflow.id, {
            onSuccess: () => {
              setShowDelete(false);
              toast.success(tt("deleteSuccess", { entity: t("entity") }));
              navigate("/system-admin/workflow");
            },
          });
        }}
      />
    </>
  );
}
