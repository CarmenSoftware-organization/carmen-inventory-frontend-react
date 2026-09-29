import { useState } from "react";
import { useTranslations } from "use-intl";
import { useCuisine } from "@/hooks/use-cuisine";
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import type { Cuisine } from "@/types/cuisine";
import { LookupCombobox } from "./lookup-combobox";

interface LookupCuisineProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
  /**
   * ป้ายของ `value` ที่รู้อยู่แล้วจากเอกสาร — list โหลดทีละหน้า ค่าที่อยู่หลังหน้าแรก
   * จะหาชื่อไม่เจอแล้วขึ้น placeholder ทั้งที่มีค่าอยู่
   */
  readonly defaultLabel?: string;
}

export function LookupCuisine({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  size,
  error,
  defaultLabel,
}: LookupCuisineProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  // Lazy: ยิงรายการตอนเปิด popover ครั้งแรก — ชื่อของค่าที่เลือกดึงตาม id แยก (selectedIds)
  const [hasOpened, setHasOpened] = useState(false);

  const {
    items: cuisines,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<Cuisine>({
    useListHook: useCuisine,
    search,
    serverFilter: ACTIVE_ONLY_FILTER,
    enabled: hasOpened,
    selectedIds: value ? [value] : [],
  });

  return (
    <LookupCombobox
      size={size}
      value={value}
      onValueChange={(id) => onValueChange(id)}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={cuisines}
      selectedItems={selectedItems}
      getId={(c) => c.id}
      getLabel={(c) => c.name}
      defaultLabel={defaultLabel}
      placeholder={placeholder ?? tl("select", { entity: tfl("cuisine") })}
      searchPlaceholder={tl("search", { entity: tfl("cuisine") })}
      disabled={disabled}
      className={className}
      isLoading={isLoading}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      error={error}
    />
  );
}
