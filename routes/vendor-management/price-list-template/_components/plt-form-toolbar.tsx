import { ChevronLeft, Copy, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/share/glass-card";
import type { FormMode } from "@/types/form";
import type { ToolbarLabels } from "./plt-form-labels";
import { FORM_ID, getSubmitLabel } from "./plt-form-helpers";

export function PltFormToolbar({
  mode,
  statusConfig,
  isPending,
  isDeleting,
  onBack,
  onEdit,
  onCancel,
  onDelete,
  labels,
  tlabels,
}: {
  readonly mode: FormMode;
  readonly statusConfig: { label: string; className: string };
  readonly isPending: boolean;
  readonly isDeleting: boolean;
  readonly onBack: () => void;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
  readonly onDelete: () => void;
  readonly labels: ToolbarLabels;
  readonly tlabels: { template: string };
}) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";
  const submitLabel = getSubmitLabel(isPending, isAdd, labels);

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
        <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-bold tracking-wider uppercase">
          <Copy className="size-2.5" />
          {tlabels.template}
        </span>
        <StatusPill statusConfig={statusConfig} large />
      </div>

      <div className="flex items-center gap-2">
        {isView ? (
          <Button size="sm" onClick={onEdit}>
            <Pencil />
            {labels.edit}
          </Button>
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
              {labels.cancel}
            </Button>
            <Button type="submit" size="sm" form={FORM_ID} disabled={isPending}>
              <Save />
              {submitLabel}
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
        )}
      </div>
    </div>
  );
}
