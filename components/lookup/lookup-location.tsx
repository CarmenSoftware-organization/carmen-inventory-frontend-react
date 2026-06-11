
import { useState } from "react";
import { useTranslations } from "use-intl";
import { Warehouse } from "lucide-react";
import { useLocation } from "@/hooks/use-location";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import type { Location } from "@/types/location";
import { INVENTORY_TYPE } from "@/constant/location";
import { Badge } from "@/components/ui/badge";
import { LookupCombobox } from "./lookup-combobox";

interface LookupLocationProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (location: Location) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly excludeIds?: string[];
  readonly defaultLabel?: string;
  readonly size?: "xs" | "sm";
  readonly popoverWidth?: string;
  readonly modal?: boolean;
  readonly locationTypes?: INVENTORY_TYPE[];
  readonly error?: string;
  readonly readOnly?: boolean;
}

const TYPE_VARIANT: Record<string, "info" | "warning" | "secondary"> = {
  inventory: "info",
  direct: "warning",
  consignment: "secondary",
};

/**
 * Lookup Popover สำหรับเลือก Location (สถานที่เก็บสินค้า)
 *
 * ดึงข้อมูลผ่าน `useLocation` hook พร้อม server-side search และ infinite scroll (perpage 30)
 * filter `is_active = true` รองรับ `excludeIds` กัน duplicate และ `locationTypes` filter
 * ตามประเภท (inventory/direct/consignment) พร้อม badge แสดงประเภทใน item มี `onItemChange`
 * ส่ง object `Location` เต็ม
 *
 * @param value - id ของ location ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่งเฉพาะ id
 * @returns JSX popover element ของ location lookup
 * @example
 * ```tsx
 * <Controller name="location_id" control={control} render={({ field }) => (
 *   <LookupLocation value={field.value} onValueChange={field.onChange} locationTypes={["inventory"]} />
 * )} />
 * ```
 */
export function LookupLocation({
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  excludeIds,
  defaultLabel,
  size = "sm",
  popoverWidth,
  modal,
  locationTypes,
  error,
  readOnly,
}: LookupLocationProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  // Lazy: ยิง API ตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)
  const [hasOpened, setHasOpened] = useState(false);

  const excludedSet = excludeIds ? new Set(excludeIds) : undefined;

  const { items: locations, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<Location>({
      useListHook: useLocation,
      search,
      perpage: 30,
      enabled: hasOpened || !!value,
      filter: (l: Location) => {
        if (!l.is_active) return false;
        if (excludedSet && excludedSet.has(l.id)) return false;
        if (locationTypes && !locationTypes.includes(l.location_type))
          return false;
        return true;
      },
    });

  return (
    <LookupCombobox
      value={value}
      onValueChange={(id, item) => {
        onValueChange(id);
        if (item) onItemChange?.(item);
      }}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={locations}
      getId={(l) => l.id}
      getLabel={(l) => `${l.code} — ${l.name}`}
      size={size}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      renderItem={(l) => (
        <>
          <Badge size="xs" variant="secondary" className="shrink-0">
            {l.code}
          </Badge>
          <span className="flex-1 truncate text-left">{l.name}</span>
          <Badge size="xs" variant={TYPE_VARIANT[l.location_type]}>
            {l.location_type.toUpperCase()}
          </Badge>
        </>
      )}
      placeholder={placeholder ?? tl("select", { entity: tfl("location") })}
      searchPlaceholder={tl("search", { entity: tfl("location") })}
      disabled={disabled}
      className={className}
      popoverAlign="start"
      emptyIcon={Warehouse}
      emptyTitle={tl("noDefined", { entity: tfl("location") })}
      emptyDescription={tl("noDefined", { entity: tfl("location") })}
      defaultLabel={defaultLabel}
      isLoading={isLoading}
      popoverWidth={popoverWidth}
      modal={modal}
      error={error}
      readOnly={readOnly}
    />
  );
}
