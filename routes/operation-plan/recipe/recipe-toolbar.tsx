import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusDotBadge, type DotTone } from "@/components/ui/status-dot-badge";
import { DocFormHeader } from "@/components/share/doc-form-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RECIPE_STATUS_OPTIONS } from "@/constant/recipe";
import { cn } from "@/lib/utils";
import type { FormMode } from "@/types/form";
import type { RecipeFormValues } from "./recipe-form-schema";

const STATUS_DOT_TONE: Record<string, DotTone> = {
  DRAFT: "info",
  PUBLISHED: "success",
  ARCHIVED: "warning",
};

interface RecipeToolbarProps {
  readonly form: UseFormReturn<RecipeFormValues>;
  readonly mode: FormMode;
  readonly isPending: boolean;
  readonly isDeleting: boolean;
  readonly onBack: () => void;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
  readonly onDelete?: () => void;
}

export function RecipeToolbar({
  form,
  mode,
  isPending,
  isDeleting,
  onBack,
  onEdit,
  onCancel,
  onDelete,
}: RecipeToolbarProps) {
  const tc = useTranslations("common");
  const tform = useTranslations("form");
  const ts = useTranslations("status");
  const tr = useTranslations("operationPlan.recipe");
  const code = useWatch({ control: form.control, name: "code" });
  const name = useWatch({ control: form.control, name: "name" });
  const status = useWatch({ control: form.control, name: "status" });
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const title = isAdd ? tr("add") : name || tr("untitledRecipe");

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
          "text-micro-legal inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tracking-wider uppercase",
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
        {code || "—"}
      </span>
      {isView ? (
        <StatusDotBadge
          tone={STATUS_DOT_TONE[status] ?? "info"}
          size="xs"
          className="tracking-wider uppercase"
        >
          {ts(
            (status?.toLowerCase() ?? "draft") as
              | "draft"
              | "published"
              | "archived",
          )}
        </StatusDotBadge>
      ) : (
        <Select
          value={status}
          onValueChange={(v) =>
            form.setValue("status", v, { shouldDirty: true })
          }
          disabled={isPending}
        >
          <SelectTrigger
            size="xs"
            className="h-6 w-32 text-xs"
            aria-label="status"
          >
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {RECIPE_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {ts(
                  opt.value.toLowerCase() as "draft" | "published" | "archived",
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      <Button type="submit" size="sm" form="recipe-form" disabled={isPending}>
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
