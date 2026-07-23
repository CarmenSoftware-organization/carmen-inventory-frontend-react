
import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { ChevronLeft, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FormMode } from "@/types/form";
import type { CuisineFormValues } from "./cuisine-form-schema";

interface CuisineToolbarProps {
  readonly form: UseFormReturn<CuisineFormValues>;
  readonly mode: FormMode;
  readonly isPending: boolean;
  readonly isDeleting: boolean;
  readonly onBack: () => void;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
  readonly onDelete?: () => void;
}

export function CuisineToolbar({
  form,
  mode,
  isPending,
  isDeleting,
  onBack,
  onEdit,
  onCancel,
  onDelete,
}: CuisineToolbarProps) {
  const tc = useTranslations("common");
  const tform = useTranslations("form");
  const ts = useTranslations("status");
  const tr = useTranslations("operationPlan.cuisine");
  const name = useWatch({ control: form.control, name: "name" });
  const isActive = useWatch({ control: form.control, name: "is_active" });
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const title = isAdd ? tr("add") : name || tr("untitledCuisine");

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
          className="w-fit hover:bg-transparent dark:hover:bg-transparent"
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
        {!isAdd && (
          <Badge
            variant={isActive ? "success-light" : "warning-light"}
            size="xs"
            className="uppercase tracking-wider"
          >
            {isActive ? ts("active") : ts("inactive")}
          </Badge>
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
              form="cuisine-form"
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
