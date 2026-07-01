import { useState } from "react";
import { useTranslations } from "use-intl";
import { Warehouse } from "lucide-react";
import { useLocationsByProduct } from "@/hooks/use-locations-by-product";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import type { Location } from "@/types/location";
import { Badge } from "@/components/ui/badge";
import { LookupCombobox } from "./lookup-combobox";

interface LookupProductLocationProps {
  readonly productId: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (location: Location) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly excludeIds?: string[];
  readonly modal?: boolean;
  readonly defaultLabel?: string;
  readonly error?: string;
  readonly readOnly?: boolean;
  /** เปิด popover อัตโนมัติตอน mount (เช่น auto-focus หลังเพิ่ม location ใหม่) */
  readonly defaultOpen?: boolean;
}

const TYPE_VARIANT: Record<string, "info" | "warning" | "secondary"> = {
  inventory: "info",
  direct: "warning",
  consignment: "secondary",
};

/**
 * Lookup Popover สำหรับเลือก location ที่มีสินค้าชิ้นนั้น ๆ อยู่ (cascading จาก productId)
 *
 * ใช้ `useLocationsByProduct(productId)` ดึงเฉพาะ location ที่ผูกกับ product นั้น
 * พร้อม server-side search และ infinite scroll (perpage 30) disabled เมื่อไม่มี `productId`
 * มี `onItemChange` ส่ง object `Location` เต็ม
 *
 * @param value - location id ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่งเฉพาะ id
 * @returns JSX popover element ของ product-location lookup
 * @example
 * ```tsx
 * const productId = useWatch({ control, name: "product_id" });
 * <Controller name="location_id" control={control} render={({ field }) => (
 *   <LookupProductLocation productId={productId} value={field.value} onValueChange={field.onChange} />
 * )} />
 * ```
 */
export function LookupProductLocation({
  productId,
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  excludeIds,
  modal,
  defaultLabel,
  error,
  readOnly,
  defaultOpen,
}: LookupProductLocationProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");

  const excludedSet = excludeIds ? new Set(excludeIds) : undefined;

  const useListHook = (params: {
    search?: string;
    perpage: number;
    page?: number;
  }) => useLocationsByProduct(productId || undefined, params);

  const {
    items: locations,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<Location>({
    useListHook,
    search,
    perpage: 30,
    filter: (l: Location) => {
      if (excludedSet && excludedSet.has(l.id)) return false;
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
      items={locations}
      getId={(l) => l.id}
      getLabel={(l) => `${l.code} — ${l.name}`}
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
      disabled={disabled || !productId}
      className={className}
      popoverAlign="start"
      popoverWidth="w-[26.25rem]"
      emptyIcon={Warehouse}
      emptyTitle={tl("noFound", { entity: tfl("location") })}
      emptyDescription={tl("noFoundDesc")}
      isLoading={isLoading}
      modal={modal}
      defaultLabel={defaultLabel}
      error={error}
      readOnly={readOnly}
      defaultOpen={defaultOpen}
    />
  );
}
