
import { useState } from "react";
import { useTranslations } from "use-intl";
import { useEquipmentCategory } from "@/hooks/use-equipment-category";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import { LookupCombobox } from "./lookup-combobox";

interface LookupEquipmentCategoryProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly excludeIds?: Set<string>;
  readonly error?: string;
}

/**
 * Lookup Popover สำหรับเลือกหมวดหมู่ของอุปกรณ์ (Equipment Category)
 *
 * ดึงข้อมูลผ่าน `useEquipmentCategory` hook พร้อม server-side search และ infinite scroll
 * (perpage 30) filter เฉพาะ `is_active = true` และรองรับ `excludeIds` กัน duplicate
 *
 * @param value - id ของ equipment category ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่งเฉพาะ id
 * @returns JSX popover element ของ equipment category lookup
 * @example
 * ```tsx
 * <Controller name="equipment_category_id" control={form.control} render={({ field }) => (
 *   <LookupEquipmentCategory value={field.value} onValueChange={field.onChange} />
 * )} />
 * ```
 */
export function LookupEquipmentCategory({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  excludeIds,
  error,
}: LookupEquipmentCategoryProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  // Lazy: ยิง API ตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)
  const [hasOpened, setHasOpened] = useState(false);

  const { items: categories, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination({
      useListHook: useEquipmentCategory,
      search,
      perpage: 30,
      enabled: hasOpened || !!value,
      filter: (v: { id: string; is_active: boolean }) => {
        if (!v.is_active) return false;
        if (excludeIds?.has(v.id)) return false;
        return true;
      },
    });

  return (
    <LookupCombobox
      value={value}
      onValueChange={(id) => onValueChange(id)}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={categories}
      getId={(c) => c.id}
      getLabel={(c) => c.name}
      placeholder={placeholder ?? tl("select", { entity: tfl("category") })}
      searchPlaceholder={tl("search", { entity: tfl("category") })}
      disabled={disabled}
      className={className}
      isLoading={isLoading}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      error={error}
    />
  );
}
