import { Clock } from "lucide-react";
import { useTranslations } from "use-intl";
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
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
  const tfl = useTranslations("field");
  const { dateTimeFormat } = useProfile();
  const updatedAt = item.audit?.updated?.at;

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
      className="hover:border-primary/30 focus-visible:ring-ring cursor-pointer gap-0 py-0 transition-colors focus-visible:ring-2"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-micro-legal font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <CardTitle className="text-sm flex-1 min-w-0 break-words leading-tight">
            {item.name || "..."}
          </CardTitle>
        </div>
        <CardAction>
          <StatusBadge active={item.is_active} />
        </CardAction>
      </CardHeader>

      {updatedAt && (
        <>
          <Separator />
          <CardContent className="flex items-center gap-1.5 px-4 py-2 text-xs">
            <Clock
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="text-muted-foreground truncate">
              {tfl("updated")}: {formatDate(updatedAt, dateTimeFormat)}
            </span>
          </CardContent>
        </>
      )}
    </Card>
  );
}
