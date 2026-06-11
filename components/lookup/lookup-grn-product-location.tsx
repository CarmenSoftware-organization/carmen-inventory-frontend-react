
import { useState } from "react";
import { useTranslations } from "use-intl";
import { Warehouse } from "lucide-react";
import { useGrnProductLocations } from "@/hooks/use-goods-receive-note";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import type { GrnLocationItem } from "@/types/goods-receive-note";
import { Badge } from "@/components/ui/badge";
import { LookupCombobox } from "./lookup-combobox";

interface LookupGrnProductLocationProps {
  readonly grnId: string | undefined;
  readonly productId: string | undefined;
  readonly value: string;
  readonly onValueChange: (value: string, location?: GrnLocationItem) => void;
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
 * Lookup location ของ product ใน GRN ที่กำหนด (cascading: grnId + productId)
 *
 * เรียก endpoint `/good-received-note/:grn_id/product/:product_id/location`
 * คืนเฉพาะ location ที่ product นั้นถูกรับเข้าใน GRN ปัจจุบัน
 *
 * @example
 * ```tsx
 * const grnId = useWatch({ control, name: "grn_id" });
 * const productId = useWatch({ control, name: `items.${i}.item_id` });
 * <LookupGrnProductLocation grnId={grnId} productId={productId} value={field.value} onValueChange={field.onChange} />
 * ```
 */
export function LookupGrnProductLocation({
  grnId,
  productId,
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
}: LookupGrnProductLocationProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");

  const excludedSet = excludeIds ? new Set(excludeIds) : undefined;

  const useListHook = (params: { search?: string; perpage: number; page?: number }) =>
    useGrnProductLocations(grnId, productId, params);

  const { items: locations, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<GrnLocationItem>({
      useListHook,
      search,
      perpage: 30,
      resetDeps: [grnId, productId],
      filter: (l: GrnLocationItem) => {
        if (excludedSet && excludedSet.has(l.location_id)) return false;
        return true;
      },
    });

  return (
    <LookupCombobox
      value={value}
      onValueChange={onValueChange}
      items={locations}
      getId={(l) => l.location_id}
      getLabel={(l) => `${l.location_code} — ${l.location_name}`}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      renderItem={(l) => (
        <>
          <Badge size="xs" variant="secondary" className="shrink-0">
            {l.location_code}
          </Badge>
          <span className="flex-1 text-left truncate">{l.location_name}</span>
        </>
      )}
      placeholder={placeholder ?? tl("select", { entity: tfl("location") })}
      searchPlaceholder={tl("search", { entity: tfl("location") })}
      disabled={disabled || !grnId || !productId}
      className={className}
      popoverWidth="w-90"
      popoverAlign="start"
      emptyIcon={Warehouse}
      emptyTitle={tl("noFound", { entity: tfl("location") })}
      emptyDescription={tl("noFoundDesc")}
      isLoading={isLoading}
      modal={modal}
      defaultLabel={defaultLabel}
      disableTooltip={disableTooltip}
      error={error}
    />
  );
}
