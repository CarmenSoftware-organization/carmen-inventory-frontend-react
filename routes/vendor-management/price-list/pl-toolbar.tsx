
import { ChevronLeft, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormMode } from "@/types/form";
import { StatusPill } from "@/components/share/glass-card";

interface PLToolbarProps {
  readonly mode: FormMode;
  readonly plNo: string | null;
  readonly statusConfig: { label: string; className: string };
  readonly isPending: boolean;
  readonly isDeleting: boolean;
  readonly onBack: () => void;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
  readonly onDelete: () => void;
  readonly formId: string;
  readonly labels: {
    readonly goBack: string;
    readonly edit: string;
    readonly cancel: string;
    readonly save: string;
    readonly create: string;
    readonly saving: string;
    readonly creating: string;
    readonly delete: string;
  };
}

/** Toolbar header — back button + plNo pill + status + action buttons */
export function PLToolbar({
  mode,
  plNo,
  statusConfig,
  isPending,
  isDeleting,
  onBack,
  onEdit,
  onCancel,
  onDelete,
  formId,
  labels,
}: PLToolbarProps) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="w-fit"
          type="button"
          aria-label={labels.goBack}
          onClick={onBack}
        >
          <ChevronLeft />
        </Button>
        {plNo && (
          <span className="bg-foreground text-background inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold tracking-wider uppercase">
            <span className="bg-background/70 size-1 rounded-full" />
            {plNo}
          </span>
        )}
        <StatusPill statusConfig={statusConfig} large />
      </div>

      <div className="flex items-center gap-2">
        {isView ? (
          <Button size="sm" onClick={onEdit}>
            <Pencil />
            {labels.edit}
          </Button>
        ) : (
          <PLToolbarEditButtons
            isAdd={isAdd}
            isEdit={isEdit}
            isPending={isPending}
            isDeleting={isDeleting}
            onCancel={onCancel}
            onDelete={onDelete}
            formId={formId}
            labels={labels}
          />
        )}
      </div>
    </div>
  );
}

function PLToolbarEditButtons({
  isAdd,
  isEdit,
  isPending,
  isDeleting,
  onCancel,
  onDelete,
  formId,
  labels,
}: {
  readonly isAdd: boolean;
  readonly isEdit: boolean;
  readonly isPending: boolean;
  readonly isDeleting: boolean;
  readonly onCancel: () => void;
  readonly onDelete: () => void;
  readonly formId: string;
  readonly labels: PLToolbarProps["labels"];
}) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCancel}
        disabled={isPending}
      >
        <X />
        {labels.cancel}
      </Button>
      <Button type="submit" size="sm" form={formId} disabled={isPending}>
        <Save />
        {getSubmitLabel(isPending, isAdd, labels)}
      </Button>
      {isEdit && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting || isPending}
        >
          <Trash2 />
          {labels.delete}
        </Button>
      )}
    </>
  );
}

function getSubmitLabel(
  isPending: boolean,
  isAdd: boolean,
  labels: PLToolbarProps["labels"],
): string {
  if (isPending) return isAdd ? labels.creating : labels.saving;
  return isAdd ? labels.create : labels.save;
}
