import { useTranslations } from "use-intl";
import type { ActiveFilter } from "@/components/ui/active-filter-bar";

interface StatusOption {
  label: string;
  value: string;
}

interface UseGrnActiveFiltersArgs {
  filter: string;
  setFilter: (value: string) => void;
  grnStatus: string;
  setGrnStatus: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  statusOptions: StatusOption[];
}

/**
 * แปลง filter ปัจจุบันของหน้า GRN (free-text filter / grn_status / search) เป็น
 * ActiveFilter badges พร้อม `onRemove` รายตัว และ `clearAllFilters`
 *
 * ดึงออกจาก `GrnComponent` เพื่อลดขนาด component และแยก logic filter ออกมา —
 * `statusOptions` ส่งเข้ามาเพราะ component ยังใช้ render ตัวเลือกใน filter UI ด้วย
 *
 * @param args - ค่า filter ปัจจุบัน + setter + ตัวเลือกสถานะสำหรับ map label
 * @returns `activeFilters` (badge list) และ `clearAllFilters`
 */
export function useGrnActiveFilters({
  filter,
  setFilter,
  grnStatus,
  setGrnStatus,
  search,
  setSearch,
  statusOptions,
}: UseGrnActiveFiltersArgs): {
  activeFilters: ActiveFilter[];
  clearAllFilters: () => void;
} {
  const t = useTranslations("procurement.goodsReceiveNote");

  const clearAllFilters = () => {
    setFilter("");
    setSearch("");
    setGrnStatus("");
  };

  const activeFilters: ActiveFilter[] = [];
  if (filter) {
    activeFilters.push({
      key: `filter-${filter}`,
      label: filter,
      onRemove: () => setFilter(""),
    });
  }
  if (grnStatus) {
    for (const v of grnStatus.split(",")) {
      const opt = statusOptions.find((o) => o.value === v);
      if (opt) {
        activeFilters.push({
          key: `status-${v}`,
          label: `${t("status")}: ${opt.label}`,
          onRemove: () => {
            const next = grnStatus
              .split(",")
              .filter((x) => x !== v)
              .join(",");
            setGrnStatus(next);
          },
        });
      }
    }
  }
  if (search) {
    activeFilters.push({
      key: `search-${search}`,
      label: `"${search}"`,
      onRemove: () => setSearch(""),
    });
  }

  return { activeFilters, clearAllFilters };
}
