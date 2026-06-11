
import { useState } from "react";
import { useTranslations } from "use-intl";
import { PackageSearch } from "lucide-react";
import { useLocationPairProducts } from "@/hooks/use-location-pair-products";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import type { LocationPairProduct } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { LookupCombobox } from "./lookup-combobox";

interface LookupLocationPairProductProps {
  readonly fromLocationId: string;
  readonly toLocationId: string;
  readonly value: string;
  readonly onValueChange: (
    value: string,
    product?: LocationPairProduct,
  ) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly excludeIds?: string[];
  readonly modal?: boolean;
  readonly defaultLabel?: string;
  readonly error?: string;
}

/**
 * Lookup Popover สำหรับเลือกสินค้าที่มีอยู่ใน location ทั้งต้นทางและปลายทาง (Store Requisition)
 *
 * ใช้ `useLocationPairProducts(fromLocationId, toLocationId)` เพื่อดึงเฉพาะสินค้าที่มีใน
 * ทั้งสอง location พร้อม server-side search และ infinite scroll (perpage 30) disabled
 * เมื่อไม่มี from/to location ครบ รองรับ `excludeIds` กัน duplicate ใน item list
 *
 * @param value - product_id ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่ง id และ object LocationPairProduct
 * @returns JSX popover element ของ location pair product lookup
 * @example
 * ```tsx
 * <Controller name="product_id" control={control} render={({ field }) => (
 *   <LookupLocationPairProduct
 *     fromLocationId={fromId}
 *     toLocationId={toId}
 *     value={field.value}
 *     onValueChange={field.onChange}
 *   />
 * )} />
 * ```
 */
export function LookupLocationPairProduct({
  fromLocationId,
  toLocationId,
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  excludeIds,
  modal,
  defaultLabel,
  error,
}: LookupLocationPairProductProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");

  const excludedSet = excludeIds ? new Set(excludeIds) : undefined;

  const useListHook = (params: { search?: string; perpage: number; page?: number }) =>
    useLocationPairProducts(
      fromLocationId || undefined,
      toLocationId || undefined,
      params,
    );

  const {
    items: products,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<LocationPairProduct>({
    useListHook,
    search,
    perpage: 30,
    filter: (p: LocationPairProduct) => {
      if (excludedSet && excludedSet.has(p.product_id)) return false;
      return true;
    },
    resetDeps: [fromLocationId, toLocationId],
  });

  return (
    <LookupCombobox
      value={value}
      onValueChange={onValueChange}
      items={products}
      getId={(p) => p.product_id}
      getLabel={(p) => `${p.product_code} — ${p.product_name}`}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      renderItem={(p) => (
        <>
          <Badge size="xs" variant="secondary" className="shrink-0">
            {p.product_code}
          </Badge>
          <span className="flex-1 truncate text-left">{p.product_name}</span>
        </>
      )}
      placeholder={placeholder ?? tl("select", { entity: tfl("product") })}
      searchPlaceholder={tl("search", { entity: tfl("product") })}
      disabled={disabled || !fromLocationId || !toLocationId}
      className={className}
      popoverWidth="w-90"
      popoverAlign="start"
      emptyIcon={PackageSearch}
      emptyTitle={tl("noFound", { entity: tfl("product") })}
      emptyDescription={tl("noFoundDesc")}
      isLoading={isLoading}
      modal={modal}
      defaultLabel={defaultLabel}
      error={error}
    />
  );
}
