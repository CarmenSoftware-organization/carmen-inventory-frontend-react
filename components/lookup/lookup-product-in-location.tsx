
import { useState } from "react";
import { useTranslations } from "use-intl";
import { PackageSearch } from "lucide-react";
import { useProductsByLocation } from "@/hooks/use-products-by-location";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import type { Product } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { LookupCombobox } from "./lookup-combobox";

interface LookupProductInLocationProps {
  readonly locationId: string;
  readonly value: string;
  readonly onValueChange: (value: string, product?: Product) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly excludeIds?: string[];
  readonly modal?: boolean;
  readonly defaultLabel?: string;
  readonly disableTooltip?: boolean;
  readonly error?: string;
  readonly readOnly?: boolean;
}

/**
 * Lookup Popover สำหรับเลือกสินค้าที่มีอยู่ใน location ที่กำหนด (cascading)
 *
 * ใช้ `useProductsByLocation(locationId)` ดึงเฉพาะสินค้าที่ผูกกับ location นั้น ๆ
 * พร้อม server-side search และ infinite scroll (perpage 30) disabled เมื่อไม่มี `locationId`
 * รองรับ `excludeIds` กัน duplicate ใน item list
 *
 * @param value - product_id ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่ง id และ object Product
 * @returns JSX popover element ของ product-in-location lookup
 * @example
 * ```tsx
 * const locationId = useWatch({ control, name: "location_id" });
 * <Controller name="product_id" control={control} render={({ field }) => (
 *   <LookupProductInLocation locationId={locationId} value={field.value} onValueChange={field.onChange} />
 * )} />
 * ```
 */
export function LookupProductInLocation({
  locationId,
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  excludeIds,
  modal,
  defaultLabel,
  disableTooltip,
  error,
  readOnly,
}: LookupProductInLocationProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");

  const excludedSet = excludeIds ? new Set(excludeIds) : undefined;

  const useListHook = (params: { search?: string; perpage: number; page?: number }) =>
    useProductsByLocation(locationId || undefined, params);

  const { items: products, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<Product>({
      useListHook,
      search,
      perpage: 30,
      filter: (p: Product) => {
        if (excludedSet && excludedSet.has(p.id)) return false;
        return true;
      },
    });

  return (
    <LookupCombobox
      value={value}
      onValueChange={onValueChange}
      items={products}
      getId={(p) => p.id}
      getLabel={(p) => `${p.code} — ${p.name}`}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      renderItem={(p) => (
        <>
          <Badge size="xs" variant="secondary" className="shrink-0">
            {p.code}
          </Badge>
          <span className="flex-1 text-left truncate">{p.name}</span>
        </>
      )}
      placeholder={placeholder ?? tl("select", { entity: tfl("product") })}
      searchPlaceholder={tl("search", { entity: tfl("product") })}
      disabled={disabled || !locationId}
      className={className}
      popoverWidth="w-90"
      popoverAlign="start"
      emptyIcon={PackageSearch}
      emptyTitle={tl("noFound", { entity: tfl("product") })}
      emptyDescription={tl("noFoundDesc")}
      isLoading={isLoading}
      modal={modal}
      defaultLabel={defaultLabel}
      disableTooltip={disableTooltip}
      error={error}
      readOnly={readOnly}
    />
  );
}
