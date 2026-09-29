import { useState } from "react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { useCreditTerm } from "@/hooks/use-credit-term";
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import type { CreditTerm } from "@/types/credit-term";
import { LookupCombobox } from "./lookup-combobox";

interface LookupCreditTermProps {
  readonly value: string;
  readonly onValueChange: (value: string, creditTerm?: CreditTerm) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
}

export function LookupCreditTerm({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  size,
  error,
}: LookupCreditTermProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<CreditTerm>({
      useListHook: useCreditTerm,
      search,
      serverFilter: ACTIVE_ONLY_FILTER,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });

  return (
    <LookupCombobox
      size={size}
      value={value}
      onValueChange={onValueChange}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={items}
      selectedItems={selectedItems}
      getId={(c) => c.id}
      getLabel={(c) => c.name}
      placeholder={placeholder ?? tl("select", { entity: tfl("creditTerm") })}
      searchPlaceholder={tl("search", { entity: tfl("creditTerm") })}
      disabled={disabled}
      className={cn("w-full", className)}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      isLoading={isLoading}
      error={error}
    />
  );
}
