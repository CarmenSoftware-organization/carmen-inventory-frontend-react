import { useState } from "react";
import { useTranslations } from "use-intl";
import { useRecipeCategory } from "@/hooks/use-recipe-category";
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import type { RecipeCategory } from "@/types/recipe-category";
import { LookupCombobox } from "./lookup-combobox";

interface LookupRecipeCategoryProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  /** ส่ง object เต็มของหมวดที่ผู้ใช้เพิ่งเลือก (ฟอร์มหมวดใช้คำนวณ level จากหมวดแม่) */
  readonly onItemChange?: (category: RecipeCategory) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly excludeIds?: Set<string>;
  readonly error?: string;
  /**
   * ป้ายของ `value` ที่รู้อยู่แล้วจากเอกสาร — list โหลดทีละหน้า ค่าที่อยู่หลังหน้าแรก
   * จะหาชื่อไม่เจอแล้วขึ้น placeholder ทั้งที่มีค่าอยู่
   */
  readonly defaultLabel?: string;
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
  onItemChange,
  disabled,
  placeholder,
  className,
  size,
  excludeIds,
  error,
  defaultLabel,
}: LookupRecipeCategoryProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  // Lazy: ยิงรายการตอนเปิด popover ครั้งแรก — ชื่อของค่าที่เลือกดึงตาม id แยก (selectedIds)
  const [hasOpened, setHasOpened] = useState(false);

  const {
    items: categories,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<RecipeCategory>({
    useListHook: useRecipeCategory,
    search,
    serverFilter: ACTIVE_ONLY_FILTER,
    enabled: hasOpened,
    selectedIds: value ? [value] : [],
    filter: excludeIds ? (c) => !excludeIds.has(c.id) : undefined,
  });

  return (
    <LookupCombobox
      size={size}
      value={value}
      onValueChange={(id, item) => {
        onValueChange(id);
        if (item) onItemChange?.(item);
      }}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={categories}
      selectedItems={selectedItems}
      getId={(c) => c.id}
      getLabel={(c) => c.name}
      defaultLabel={defaultLabel}
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
