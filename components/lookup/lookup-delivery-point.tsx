
import { useState } from "react";
import { useTranslations } from "use-intl";
import { useDeliveryPoint } from "@/hooks/use-delivery-point";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import { LookupCombobox } from "./lookup-combobox";

interface LookupDeliveryPointProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (item: { id: string; name: string }) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly disableTooltip?: boolean;
  readonly error?: string;
  readonly readOnly?: boolean;
}

export function LookupDeliveryPoint({
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  disableTooltip,
  error,
  readOnly,
}: LookupDeliveryPointProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  // Lazy: ยิง API ตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)
  const [hasOpened, setHasOpened] = useState(false);

  const {
    items: deliveryPoints,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination({
    useListHook: useDeliveryPoint,
    search,
    perpage: 30,
    enabled: hasOpened || !!value,
    filter: (d: { is_active: boolean }) => d.is_active,
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
      items={deliveryPoints}
      getId={(d) => d.id}
      getLabel={(d) => d.name}
      placeholder={
        placeholder ?? tl("select", { entity: tfl("deliveryPoint") })
      }
      searchPlaceholder={tl("search", { entity: tfl("deliveryPoint") })}
      disabled={disabled}
      className={className}
      isLoading={isLoading}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      disableTooltip={disableTooltip}
      error={error}
      readOnly={readOnly}
    />
  );
}
