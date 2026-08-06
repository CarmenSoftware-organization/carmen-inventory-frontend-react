import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { History, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocFormHeader } from "@/components/share/doc-form-header";
import { cn } from "@/lib/utils";
import type { FormMode } from "@/types/form";
import type { RecipeCategoryFormValues } from "./recipe-category-form-schema";
import { openActivity } from "@/components/share/activity-sheet-host";

interface RecipeCategoryToolbarProps {
  readonly form: UseFormReturn<RecipeCategoryFormValues>;
  readonly mode: FormMode;
  readonly isPending: boolean;
  readonly isDeleting: boolean;
  readonly onBack: () => void;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
  readonly onDelete?: () => void;
  /**
   * id ของหมวดที่บันทึกไว้แล้ว — เปิดปุ่ม Activity
   *
   * toolbar เห็นแต่ค่าในฟอร์ม ไม่เห็นตัว record จึงต้องรับ id มาจากฟอร์มแม่
   * (ไม่ส่ง = โหมด add ที่ยังไม่มีประวัติให้ดู)
   */
  readonly activityId?: string;
}

export function RecipeCategoryToolbar({
  form,
  mode,
  isPending,
  isDeleting,
  onBack,
  onEdit,
  onCancel,
  onDelete,
  activityId,
}: RecipeCategoryToolbarProps) {
  const tc = useTranslations("common");
  const tActivity = useTranslations("activity");
  const tform = useTranslations("form");
  const tr = useTranslations("operationPlan.recipeCategory");
  const code = useWatch({ control: form.control, name: "code" });
  const name = useWatch({ control: form.control, name: "name" });
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const title = isAdd ? tr("add") : name || tr("untitledCategory");

  const submitLabel = isPending
    ? isAdd
      ? tform("creating")
      : tform("saving")
    : isAdd
      ? tc("create")
      : tc("save");

  const badges = (
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
      {code || tr("noCode")}
    </span>
  );

  // ปุ่มประวัติอยู่นอก ternary — เป็นการดู ไม่ใช่การแก้ จึงเห็นได้ทุกโหมด
  const activityButton = activityId ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => openActivity(activityId, code || name)}
    >
      <History />
      {tActivity("title")}
    </Button>
  ) : null;

  const actions = isView ? (
    <>
      {activityButton}
      <Button size="sm" onClick={onEdit}>
        <Pencil />
        {tc("edit")}
      </Button>
    </>
  ) : (
    <>
      {activityButton}
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
        form="recipe-category-form"
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
