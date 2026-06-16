import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EquipmentCategory } from "@/types/equipment-category";

interface EquipmentCategoryCardProps {
  readonly item: EquipmentCategory;
  readonly index?: number;
  readonly onEdit: (item: EquipmentCategory) => void;
}

/**
 * การ์ดแสดงข้อมูลหมวดหมู่อุปกรณ์สำหรับ grid view
 * @param props - ข้อมูลหมวดหมู่, index และ callback แก้ไข
 * @returns React element การ์ดหมวดหมู่อุปกรณ์
 * @example
 * <EquipmentCategoryCard item={item} index={0} onEdit={setSelected} />
 */
export default function EquipmentCategoryCard({
  item,
  index,
  onEdit,
}: EquipmentCategoryCardProps) {
  const ts = useTranslations("status");

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onEdit(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(item);
        }
      }}
      className="hover:border-primary/30 focus-visible:ring-ring cursor-pointer gap-0 py-0 transition-all hover:shadow-md focus-visible:ring-2"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <CardTitle className="text-sm flex-1 min-w-0 break-words leading-tight">
            {item.name || "..."}
          </CardTitle>
        </div>
        <CardAction>
          <Badge
            variant={item.is_active ? "success" : "secondary"}
            size="xs"
            className="text-xs"
          >
            {item.is_active ? ts("active") : ts("inactive")}
          </Badge>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
