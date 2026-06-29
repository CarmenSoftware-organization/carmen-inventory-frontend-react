import { useTranslations } from "use-intl";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import type { Unit } from "@/types/unit";

interface UnitCardProps {
  readonly item: Unit;
  readonly index?: number;
  readonly onEdit: (item: Unit) => void;
}

/**
 * การ์ดแสดงข้อมูล Unit สำหรับมุมมอง mobile
 *
 * ใช้ภายใน `ConfigListTemplate` ผ่าน prop `renderCard` เมื่ออยู่ใน
 * มุมมอง card แสดงชื่อ Unit และสถานะ active/inactive
 *
 * @param props - ข้อมูล item, index และ callback onEdit
 * @returns React element ของการ์ด Unit
 * @example
 * ```tsx
 * <UnitCard item={unit} index={0} onEdit={handleEdit} />
 * ```
 */
export default function UnitCard({ item, index, onEdit }: UnitCardProps) {
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
      className="cursor-pointer gap-0 py-0 transition-colors hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <CardTitle className="truncate text-sm flex-1 min-w-0">{item.name || "..."}</CardTitle>
        </div>
        <CardAction>
          <Badge
            variant={item.is_active ? "success" : "secondary"}
            size="sm"
            className="text-xs"
          >
            {item.is_active ? ts("active") : ts("inactive")}
          </Badge>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
