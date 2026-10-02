import { useState } from "react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { useTaxProfile } from "@/hooks/use-tax-profile";
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import type { TaxProfile } from "@/types/tax-profile";
import { LookupCombobox } from "./lookup-combobox";

interface LookupTaxProfileProps {
  readonly value: string;
  readonly onValueChange: (
    value: string,
    taxRate: number,
    taxProfileName: string,
  ) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
}

export function LookupTaxProfile({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  size = "sm",
  error,
}: LookupTaxProfileProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<TaxProfile>({
      useListHook: useTaxProfile,
      search,
      serverFilter: ACTIVE_ONLY_FILTER,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });

  return (
    <LookupCombobox
      allowDeselect={false}
      size={size}
      value={value}
      onValueChange={(id, tp) =>
        onValueChange(id, tp?.tax_rate ?? 0, tp?.name ?? "")
      }
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={items}
      selectedItems={selectedItems}
      getId={(tp) => tp.id}
      getLabel={(tp) => tp.name}
      placeholder={placeholder ?? tl("select", { entity: tfl("taxProfile") })}
      searchPlaceholder={tl("search", { entity: tfl("taxProfile") })}
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
