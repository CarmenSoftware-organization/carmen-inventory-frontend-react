import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { DocFormHeader } from "@/components/share/doc-form-header";
import { cn } from "@/lib/utils";
import type { FormMode } from "@/types/form";
import type { EquipmentFormValues } from "./eq-form-schema";

interface EqToolbarProps {
  readonly form: UseFormReturn<EquipmentFormValues>;
  readonly mode: FormMode;
  readonly isPending: boolean;
  readonly isDeleting: boolean;
  readonly onBack: () => void;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
  readonly onDelete?: () => void;
}

export function EqToolbar({
  form,
  mode,
  isPending,
  isDeleting,
  onBack,
  onEdit,
  onCancel,
  onDelete,
}: EqToolbarProps) {
  const tc = useTranslations("common");
  const tform = useTranslations("form");
  const ts = useTranslations("status");
  const tr = useTranslations("operationPlan.equipment");
  const code = useWatch({ control: form.control, name: "code" });
  const name = useWatch({ control: form.control, name: "name" });
  const isActive = useWatch({ control: form.control, name: "is_active" });
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const title = isAdd ? tr("add") : name || tr("untitledEquipment");

  const submitLabel = isPending
    ? isAdd
      ? tform("creating")
      : tform("saving")
    : isAdd
      ? tc("create")
      : tc("save");

  const badges = (
    <>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold tracking-wider uppercase",
          code
            ? "bg-foreground text-background"
            : "text-muted-foreground border border-dashed",
        )}
      >
        {code && (
          <span
            className="bg-background/70 size-1 rounded-full"
            aria-hidden="true"
          />
        )}
        {code || tr("noCode")}
      </span>
      {!isAdd && (
        <StatusDotBadge
          tone={isActive ? "success" : "neutral"}
          size="xs"
          className="tracking-wider uppercase"
        >
          {isActive ? ts("active") : ts("inactive")}
        </StatusDotBadge>
      )}
    </>
  );

  const actions = isView ? (
    <Button size="sm" onClick={onEdit}>
      <Pencil />
      {tc("edit")}
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
        {tc("cancel")}
      </Button>
      <Button
        type="submit"
        size="sm"
        form="equipment-form"
        disabled={isPending}
      >
        <Save />
        {submitLabel}
      </Button>
      {isEdit && onDelete && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting || isPending}
        >
          <Trash2 />
          {tc("delete")}
        </Button>
      )}
    </>
  );

  return (
    <DocFormHeader
      title={title}
      backLabel={tc("goBack")}
      onBack={onBack}
      badges={badges}
      actions={actions}
      flush
    />
  );
}
