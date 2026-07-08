
import { useTranslations } from "use-intl";
import { FolderTree } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  NODE_TYPE,
  type CategoryNode,
  type CategoryType,
} from "@/types/category";
import type { FormMode } from "@/types/form";
import { CategoryForm } from "./category-form";
import type { CategoryFormValues } from "./category-form-schema";

interface CategoryDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly mode: FormMode;
  readonly selectedNode?: CategoryNode;
  readonly parentNode?: CategoryNode;
  readonly onSubmit: (data: CategoryFormValues) => void;
  readonly isPending?: boolean;
}

const getCategoryType = (
  mode: FormMode,
  selectedNode?: CategoryNode,
  parentNode?: CategoryNode,
): CategoryType => {
  if (mode === "edit" && selectedNode) {
    if (selectedNode.type === NODE_TYPE.CATEGORY) return "category";
    if (selectedNode.type === NODE_TYPE.SUBCATEGORY) return "subcategory";
    return "itemgroup";
  }
  if (!parentNode) return "category";
  if (parentNode.type === NODE_TYPE.CATEGORY) return "subcategory";
  return "itemgroup";
};

/**
 * Dialog สร้าง/แก้ไข Category / Subcategory / Item Group — premium ERP design
 *
 * มี icon-beside-title header + primary accent strip + gradient overlay
 * Title แปรผันตาม type (category / subcategory / itemgroup) และ mode
 * (add / edit) รองรับ parentNode สำหรับระบุลำดับชั้น
 */
export function CategoryDialog({
  open,
  onOpenChange,
  mode,
  selectedNode,
  parentNode,
  onSubmit,
  isPending,
}: CategoryDialogProps) {
  const t = useTranslations("productManagement.category");
  const tf = useTranslations("form");

  const TYPE_LABELS: Record<CategoryType, string> = {
    category: t("nodeCategory"),
    subcategory: t("nodeSubcategory"),
    itemgroup: t("nodeItemGroup"),
  };

  const categoryType = getCategoryType(mode, selectedNode, parentNode);
  const typeLabel = TYPE_LABELS[categoryType];
  const title =
    mode === "edit"
      ? tf("editTitle", { entity: typeLabel })
      : tf("addTitle", { entity: typeLabel });

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="relative gap-0 px-5 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="bg-muted text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <FolderTree className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base">{title}</DialogTitle>
              <DialogDescription className="sr-only">
                {title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {open && (
          <div className="min-h-0 flex-1 overflow-y-auto border-t px-5 py-4">
            <CategoryForm
              type={categoryType}
              mode={mode}
              selectedNode={selectedNode}
              parentNode={parentNode}
              onSubmit={onSubmit}
              onCancel={() => onOpenChange(false)}
              isPending={isPending}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
