import { useTranslations } from "use-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { TreeNode } from "./tree-node";
import { CategoryNode } from "@/types/category";

interface Props {
  isLoading: boolean;
  filteredData: CategoryNode[];
  expanded: Record<string, boolean>;
  toggleExpand: (id: string) => void;
  onEdit: (node: CategoryNode) => void;
  onAdd: (node: CategoryNode) => void;
  onDelete: (node: CategoryNode | null) => void;
  search: string;
}

/**
 * Component แสดงเนื้อหาต้นไม้หมวดหมู่ จัดการสามสถานะหลักในที่เดียว
 * ได้แก่ skeleton ตอน loading, empty state เมื่อไม่พบข้อมูลหรือไม่ตรงกับคำค้นหา และ render TreeNode เป็นรายการ
 * ใช้คู่กับ useCategoryTree + search เพื่อให้ได้ filteredData และ expanded state
 * @param props - isLoading, filteredData, expanded, toggleExpand, onEdit, onAdd, onDelete, search
 * @returns JSX ของเนื้อหาต้นไม้หมวดหมู่ในสถานะที่เหมาะสม
 * @example
 * <TreeContent
 *   isLoading={false}
 *   filteredData={tree}
 *   expanded={expanded}
 *   toggleExpand={toggle}
 *   onEdit={handleEdit}
 *   onAdd={handleAdd}
 *   onDelete={setDeleteTarget}
 *   search=""
 * />
 */
export default function TreeContent({
  isLoading,
  filteredData,
  expanded,
  toggleExpand,
  onEdit,
  onAdd,
  onDelete,
  search,
}: Props) {
  const t = useTranslations("productManagement.category");

  if (isLoading) {
    return (
      <div className="p-1 space-y-px">
        {["cat", "sub-1", "item-1", "cat-2", "sub-2", "item-2"].map((id, i) => (
          <div
            key={id}
            className="flex items-center h-7 gap-2"
            style={{ paddingLeft: `${(i % 3) * 20 + 4}px` }}
          >
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
            <Skeleton className="h-3 w-8 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground">
        {search
          ? t("noResults", { search })
          : t("noCategories")}
      </div>
    );
  }

  return (
    <div className="py-2">
      {filteredData.map((cat) => (
        <TreeNode
          key={cat.id}
          node={cat}
          expanded={expanded}
          toggleExpand={toggleExpand}
          onEdit={onEdit}
          onAdd={onAdd}
          onDelete={(node) => onDelete(node)}
          search={search}
        />
      ))}
    </div>
  );
}
