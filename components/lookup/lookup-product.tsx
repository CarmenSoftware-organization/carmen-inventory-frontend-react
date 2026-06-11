
import { useState } from "react";
import { useTranslations } from "use-intl";
import { PackageSearch } from "lucide-react";
import { useProduct } from "@/hooks/use-product";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import type { Product } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { LookupCombobox } from "./lookup-combobox";

interface LookupProductProps {
  readonly value: string;
  readonly onValueChange: (value: string, product?: Product) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly excludeIds?: string[];
  readonly error?: string;
}

/**
 * Lookup Popover สำหรับเลือกสินค้า (Product)
 *
 * ดึงข้อมูลผ่าน `useProduct` hook พร้อม server-side search และ infinite scroll (perpage 30)
 * filter เฉพาะ `product_status_type === "active"` รองรับ `excludeIds` กัน duplicate ใน item list
 * onValueChange ส่งทั้ง id และ object `Product` เต็มสำหรับ side effects (set default unit, tax)
 *
 * @param value - product id ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่ง id และ object Product
 * @returns JSX popover element ของ product lookup
 * @example
 * ```tsx
 * <Controller name="product_id" control={control} render={({ field }) => (
 *   <LookupProduct value={field.value} onValueChange={(id, p) => {
 *     field.onChange(id);
 *     if (p) form.setValue("unit_id", p.inventory_unit_id);
 *   }} />
 * )} />
 * ```
 */
export function LookupProduct({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  excludeIds,
  error,
}: LookupProductProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  // Lazy: ยิง API ตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)
  const [hasOpened, setHasOpened] = useState(false);
  const excludedSet = excludeIds ? new Set(excludeIds) : undefined;

  const { items: products, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<Product>({
      useListHook: useProduct,
      search,
      perpage: 30,
      enabled: hasOpened || !!value,
      filter: (p: Product) => {
        if (p.product_status_type !== "active") return false;
        if (excludedSet && excludedSet.has(p.id)) return false;
        return true;
      },
    });

  return (
    <LookupCombobox
      value={value}
      onValueChange={onValueChange}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={products}
      getId={(p) => p.id}
      getLabel={(p) => `${p.code} — ${p.name}`}
      getSearchValue={(p) => `${p.code} ${p.name}`}
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
          <span className="flex-1 truncate text-left">{p.name}</span>
        </>
      )}
      placeholder={placeholder ?? tl("select", { entity: tfl("product") })}
      searchPlaceholder={tl("search", { entity: tfl("product") })}
      disabled={disabled}
      className={className}
      popoverAlign="start"
      popoverWidth="w-[26.25rem]"
      emptyIcon={PackageSearch}
      emptyTitle={tl("noFound", { entity: tfl("product") })}
      emptyDescription={tl("noFoundDesc")}
      isLoading={isLoading}
      error={error}
    />
  );
}
