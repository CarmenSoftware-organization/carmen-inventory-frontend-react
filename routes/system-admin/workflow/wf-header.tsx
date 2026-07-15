import { useState } from "react";
import { Link } from "react-router";
import { useNavigate } from "react-router";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDeleteWorkflow } from "@/hooks/use-workflow";
import type { Workflow } from "@/types/workflows";
import { getWorkflowTypeLabels } from "@/constant/workflow";

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
  const t = useTranslations("systemAdmin.workflow");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const ts = useTranslations("status");
  const tt = useTranslations("toast");

  const typeLabels = getWorkflowTypeLabels(t);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Button asChild variant="ghost" size="icon-sm" className="mt-0.5">
            <Link to="/system-admin/workflow" aria-label={tc("goBack")}>
              <ArrowLeft className="size-3.5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="text-lg leading-tight font-semibold">
                {isEditing ? t("editWorkflow") : workflow.name}
              </h1>
              {!isEditing && (
                <Badge
                  variant={workflow.is_active ? "success" : "secondary"}
                  size="sm"
                  className="text-xs"
                >
                  {workflow.is_active ? ts("active") : ts("inactive")}
                </Badge>
              )}
              {!isEditing && (
                <>
                  <Separator orientation="vertical" className="mx-0.5 h-3.5" />
                  <span className="text-muted-foreground text-xs">
                    {typeLabels[workflow.workflow_type] ??
                      workflow.workflow_type}
                  </span>
                </>
              )}
            </div>
            {workflow.description && !isEditing && (
              <p className="text-muted-foreground line-clamp-2 text-xs">
                {workflow.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={isPending}
                className="text-xs"
              >
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                form={formId}
                disabled={isPending}
                className="text-xs"
              >
                {isPending ? tf("saving") : t("saveChanges")}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={onEdit} className="text-xs">
                <Pencil className="size-3" />
                {tc("edit")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDelete(true)}
                disabled={deleteWorkflow.isPending}
                className="text-xs"
              >
                <Trash2 className="size-3" />
                {tc("delete")}
              </Button>
            </>
          )}
        </div>
      </div>

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
