
import { useState } from "react";
import { useTranslations } from "use-intl";
import { WarehouseIcon } from "lucide-react";
import { useVendor } from "@/hooks/use-vendor";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
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
  error,
  readOnly,
}: LookupVendorProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  // Lazy: ยิง API ตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)
  const [hasOpened, setHasOpened] = useState(false);

  const {
    items: vendors,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<Vendor>({
    useListHook: useVendor,
    search,
    perpage: 30,
    enabled: hasOpened || !!value,
    filter: (v: Vendor) => {
      if (!v.is_active) return false;
      if (excludeIds?.has(v.id)) return false;
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
      items={vendors}
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
