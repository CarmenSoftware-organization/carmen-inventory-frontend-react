
import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import SearchInput from "@/components/search-input";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import {
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/use-category";
import {
  useSubCategory,
  useCreateSubCategory,
  useUpdateSubCategory,
  useDeleteSubCategory,
} from "@/hooks/use-sub-category";
import {
  useItemGroup,
  useCreateItemGroup,
  useUpdateItemGroup,
  useDeleteItemGroup,
} from "@/hooks/use-item-group";
import { NODE_TYPE, type CategoryNode } from "@/types/category";
import { useCategoryTree } from "./use-category-tree";
import { useCategoryDialog } from "./use-category-dialog";
import { CategoryDialog } from "./category-dialog";
import type { CategoryFormValues } from "./category-form-schema";
import TreeContent from "./tree-content";

export default function CategoryComponent() {
  const t = useTranslations("productManagement.category");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");
  const td = useTranslations("delete");

  const NODE_LABELS: Record<string, string> = {
    [NODE_TYPE.CATEGORY]: t("nodeCategory"),
    [NODE_TYPE.SUBCATEGORY]: t("nodeSubcategory"),
    [NODE_TYPE.ITEM_GROUP]: t("nodeItemGroup"),
  };

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CategoryNode | null>(null);

  // Data
  const { data: catData, isLoading: catLoading } = useCategory({
    perpage: -1,
  });
  const { data: subData, isLoading: subLoading } = useSubCategory({
    perpage: -1,
  });
  const { data: igData, isLoading: igLoading } = useItemGroup({
    perpage: -1,
  });
  const isLoading = catLoading || subLoading || igLoading;

  // Mutations
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createSubCategory = useCreateSubCategory();
  const updateSubCategory = useUpdateSubCategory();
  const deleteSubCategory = useDeleteSubCategory();
  const createItemGroup = useCreateItemGroup();
  const updateItemGroup = useUpdateItemGroup();
  const deleteItemGroup = useDeleteItemGroup();

  const isMutating =
    createCategory.isPending ||
    updateCategory.isPending ||
    createSubCategory.isPending ||
    updateSubCategory.isPending ||
    createItemGroup.isPending ||
    updateItemGroup.isPending;

  const isDeleting =
    deleteCategory.isPending ||
    deleteSubCategory.isPending ||
    deleteItemGroup.isPending;

  // Tree
  const { categoryData, expanded, expandAll, collapseAll, toggleExpand } =
    useCategoryTree({
      categories: catData?.data ?? [],
      subCategories: subData?.data ?? [],
      itemGroups: igData?.data ?? [],
      isLoading,
    });

  // Search
  const nodeMatches = (node: CategoryNode, q: string): boolean => {
    const self =
      node.code.toLowerCase().includes(q) ||
      node.name.toLowerCase().includes(q) ||
      (node.description?.toLowerCase().includes(q) ?? false);
    if (self) return true;
    return node.children?.some((c) => nodeMatches(c, q)) ?? false;
  };

  const filteredData = (() => {
    if (!search) return categoryData;
    const q = search.toLowerCase();
    return categoryData.filter((cat) => nodeMatches(cat, q));
  })();

  const searchExpanded = (() => {
    if (!search) return {};
    const q = search.toLowerCase();
    const result: Record<string, boolean> = {};
    const walk = (nodes: CategoryNode[]) => {
      for (const node of nodes) {
        if (nodeMatches(node, q)) result[node.id] = true;
        if (node.children?.length) walk(node.children);
      }
    };
    walk(filteredData);
    return result;
  })();

  // Stats
  const stats = (() => {
    const cats = catData?.data?.length ?? 0;
    const subs = subData?.data?.length ?? 0;
    const igs = igData?.data?.length ?? 0;
    return { cats, subs, igs, total: cats + subs + igs };
  })();

  // Dialog
  const {
    open: dialogOpen,
    mode: dialogMode,
    selectedNode,
    parentNode,
    handleOpenChange,
    handleEdit,
    handleAdd,
  } = useCategoryDialog({ categoryData, onSubmit: () => {} });

  const handleFormSubmit = (data: CategoryFormValues) => {
    const isEdit = dialogMode === "edit";
    const ok = () => handleOpenChange(false);
    const opts = (label: string) => ({
      onSuccess: () => {
        toast.success(
          isEdit
            ? tt("updateSuccess", { entity: label })
            : tt("createSuccess", { entity: label }),
        );
        ok();
      },
      onError: (e: Error) => toast.error(e.message),
    });

    if (isEdit && selectedNode) {
      // doc_version round-trips the loaded record's version — backend requires
      // it on update for optimistic concurrency (omitting it returns 400).
      const payload = {
        id: selectedNode.id,
        doc_version: selectedNode.doc_version,
        ...data,
      };
      const label = NODE_LABELS[selectedNode.type];
      const actions = {
        [NODE_TYPE.CATEGORY]: () => updateCategory.mutate(payload, opts(label)),
        [NODE_TYPE.SUBCATEGORY]: () =>
          updateSubCategory.mutate(
            {
              ...payload,
              product_category_id: data.product_category_id ?? "",
            },
            opts(label),
          ),
        [NODE_TYPE.ITEM_GROUP]: () =>
          updateItemGroup.mutate(
            {
              ...payload,
              product_subcategory_id: data.product_subcategory_id ?? "",
            },
            opts(label),
          ),
      };
      actions[selectedNode.type]();
    } else if (parentNode) {
      const childType =
        parentNode.type === NODE_TYPE.CATEGORY
          ? NODE_TYPE.SUBCATEGORY
          : NODE_TYPE.ITEM_GROUP;
      const label = NODE_LABELS[childType];
      const actions: Record<string, () => void> = {
        [NODE_TYPE.CATEGORY]: () =>
          createSubCategory.mutate(
            { ...data, product_category_id: parentNode.id },
            opts(label),
          ),
        [NODE_TYPE.SUBCATEGORY]: () =>
          createItemGroup.mutate(
            { ...data, product_subcategory_id: parentNode.id },
            opts(label),
          ),
      };
      actions[parentNode.type]?.();
    } else {
      createCategory.mutate(data, opts(NODE_LABELS[NODE_TYPE.CATEGORY]));
    }
  };

  // Delete
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const opts = {
      onSuccess: () => {
        toast.success(
          tt("deleteSuccess", { entity: NODE_LABELS[deleteTarget.type] }),
        );
        setDeleteTarget(null);
      },
      onError: (e: Error) => toast.error(e.message),
    };
    const actions = {
      [NODE_TYPE.CATEGORY]: () => deleteCategory.mutate(deleteTarget.id, opts),
      [NODE_TYPE.SUBCATEGORY]: () =>
        deleteSubCategory.mutate(deleteTarget.id, opts),
      [NODE_TYPE.ITEM_GROUP]: () =>
        deleteItemGroup.mutate(deleteTarget.id, opts),
    };
    actions[deleteTarget.type]();
  };

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ModuleTileIcon />
              <h1 className="text-lg font-semibold">{t("title")}</h1>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {t("desc")}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button onClick={() => handleAdd()} size="sm">
              <Plus className="h-3 w-3" />
              {t("add")}
            </Button>
          </div>
        </div>

        <div className="w-full">
          <SearchInput
            defaultValue={search}
            onSearch={setSearch}
            onInputChange={setSearch}
          />
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {/* Summary bar */}
        {!isLoading && (
          <div className="text-muted-foreground flex items-center gap-3 px-1 py-1 text-xs">
            <span className="text-foreground/70 font-semibold">
              {t("nItems", { count: stats.total })}
            </span>
            <span className="text-border">|</span>
            <span>{t("nCategories", { count: stats.cats })}</span>
            <span className="text-border">|</span>
            <span>{t("nSubcategories", { count: stats.subs })}</span>
            <span className="text-border">|</span>
            <span>{t("nItemGroups", { count: stats.igs })}</span>
          </div>
        )}

        {/* Tree */}
        <div className="bg-card rounded-md border">
          {/* Header row */}
          <div className="bg-muted/40 text-muted-foreground flex h-9 items-center justify-between border-b px-2 text-[0.625rem] font-semibold tracking-wider uppercase">
            <div className="flex items-center">
              <FolderTree className="mr-1.5 h-3 w-3" />
              {t("categoryTree")}
            </div>
            <div className="flex items-center gap-1">
              <Button onClick={expandAll} size="xs" variant="ghost">
                <ChevronDown className="h-3 w-3" />
                {t("expand")}
              </Button>
              <Button onClick={collapseAll} size="xs" variant="ghost">
                <ChevronUp className="h-3 w-3" />
                {t("collapse")}
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-21rem-3rem)] sm:h-[calc(100vh-11rem-3rem)]">
            <TreeContent
              isLoading={isLoading}
              filteredData={filteredData}
              expanded={search ? searchExpanded : expanded}
              toggleExpand={toggleExpand}
              onEdit={handleEdit}
              onAdd={handleAdd}
              onDelete={setDeleteTarget}
              search={search}
            />
          </ScrollArea>
        </div>
      </div>

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={handleOpenChange}
        mode={dialogMode}
        selectedNode={selectedNode}
        parentNode={parentNode}
        onSubmit={handleFormSubmit}
        isPending={isMutating}
      />

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}
        title={`${tc("delete")} ${NODE_LABELS[deleteTarget?.type ?? "category"]}`}
        description={td("confirmNamed", { name: deleteTarget?.name ?? "" })}
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
