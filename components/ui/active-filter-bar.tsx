import { useTranslations } from "use-intl";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ActiveFilter {
  readonly key: string;
  readonly label: string;
  readonly onRemove: () => void;
}

interface ActiveFilterBarProps {
  readonly filters: ActiveFilter[];
  readonly onClearAll: () => void;
}

/**
 * แถบแสดงฟิลเตอร์ที่กำลัง active ในรูป Badge พร้อมลบรายตัว/ล้างทั้งหมด
 *
 * ใช้ประกอบ list page toolbar หลังช่อง filter เมื่อผู้ใช้กดเลือก filter
 * จะมี chip ขึ้นให้เห็นพร้อมปุ่ม X ลบทีละตัว และปุ่ม "Clear all" ด้านท้าย
 * Mobile: scroll แนวนอน (flex-nowrap), Desktop: wrap หลายบรรทัด
 * Return null ถ้า filters ว่าง เพื่อไม่ใช้พื้นที่
 *
 * @param props - filters (ActiveFilter[]) และ onClearAll callback
 * @returns JSX element หรือ null
 * @example
 * ```tsx
 * <ActiveFilterBar
 *   filters={[{ key: "status", label: "Approved", onRemove: () => setStatus("") }]}
 *   onClearAll={clearAllFilters}
 * />
 * ```
 */
export function ActiveFilterBar({ filters, onClearAll }: ActiveFilterBarProps) {
  const tc = useTranslations("common");

  if (filters.length === 0) return null;

  return (
    <div className="bg-muted/30 flex [scrollbar-width:none] flex-nowrap items-center gap-1.5 overflow-x-auto rounded-md px-2 py-1.5 sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
      <span className="text-muted-foreground text-micro-legal sm:text-micro shrink-0">
        {tc("activeFilter")}:
      </span>
      {filters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          size="xs"
          className="text-micro-legal sm:text-micro shrink-0 gap-1"
        >
          {filter.label}
          <button
            type="button"
            onClick={filter.onRemove}
            aria-label={`Remove ${filter.label} filter`}
            className="hover:text-foreground -mr-0.5 rounded-full"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-muted-foreground hover:text-foreground text-micro-legal sm:text-micro shrink-0 underline"
      >
        {tc("clearAll")}
      </button>
    </div>
  );
}
