
import { useState } from "react";
import { useTranslations } from "use-intl";
import { PackageSearch } from "lucide-react";
import { useGrnProducts } from "@/hooks/use-goods-receive-note";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import type { GrnProductItem } from "@/types/goods-receive-note";
import { Badge } from "@/components/ui/badge";
import { LookupCombobox } from "./lookup-combobox";

interface LookupGrnProductProps {
  readonly grnId: string | undefined;
  readonly value: string;
  readonly onValueChange: (value: string, product?: GrnProductItem) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly excludeIds?: string[];
  readonly modal?: boolean;
  readonly defaultLabel?: string;
  readonly disableTooltip?: boolean;
  readonly error?: string;
}

/**
 * Lookup สินค้าที่อยู่ใน GRN ที่กำหนด (cascading จาก grnId)
 *
 * เรียก endpoint `/good-received-note/:grn_id/product` — คืนเฉพาะ product
 * ที่ถูกรับเข้าใน GRN นั้น ใช้กับฟอร์ม CN/PR ที่อ้างอิง GRN
 *
 * @example
 * ```tsx
 * const grnId = useWatch({ control, name: "grn_id" });
 * <LookupGrnProduct grnId={grnId} value={field.value} onValueChange={field.onChange} />
 * ```
 */
export function LookupGrnProduct({
  grnId,
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
}: LookupGrnProductProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");

  const excludedSet = excludeIds ? new Set(excludeIds) : undefined;

  const useListHook = (params: { search?: string; perpage: number; page?: number }) =>
    useGrnProducts(grnId, params);

  const { items: products, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<GrnProductItem>({
      useListHook,
      search,
      perpage: 30,
      resetDeps: [grnId],
      filter: (p: GrnProductItem) => {
        if (excludedSet && excludedSet.has(p.product_id)) return false;
        return true;
      },
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
          <span className="flex-1 text-left truncate">{p.product_name}</span>
        </>
      )}
      placeholder={placeholder ?? tl("select", { entity: tfl("product") })}
      searchPlaceholder={tl("search", { entity: tfl("product") })}
      disabled={disabled || !grnId}
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
    />
  );
}
