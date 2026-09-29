import { useState } from "react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { useCnReason } from "@/hooks/use-cn-reason";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import type { CnReason } from "@/types/cn-reason";
import { LookupCombobox } from "./lookup-combobox";

interface LookupCnReasonProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
  readonly readOnly?: boolean;
}

export function LookupCnReason({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  size = "sm",
  error,
  readOnly,
}: LookupCnReasonProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  // credit-note-reasons ไม่มีคอลัมน์ is_active — ส่ง is_active filter แล้ว 400
  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<CnReason>({
      useListHook: useCnReason,
      search,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });

  return (
    <LookupCombobox
      allowDeselect={false}
      size={size}
      value={value}
      onValueChange={(id) => onValueChange(id)}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={items}
      selectedItems={selectedItems}
      getId={(r) => r.id}
      getLabel={(r) => r.name}
      placeholder={placeholder ?? tl("select", { entity: tfl("cnReason") })}
      searchPlaceholder={tl("search", { entity: tfl("cnReason") })}
      disabled={disabled}
      className={cn("w-full", className)}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      isLoading={isLoading}
      error={error}
      readOnly={readOnly}
    />
  );
}
