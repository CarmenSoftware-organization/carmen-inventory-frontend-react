
import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { ChevronLeft, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const STATUS_PILL_VARIANT: Record<
  string,
  "info-light" | "success-light" | "warning-light"
> = {
  DRAFT: "info-light",
  PUBLISHED: "success-light",
  ARCHIVED: "warning-light",
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

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="w-fit"
          type="button"
          aria-label={tc("goBack")}
          onClick={onBack}
        >
          <ChevronLeft />
        </Button>
        <h1
          lang={isAdd ? undefined : "th"}
          className="max-w-[20rem] truncate text-lg font-semibold"
        >
          {title}
        </h1>
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
          {code || "—"}
        </span>
        {isView ? (
          <Badge
            variant={STATUS_PILL_VARIANT[status] ?? "info-light"}
            size="xs"
            className="tracking-wider uppercase"
          >
            {ts(
              (status?.toLowerCase() ?? "draft") as
                | "draft"
                | "published"
                | "archived",
            )}
          </Badge>
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
                    opt.value.toLowerCase() as
                      | "draft"
                      | "published"
                      | "archived",
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isView ? (
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
              form="recipe-form"
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
        )}
      </div>
    </div>
  );
}
