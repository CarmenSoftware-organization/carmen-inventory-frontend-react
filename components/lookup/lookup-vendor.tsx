import { useState } from "react";
import { useTranslations } from "use-intl";
import { WarehouseIcon } from "lucide-react";
import { useVendor } from "@/hooks/use-vendor";
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import type { Vendor } from "@/types/vendor";
import { Badge } from "@/components/ui/badge";
import { LookupCombobox } from "./lookup-combobox";

interface LookupVendorProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (vendor: Vendor) => void;
  readonly excludeIds?: Set<string>;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly defaultLabel?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
  readonly readOnly?: boolean;
}

export function LookupVendor({
  value,
  onValueChange,
  onItemChange,
  excludeIds,
  disabled,
  placeholder,
  defaultLabel,
  className,
  size,
  error,
  readOnly,
}: LookupVendorProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  // Lazy: ยิงรายการตอนเปิด popover ครั้งแรก — ชื่อของค่าที่เลือกดึงตาม id แยก (selectedIds)
  const [hasOpened, setHasOpened] = useState(false);

  const {
    items: vendors,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<Vendor>({
    useListHook: useVendor,
    search,
    serverFilter: ACTIVE_ONLY_FILTER,
    enabled: hasOpened,
    selectedIds: value ? [value] : [],
    filter: excludeIds ? (v) => !excludeIds.has(v.id) : undefined,
  });

  return (
    <LookupCombobox
      size={size}
      value={value}
      onValueChange={(id, item) => {
        onValueChange(id);
        if (item) onItemChange?.(item);
      }}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={vendors}
      selectedItems={selectedItems}
      getId={(v) => v.id}
      getLabel={(v) => v.name}
      getSearchValue={(v) => `${v.code} ${v.name}`}
      renderItem={(v) => (
        <>
          <Badge size="xs" variant="secondary" className="shrink-0">
            {v.code}
          </Badge>
          <span className="flex-1 truncate text-left">{v.name}</span>
        </>
      )}
      renderSelected={(v) => `${v.code} - ${v.name}`}
      defaultLabel={defaultLabel}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      placeholder={placeholder ?? tl("select", { entity: tfl("vendor") })}
      searchPlaceholder={tl("search", { entity: tfl("vendor") })}
      disabled={disabled}
      className={className}
      popoverWidth="w-90"
      popoverAlign="start"
      emptyIcon={WarehouseIcon}
      emptyTitle={tl("noFound", { entity: tfl("vendor") })}
      emptyDescription={tl("noFoundDesc")}
      isLoading={isLoading}
      error={error}
      readOnly={readOnly}
    />
  );
}
