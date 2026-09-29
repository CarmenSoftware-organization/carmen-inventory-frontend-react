import { useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { useShelf } from "@/hooks/use-shelf";
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import type { Shelf } from "@/types/shelf";
import { LookupCombobox } from "./lookup-combobox";

interface LookupShelfProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (shelf: Shelf) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly readOnly?: boolean;
}

export function LookupShelf({
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  readOnly,
}: LookupShelfProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<Shelf>({
      useListHook: useShelf,
      search,
      serverFilter: ACTIVE_ONLY_FILTER,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });

  return (
    <LookupCombobox
      size="sm"
      value={value}
      onValueChange={(id, shelf) => {
        onValueChange(id);
        if (shelf) onItemChange?.(shelf);
      }}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={items}
      selectedItems={selectedItems}
      getId={(s) => s.id}
      getLabel={(s) => s.name}
      placeholder={placeholder ?? tl("select", { entity: tfl("shelf") })}
      searchPlaceholder={tl("search", { entity: tfl("shelf") })}
      disabled={disabled}
      className={cn("w-full", className)}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      isLoading={isLoading}
      readOnly={readOnly}
      prependItems={
        <button
          type="button"
          aria-pressed={!value}
          className={cn(
            "relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-hidden select-none",
            "hover:bg-accent hover:text-accent-foreground",
          )}
          onClick={() => onValueChange("")}
        >
          —
          <Check
            className={cn(
              "ml-auto h-4 w-4 shrink-0",
              value ? "opacity-0" : "opacity-100",
            )}
          />
        </button>
      }
    />
  );
}
