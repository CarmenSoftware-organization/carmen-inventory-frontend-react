
import { useState } from "react";
import { useTranslations } from "use-intl";
import { useCuisine } from "@/hooks/use-cuisine";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import { LookupCombobox } from "./lookup-combobox";

interface LookupCuisineProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly error?: string;
}

/**
 * Lookup Popover สำหรับเลือกประเภทอาหาร (Cuisine)
 *
 * ดึงข้อมูลผ่าน `useCuisine` hook พร้อม server-side search และ infinite scroll
 * ผ่าน `useLookupPagination` (perpage 30) โดย filter เฉพาะ `is_active = true`
 *
 * @param value - id ของ cuisine ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่งเฉพาะ id
 * @returns JSX popover element ของ cuisine lookup
 * @example
 * ```tsx
 * <Controller name="cuisine_id" control={form.control} render={({ field }) => (
 *   <LookupCuisine value={field.value} onValueChange={field.onChange} />
 * )} />
 * ```
 */
export function LookupCuisine({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  error,
}: LookupCuisineProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  // Lazy: ยิง API ตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)
  const [hasOpened, setHasOpened] = useState(false);

  const { items: cuisines, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination({
      useListHook: useCuisine,
      search,
      perpage: 30,
      enabled: hasOpened || !!value,
      filter: (v: { is_active: boolean }) => v.is_active,
    });

  return (
    <LookupCombobox
      value={value}
      onValueChange={(id) => onValueChange(id)}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={cuisines}
      getId={(c) => c.id}
      getLabel={(c) => c.name}
      placeholder={placeholder ?? tl("select", { entity: tfl("cuisine") })}
      searchPlaceholder={tl("search", { entity: tfl("cuisine") })}
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
