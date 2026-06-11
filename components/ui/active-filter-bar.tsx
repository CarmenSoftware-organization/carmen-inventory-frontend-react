
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
export function ActiveFilterBar({
  filters,
  onClearAll,
}: ActiveFilterBarProps) {
  const tc = useTranslations("common");

  if (filters.length === 0) return null;

  return (
    <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto rounded-md bg-muted/30 px-2.5 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
      <span className="shrink-0 text-muted-foreground text-[0.625rem] sm:text-[0.6875rem]">
        {tc("activeFilter")}:
      </span>
      {filters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          size="xs"
          className="shrink-0 gap-1 text-[0.625rem] sm:text-[0.6875rem]"
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
        className="shrink-0 text-muted-foreground hover:text-foreground text-[0.625rem] underline sm:text-[0.6875rem]"
      >
        {tc("clearAll")}
      </button>
    </div>
  );
}
