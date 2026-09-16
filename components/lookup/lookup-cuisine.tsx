import { useState } from "react";
import { useTranslations } from "use-intl";
import { useCuisine } from "@/hooks/use-cuisine";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import { LookupCombobox } from "./lookup-combobox";

interface LookupCuisineProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
}

export function LookupCuisine({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  size,
  error,
}: LookupCuisineProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  // Lazy: ยิง API ตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)
  const [hasOpened, setHasOpened] = useState(false);

  const {
    items: cuisines,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination({
    useListHook: useCuisine,
    search,
    perpage: 30,
    enabled: hasOpened || !!value,
    filter: (v: { is_active: boolean }) => v.is_active,
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
      getId={(c) => c.id}
      getLabel={(c) => c.name}
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
