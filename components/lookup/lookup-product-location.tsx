import { useState } from "react";
import { useTranslations } from "use-intl";
import { Warehouse } from "lucide-react";
import { useLocationsByProduct } from "@/hooks/use-locations-by-product";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import type { LocationOption } from "@/types/location";
import { Badge } from "@/components/ui/badge";
import { LocationTypeLabel } from "@/components/share/location-type-label";
import { LookupCombobox } from "./lookup-combobox";

interface LookupProductLocationProps {
  readonly productId: string;
  readonly workflowId?: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (location: LocationOption) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly excludeIds?: string[];
  readonly modal?: boolean;
  readonly defaultLabel?: string;
  readonly error?: string;
  readonly readOnly?: boolean;
  readonly defaultOpen?: boolean;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly nextFocusRef?: React.RefObject<HTMLElement | null>;
}

export function LookupProductLocation({
  productId,
  workflowId,
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  size,
  excludeIds,
  modal,
  defaultLabel,
  error,
  readOnly,
  defaultOpen,
  open,
  onOpenChange,
  nextFocusRef,
}: LookupProductLocationProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");

  const excludedSet = excludeIds ? new Set(excludeIds) : undefined;

  const useListHook = (params: {
    search?: string;
    perpage: number;
    page?: number;
  }) => useLocationsByProduct(productId || undefined, params, workflowId);

  const {
    items: locations,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<LocationOption>({
    useListHook,
    search,
    perpage: 30,
    filter: (l: LocationOption) => {
      if (excludedSet && excludedSet.has(l.id)) return false;
      return true;
    },
  });

  return (
    <LookupCombobox
      size={size}
      value={value}
      onValueChange={(id, item) => {
        onValueChange(id);
        if (item) onItemChange?.(item);
      }}
      items={locations}
      getId={(l) => l.id}
      getLabel={(l) => `${l.name} - ${l.code}`}
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
          <LocationTypeLabel type={l.location_type} className="shrink-0" />
        </>
      )}
      placeholder={placeholder ?? tl("select", { entity: tfl("location") })}
      searchPlaceholder={tl("search", { entity: tfl("location") })}
      disabled={disabled || !productId}
      className={className}
      popoverAlign="start"
      popoverWidth="w-[26.25rem]"
      emptyIcon={Warehouse}
      // ค้นแล้วไม่เจอ กับ "workflow นี้ไม่ให้สั่งสินค้าชิ้นนี้จากคลังไหนเลย" คนละเรื่องกัน
      // และผู้ใช้แก้คนละวิธี — อันแรกลบคำค้น อันหลังต้องไปเปลี่ยนสินค้า/เวิร์กโฟลว์
      emptyTitle={
        workflowId && !search
          ? tl("noLocationInScope")
          : tl("noFound", { entity: tfl("location") })
      }
      emptyDescription={
        workflowId && !search ? tl("noLocationInScopeDesc") : tl("noFoundDesc")
      }
      isLoading={isLoading}
      modal={modal}
      defaultLabel={defaultLabel}
      error={error}
      readOnly={readOnly}
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      nextFocusRef={nextFocusRef}
    />
  );
}
