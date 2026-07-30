import { useTranslations } from "use-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type { Recipe } from "@/types/recipe";
import type { Cuisine } from "@/types/cuisine";
import type { RecipeCategory } from "@/types/recipe-category";

interface RecipeCardProps {
  readonly item: Recipe;
  readonly cuisines: Cuisine[];
  readonly categories: RecipeCategory[];
  readonly onEdit: (item: Recipe) => void;
  readonly onDelete: (item: Recipe) => void;
}

/**
 * การ์ดสูตรอาหาร 1 รายการ สำหรับหน้ารายการโหมด grid/mobile
 *
 * ใช้ `ListCard` ตัวเดียวกับการ์ดโมดูลอื่น — ไฟล์นี้เหลือแค่ว่าข้อมูลอะไรอยู่
 * แถวไหน ครบเท่าคอลัมน์ของตารางสูตรอาหาร
 *
 * ระดับความยากเป็นข้อความธรรมดา ไม่ใช่ badge สี — ของเดิม map EASY/MEDIUM/HARD
 * เป็น success/warning/destructive ซึ่งเป็นการยืม token ความหมาย "ดี/เตือน/ผิด"
 * มาใช้กับข้อมูลที่ไม่ได้ดีหรือแย่ (สูตรยากไม่ใช่ error) และทำให้การ์ดมีสองสี
 * ขึ้นไปต่อใบ ผิดกฎ single accent ของ DESIGN.md
 *
 * @param props.item - ข้อมูลสูตรอาหาร
 * @param props.cuisines - รายการ cuisine (resolve ชื่อจาก id)
 * @param props.categories - รายการหมวด (resolve ชื่อจาก id)
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onDelete - callback เมื่อกดปุ่มลบ
 */
export default function RecipeCard({
  item,
  cuisines,
  categories,
  onEdit,
  onDelete,
}: RecipeCardProps) {
  const t = useTranslations("operationPlan.recipe");
  const tfl = useTranslations("field");
  const { dateTimeFormat } = useProfile();

  const cuisineName = cuisines.find((c) => c.id === item.cuisine_id)?.name;
  const categoryName = categories.find((c) => c.id === item.category_id)?.name;
  const totalTime = (item.prep_time ?? 0) + (item.cook_time ?? 0);

  return (
    <ListCard
      title={item.name || "..."}
      badge={<StatusBadge active={item.is_active} />}
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      {item.code && <ListCardRow label={tfl("code")}>{item.code}</ListCardRow>}
      {cuisineName && (
        <ListCardRow label={tfl("cuisine")}>{cuisineName}</ListCardRow>
      )}
      {categoryName && (
        <ListCardRow label={tfl("category")}>{categoryName}</ListCardRow>
      )}
      {item.difficulty && (
        <ListCardRow label={tfl("difficulty")}>{item.difficulty}</ListCardRow>
      )}
      {totalTime > 0 && (
        <ListCardRow label={tfl("totalTime")}>
          <span className="tabular-nums">
            {totalTime}{" "}
            <span className="text-muted-foreground font-normal">
              {t("minShort")}
            </span>
          </span>
        </ListCardRow>
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
