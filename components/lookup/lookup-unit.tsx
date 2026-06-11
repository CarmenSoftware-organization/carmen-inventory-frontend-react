
import { useState } from "react";
import { useTranslations } from "use-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnitDialog } from "@/components/share/unit-dialog";
import { useUnit } from "@/hooks/use-unit";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import { LookupCombobox } from "./lookup-combobox";

interface LookupUnitProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly excludeIds?: string[];
  readonly size?: "xs" | "sm";
  readonly error?: string;
}

/**
 * Lookup Popover สำหรับเลือกหน่วยนับ (Unit)
 *
 * ดึงข้อมูลผ่าน `useUnit` hook พร้อม server-side search และ infinite scroll (perpage 30)
 * filter เฉพาะ `is_active = true` รองรับ `excludeIds` กัน duplicate
 * มีปุ่ม "+" เปิด `UnitDialog` เพื่อสร้างหน่วยใหม่แบบ inline และ auto-select หลัง create สำเร็จ
 *
 * @param value - unit id ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่งเฉพาะ id
 * @returns JSX popover element ของ unit lookup (พร้อม UnitDialog)
 * @example
 * ```tsx
 * <Controller name="unit_id" control={form.control} render={({ field }) => (
 *   <LookupUnit value={field.value} onValueChange={field.onChange} />
 * )} />
 * ```
 */
export function LookupUnit({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  excludeIds,
  size = "sm",
  error,
}: LookupUnitProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  // Lazy: ยิง API ตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)
  const [hasOpened, setHasOpened] = useState(false);
  const excludedSet = excludeIds ? new Set(excludeIds) : undefined;

  const { items: units, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination({
      useListHook: useUnit,
      search,
      perpage: 30,
      enabled: hasOpened || !!value,
      filter: (u: { id: string; is_active: boolean }) => {
        if (!u.is_active) return false;
        if (excludedSet && excludedSet.has(u.id)) return false;
        return true;
      },
    });

  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <LookupCombobox
        value={value}
        onValueChange={(id) => onValueChange(id)}
        onOpenChange={(open) => {
          if (open) setHasOpened(true);
        }}
        items={units}
        getId={(u) => u.id}
        getLabel={(u) => u.name}
        placeholder={placeholder ?? tl("select", { entity: tfl("unit") })}
        searchPlaceholder={tl("search", { entity: tfl("unit") })}
        disabled={disabled}
        isLoading={isLoading}
        className={className}
        serverSideSearch
        onSearchChange={setSearch}
        onLoadMore={loadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        size={size}
        error={error}
        headerSlot={
          <Button
            size="xs"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
            onClick={() => setDialogOpen(true)}
            type="button"
            aria-label={tl("addNew", { entity: tfl("unit") })}
          >
            <Plus className="h-3 w-3" />
          </Button>
        }
      />
      <UnitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={(id) => onValueChange(id)}
      />
    </>
  );
}
