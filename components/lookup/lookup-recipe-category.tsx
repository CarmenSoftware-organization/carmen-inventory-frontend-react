
import { useState } from "react";
import { useTranslations } from "use-intl";
import { useRecipeCategory } from "@/hooks/use-recipe-category";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import { LookupCombobox } from "./lookup-combobox";

interface LookupRecipeCategoryProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly excludeIds?: Set<string>;
  readonly error?: string;
}

/**
 * Lookup Popover สำหรับเลือกหมวดหมู่ของสูตรอาหาร (Recipe Category)
 *
 * ดึงข้อมูลผ่าน `useRecipeCategory` hook พร้อม server-side search และ infinite scroll
 * (perpage 30) filter เฉพาะ `is_active = true` และรองรับ `excludeIds` กัน duplicate
 *
 * @param value - recipe category id ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่งเฉพาะ id
 * @returns JSX popover element ของ recipe category lookup
 * @example
 * ```tsx
 * <Controller name="recipe_category_id" control={form.control} render={({ field }) => (
 *   <LookupRecipeCategory value={field.value} onValueChange={field.onChange} />
 * )} />
 * ```
 */
export function LookupRecipeCategory({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  excludeIds,
  error,
}: LookupRecipeCategoryProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  // Lazy: ยิง API ตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)
  const [hasOpened, setHasOpened] = useState(false);

  const { items: categories, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination({
      useListHook: useRecipeCategory,
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
