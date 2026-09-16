import { useState } from "react";
import { useTranslations } from "use-intl";
import { usePriceListTemplate } from "@/hooks/use-price-list-template";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import type { PriceListTemplate } from "@/types/price-list-template";
import { LookupCombobox } from "./lookup-combobox";

interface LookupPrtProps {
  readonly value: string;
  readonly onValueChange: (value: string, template?: PriceListTemplate) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
}

export function LookupPrt({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  size,
  error,
}: LookupPrtProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  // Lazy: ยิง API ตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)
  const [hasOpened, setHasOpened] = useState(false);

  const {
    items: templates,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<PriceListTemplate>({
    useListHook: usePriceListTemplate,
    search,
    perpage: 30,
    enabled: hasOpened || !!value,
    filter: (t: PriceListTemplate) => t.status === "active",
  });

  return (
    <LookupCombobox
      size={size}
      value={value}
      onValueChange={(id, item) => onValueChange(id, item)}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={templates}
      getId={(t) => t.id}
      getLabel={(t) => t.name}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      placeholder={placeholder ?? tl("select", { entity: tfl("template") })}
      searchPlaceholder={tl("search", { entity: tfl("template") })}
      disabled={disabled}
      isLoading={isLoading}
      className={className}
      error={error}
    />
  );
}
