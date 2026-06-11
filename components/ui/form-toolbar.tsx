
import { useTranslations } from "use-intl";
import { ArrowLeft, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/use-can";
import { usePermissionPrefix } from "@/hooks/use-permission-prefix";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { buildPermissionKey } from "@/constant/permissions";
import { cn } from "@/lib/utils";
import type { FormMode } from "@/types/form";

interface FormToolbarProps {
  readonly entity: string;
  readonly mode: FormMode;
  readonly formId: string;
  readonly isPending: boolean;
  readonly onBack: () => void;
  readonly onCancel: () => void;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
  readonly deleteIsPending?: boolean;
  readonly subtitle?: string;
  readonly statusBadge?: React.ReactNode;
  readonly submitSlot?: React.ReactNode;
  readonly viewActions?: React.ReactNode;
  readonly children?: React.ReactNode;
  readonly editTitle?: string;
  /**
   * Resource prefix สำหรับ guard ปุ่ม (ไม่ระบุ = ไม่ guard)
   * จะคำนวณ `{prefix}.create` (Save ใน add mode), `.update` (Edit + Save ใน edit mode), `.delete`
   */
  readonly permissionPrefix?: string;
}

export function FormToolbar({
  entity,
  mode,
  formId,
  isPending,
  onBack,
  onCancel,
  onEdit,
  onDelete,
  deleteIsPending = false,
  subtitle,
  statusBadge,
  submitSlot,
  viewActions,
  children,
  editTitle,
  permissionPrefix,
}: FormToolbarProps) {
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const { can, isAdmin } = useCan();
  const autoPrefix = usePermissionPrefix();
  const prefix = permissionPrefix ?? autoPrefix;
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const title =
    mode === "add"
      ? tf("addTitle", { entity })
      : mode === "edit"
        ? (editTitle ?? tf("editTitle", { entity }))
        : entity;
  const submit = mode === "add" ? tc("create") : tc("save");
  const pending = mode === "add" ? tf("creating") : tf("saving");

  const savePermission = prefix
    ? buildPermissionKey(prefix, mode === "add" ? "create" : "update")
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

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label={tc("goBack")}
        >
          <ArrowLeft />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{title}</h1>
            {statusBadge}
          </div>
          {subtitle && (
            <p className="text-muted-foreground text-xs">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isView && viewActions}
        {isView && onEdit ? (
          <Button
            size="sm"
            onClick={
              editDenied
                ? () => dispatchPermissionDenied(updatePermission)
                : onEdit
            }
            aria-disabled={editDenied || undefined}
            className={cn(editDenied && "opacity-50")}
          >
            <Pencil />
            {tc("edit")}
          </Button>
        ) : !isView ? (
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
            {submitSlot ??
              (saveDenied ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => dispatchPermissionDenied(savePermission)}
                  aria-disabled
                  className="opacity-50"
                >
                  <Save />
                  {submit}
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  form={formId}
                  disabled={isPending}
                >
                  <Save />
                  {isPending ? pending : submit}
                </Button>
              ))}
          </>
        ) : null}
        {isEdit && onDelete && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={
              deleteDenied
                ? () => dispatchPermissionDenied(deletePermission)
                : onDelete
            }
            disabled={!deleteDenied && (isPending || deleteIsPending)}
            aria-disabled={deleteDenied || undefined}
            className={cn(deleteDenied && "opacity-50")}
          >
            <Trash2 />
            {tc("delete")}
          </Button>
        )}
        {children}
      </div>
    </div>
  );
}
