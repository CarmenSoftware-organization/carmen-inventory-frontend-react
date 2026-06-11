
import { useState } from "react";
import { useTranslations } from "use-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useItemGroup } from "@/hooks/use-item-group";
import type { ItemGroupDto } from "@/types/category";
import { Badge } from "@/components/ui/badge";
import { LookupCombobox } from "./lookup-combobox";

interface LookupItemGroupProps {
  readonly value: string;
  readonly onValueChange: (value: string, item?: ItemGroupDto) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm";
  readonly filterSubCategoryId?: string;
  readonly defaultLabel?: string;
  readonly error?: string;
}

/**
 * Lookup Popover สำหรับเลือกกลุ่มสินค้า (Item Group)
 *
 * ดึงข้อมูลผ่าน `useItemGroup({ perpage: -1 })` filter เฉพาะ `is_active = true`
 * รองรับ cascading จาก `filterSubCategoryId` (กรองตาม product_subcategory_id)
 * มีปุ่ม "none" สำหรับล้างค่า และ onValueChange ส่ง object `ItemGroupDto` เต็ม
 *
 * @param value - id ของ item group ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่ง id และ object ItemGroupDto
 * @returns JSX popover element ของ item group lookup
 * @example
 * ```tsx
 * const subCategoryId = useWatch({ control, name: "product_subcategory_id" });
 * <Controller name="item_group_id" control={control} render={({ field }) => (
 *   <LookupItemGroup value={field.value} onValueChange={field.onChange} filterSubCategoryId={subCategoryId} />
 * )} />
 * ```
 */
export function LookupItemGroup({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  size = "sm",
  filterSubCategoryId,
  defaultLabel,
  error,
}: LookupItemGroupProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  // Lazy: ยิง API ตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)
  const [hasOpened, setHasOpened] = useState(false);

  const { data, isLoading } = useItemGroup(
    { perpage: -1 },
    { enabled: hasOpened || !!value },
  );

  const itemGroups = (data?.data ?? []).filter((g) => {
    if (!g.is_active) return false;
    if (filterSubCategoryId && g.product_subcategory_id !== filterSubCategoryId) return false;
    return true;
  });

  return (
    <LookupCombobox
      value={value}
      onValueChange={onValueChange}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={itemGroups}
      getId={(g) => g.id}
      getLabel={(g) => `${g.code} — ${g.name}`}
      getSearchValue={(g) => `${g.code} ${g.name}`}
      size={size}
      renderItem={(g) => (
        <>
          <Badge size="xs" variant="secondary">
            {g.code}
          </Badge>
          <span className="flex-1 truncate text-left text-xs">{g.name}</span>
        </>
      )}
      placeholder={placeholder ?? tl("select", { entity: tfl("itemGroup") })}
      searchPlaceholder={tl("search", { entity: tfl("itemGroup") })}
      disabled={disabled}
      className={className}
      defaultLabel={defaultLabel}
      emptyTitle={tl("noDefined", { entity: tfl("itemGroup") })}
      emptyDescription={tl("noDefined", { entity: tfl("itemGroup") })}
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
