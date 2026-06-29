import { useTranslations } from "use-intl";
import type { ActiveFilter } from "@/components/ui/active-filter-bar";

interface StatusOption {
  label: string;
  value: string;
}

interface UseCnActiveFiltersArgs {
  filter: string;
  setFilter: (value: string) => void;
  cnType: string;
  setCnType: (value: string) => void;
  cnStatus: string;
  setCnStatus: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  typeOptions: StatusOption[];
  statusOptions: StatusOption[];
}

/**
 * แปลง filter ปัจจุบันของหน้า Credit Note (filter / cn_type / cn_status / search)
 * เป็น ActiveFilter badges พร้อม `onRemove` รายตัว และ `clearAllFilters`
 *
 * ดึงออกจาก `CnComponent` เพื่อลดขนาด component — `typeOptions`/`statusOptions`
 * ส่งเข้ามาเพราะ component ยังใช้ render ตัวเลือกใน filter UI ด้วย
 *
 * @param args - ค่า filter ปัจจุบัน + setter + ตัวเลือก type/status สำหรับ map label
 * @returns `activeFilters` (badge list) และ `clearAllFilters`
 */
export function useCnActiveFilters({
  filter,
  setFilter,
  cnType,
  setCnType,
  cnStatus,
  setCnStatus,
  search,
  setSearch,
  typeOptions,
  statusOptions,
}: UseCnActiveFiltersArgs): {
  activeFilters: ActiveFilter[];
  clearAllFilters: () => void;
} {
  const t = useTranslations("procurement.creditNote");

  const clearAllFilters = () => {
    setFilter("");
    setSearch("");
    setCnType("");
    setCnStatus("");
  };

  const activeFilters: ActiveFilter[] = [];
  if (filter) {
    activeFilters.push({
      key: `filter-${filter}`,
      label: filter,
      onRemove: () => setFilter(""),
    });
  }
  if (cnType) {
    for (const v of cnType.split(",")) {
      const opt = typeOptions.find((o) => o.value === v);
      if (opt) {
        activeFilters.push({
          key: `type-${v}`,
          label: `${t("type")}: ${opt.label}`,
          onRemove: () => {
            const next = cnType
              .split(",")
              .filter((x) => x !== v)
              .join(",");
            setCnType(next);
          },
        });
      }
    }
  }
  if (cnStatus) {
    for (const v of cnStatus.split(",")) {
      const opt = statusOptions.find((o) => o.value === v);
      if (opt) {
        activeFilters.push({
          key: `status-${v}`,
          label: `${t("status")}: ${opt.label}`,
          onRemove: () => {
            const next = cnStatus
              .split(",")
              .filter((x) => x !== v)
              .join(",");
            setCnStatus(next);
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
