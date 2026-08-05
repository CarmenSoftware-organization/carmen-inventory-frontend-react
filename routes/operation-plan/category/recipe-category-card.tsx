import { useTranslations } from "use-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
} from "@/components/share/list-card";
import type { RecipeCategory } from "@/types/recipe-category";

interface RecipeCategoryCardProps {
  readonly item: RecipeCategory;
  readonly parentName?: string;
  readonly onEdit: (item: RecipeCategory) => void;
  readonly onDelete: (item: RecipeCategory) => void;
}

/**
 * การ์ดหมวดหมู่สูตรอาหาร 1 รายการ สำหรับหน้ารายการโหมด grid/mobile
 *
 * ใช้ `ListCard` ตัวเดียวกับการ์ดโมดูลอื่น
 *
 * @param props.item - ข้อมูลหมวดหมู่
 * @param props.parentName - ชื่อหมวดแม่ (resolve จาก parent_id)
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onDelete - callback เมื่อกดปุ่มลบ
 */
export default function RecipeCategoryCard({
  item,
  parentName,
  onEdit,
  onDelete,
}: RecipeCategoryCardProps) {
  const tfl = useTranslations("field");

  return (
    <ListCard
      title={item.name || "..."}
      badge={<StatusBadge active={item.is_active} />}
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      {item.code && <ListCardRow label={tfl("code")}>{item.code}</ListCardRow>}
      {parentName && (
        <ListCardRow label={tfl("parentCategory")}>{parentName}</ListCardRow>
      )}
      {item.description && (
        <ListCardRow label={tfl("description")}>{item.description}</ListCardRow>
      )}
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
