import { useTranslations } from "use-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
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
  const { dateTimeFormat } = useProfile();

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
      {item.audit?.created?.at && (
        <ListCardRow label={tfl("created")}>
          <span className="tabular-nums">
            {formatDate(item.audit.created.at, dateTimeFormat)}
          </span>
        </ListCardRow>
      )}
      {item.audit?.created?.name && (
        <ListCardRow label={tfl("by")}>{item.audit.created.name}</ListCardRow>
      )}
      {item.audit?.updated?.at && (
        <ListCardRow label={tfl("updated")}>
          <span className="tabular-nums">
            {formatDate(item.audit.updated.at, dateTimeFormat)}
          </span>
        </ListCardRow>
      )}
    </ListCard>
  );
}
