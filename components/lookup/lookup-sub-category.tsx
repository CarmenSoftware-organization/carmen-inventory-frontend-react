import { useState } from "react";
import { useTranslations } from "use-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubCategory } from "@/hooks/use-sub-category";
import type { SubCategoryDto } from "@/types/category";
import { Badge } from "@/components/ui/badge";
import { LookupCombobox } from "./lookup-combobox";

interface LookupSubCategoryProps {
  readonly value: string;
  readonly onValueChange: (value: string, item?: SubCategoryDto) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm";
  readonly filterCategoryId?: string;
  readonly defaultLabel?: string;
  readonly error?: string;
}

/**
 * กรอง sub-category ให้เหลือเฉพาะที่ active และ (ถ้ามี filterCategoryId) อยู่ใต้ category นั้น
 * แยกออกมาเป็น pure function เพื่อทดสอบ cascade filter ได้โดยตรง
 */
export function filterActiveSubCategories(
  items: SubCategoryDto[],
  filterCategoryId?: string,
): SubCategoryDto[] {
  return items.filter((sc) => {
    if (!sc.is_active) return false;
    if (filterCategoryId && sc.product_category_id !== filterCategoryId) return false;
    return true;
  });
}

/**
 * Lookup Popover สำหรับเลือกหมวดหมู่ย่อย (Sub Category)
 *
 * ดึงข้อมูลผ่าน `useSubCategory({ perpage: -1 })` แบบ lazy (เปิด popover ครั้งแรกหรือมีค่าเลือกไว้)
 * รองรับ cascading จาก `filterCategoryId` (กรองตาม product_category_id) มีปุ่ม "none" ล้างค่า
 *
 * @param value - id ของ sub-category ที่เลือกอยู่
 * @param onValueChange - callback ส่ง id และ object SubCategoryDto
 * @returns JSX popover element ของ sub-category lookup
 */
export function LookupSubCategory({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  size = "sm",
  filterCategoryId,
  defaultLabel,
  error,
}: LookupSubCategoryProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [hasOpened, setHasOpened] = useState(false);

  const { data, isLoading } = useSubCategory(
    { perpage: -1 },
    { enabled: hasOpened || !!value },
  );

  const subCategories = filterActiveSubCategories(data?.data ?? [], filterCategoryId);

  return (
    <LookupCombobox
      value={value}
      onValueChange={onValueChange}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={subCategories}
      getId={(s) => s.id}
      getLabel={(s) => `${s.code} — ${s.name}`}
      getSearchValue={(s) => `${s.code} ${s.name}`}
      size={size}
      renderItem={(s) => (
        <>
          <Badge size="xs" variant="secondary">
            {s.code}
          </Badge>
          <span className="flex-1 truncate text-left text-xs">{s.name}</span>
        </>
      )}
      placeholder={placeholder ?? tl("select", { entity: tfl("subCategory") })}
      searchPlaceholder={tl("search", { entity: tfl("subCategory") })}
      disabled={disabled}
      className={className}
      defaultLabel={defaultLabel}
      emptyTitle={tl("noDefined", { entity: tfl("subCategory") })}
      emptyDescription={tl("noDefined", { entity: tfl("subCategory") })}
      isLoading={isLoading}
      error={error}
      prependItems={
        <button
          type="button"
          aria-pressed={!value}
          className={cn(
            "relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-hidden select-none",
            "hover:bg-accent hover:text-accent-foreground",
          )}
          onClick={() => onValueChange("")}
        >
          {tl("none")}
          <Check
            className={cn(
              "ml-auto h-4 w-4 shrink-0",
              value ? "opacity-0" : "opacity-100",
            )}
          />
        </button>
      }
    />
  );
}
