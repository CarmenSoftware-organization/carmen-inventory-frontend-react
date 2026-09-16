import { useState } from "react";
import type { CategoryNode } from "@/types/category";
import type { FormMode } from "@/types/form";

interface UseCategoryDialogProps {
  categoryData: CategoryNode[];
  onSubmit: (data: Record<string, unknown>) => Promise<void> | void;
}

export function useCategoryDialog({
  categoryData,
  onSubmit,
}: UseCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<FormMode>("add");
  const [selectedNode, setSelectedNode] = useState<CategoryNode | undefined>();
  const [addParentNode, setAddParentNode] = useState<
    CategoryNode | undefined
  >();

  const resolvedParentNode = (() => {
    if (mode !== "edit" || !selectedNode || !categoryData.length)
      return undefined;

    if (
      selectedNode.type === "subcategory" &&
      selectedNode.product_category_id
    ) {
      return categoryData.find(
        (c) => c.id === selectedNode.product_category_id,
      );
    }

    if (
      selectedNode.type === "itemGroup" &&
      selectedNode.product_subcategory_id
    ) {
      for (const cat of categoryData) {
        const parent = cat.children?.find(
          (s) => s.id === selectedNode.product_subcategory_id,
        );
        if (parent) return parent;
      }
    }

    return undefined;
  })();

  const parentNode = mode === "edit" ? resolvedParentNode : addParentNode;

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedNode(undefined);
      setAddParentNode(undefined);
    }
  };

  const handleEdit = (node: CategoryNode) => {
    setMode("edit");
    setSelectedNode(node);
    setOpen(true);
  };

  const handleAdd = (parent?: CategoryNode) => {
    setMode("add");
    setAddParentNode(parent);
    setSelectedNode(undefined);
    setOpen(true);
  };

  const handleSubmit = (data: Record<string, unknown>) => {
    onSubmit(data);
  };

  return {
    open,
    mode,
    selectedNode,
    parentNode,
    handleOpenChange,
    handleEdit,
    handleAdd,
    handleSubmit,
  };
}
