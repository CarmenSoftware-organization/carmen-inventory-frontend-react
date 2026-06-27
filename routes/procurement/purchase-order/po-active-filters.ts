import type { ActiveFilter } from "@/components/ui/active-filter-bar";

interface TypeOption {
  label: string;
  value: string;
}

interface UsePoActiveFiltersArgs {
  filter: string;
  setFilter: (value: string) => void;
  poType: string;
  setPoType: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  typeOptions: TypeOption[];
}

/**
 * แปลง filter ปัจจุบันของหน้า Purchase Order (filter / po_type / search) เป็น
 * ActiveFilter badges พร้อม `onRemove` รายตัว และ `clearAllFilters`
 *
 * ดึงออกจาก `PoComponent` เพื่อลดขนาด component — `typeOptions` ส่งเข้ามาเพราะ
 * component ยังใช้ render ตัวเลือกใน filter UI ด้วย
 *
 * @param args - ค่า filter ปัจจุบัน + setter + ตัวเลือก po_type สำหรับ map label
 * @returns `activeFilters` (badge list) และ `clearAllFilters`
 */
export function usePoActiveFilters({
  filter,
  setFilter,
  poType,
  setPoType,
  search,
  setSearch,
  typeOptions,
}: UsePoActiveFiltersArgs): {
  activeFilters: ActiveFilter[];
  clearAllFilters: () => void;
} {
  const clearAllFilters = () => {
    setFilter("");
    setSearch("");
    setPoType("");
  };

  const activeFilters: ActiveFilter[] = [];
  if (filter) {
    activeFilters.push({
      key: `filter-${filter}`,
      label: filter,
      onRemove: () => setFilter(""),
    });
  }
  if (poType) {
    for (const v of poType.split(",")) {
      const opt = typeOptions.find((o) => o.value === v);
      if (opt) {
        activeFilters.push({
          key: `type-${v}`,
          label: `Type: ${opt.label}`,
          onRemove: () => {
            const next = poType
              .split(",")
              .filter((x) => x !== v)
              .join(",");
            setPoType(next);
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
