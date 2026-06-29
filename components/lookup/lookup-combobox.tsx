
import { useEffect, useState, type ReactNode } from "react";
import {
  Check,
  ChevronsUpDown,
  CircleAlert,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Command, CommandInput } from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VirtualCommandList } from "@/components/ui/virtual-command-list";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyComponent from "@/components/empty-component";

/** ความกว้างแถว skeleton แบบสุ่มกว้างต่างกันให้ดูเป็นธรรมชาติ (ค่า unique ใช้เป็น key ได้) */
const SKELETON_WIDTHS = ["w-3/4", "w-2/3", "w-1/2", "w-4/5", "w-3/5", "w-5/6"];

/** Skeleton list จำลองโครงรายการระหว่างโหลด (label ซ้าย + badge ขวา) */
const LookupSkeletonList = () => {
  return (
    <div className="space-y-1 p-1" aria-hidden="true">
      {SKELETON_WIDTHS.map((w) => (
        <div
          key={w}
          className="flex items-center justify-between gap-2 px-2 py-1.5"
        >
          <Skeleton className={cn("h-3.5", w)} />
          <Skeleton className="h-4 w-12 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
};

interface LookupComboboxProps<T> {
  readonly value: string;
  readonly onValueChange: (value: string, item?: T) => void;
  readonly items: T[];
  readonly getId: (item: T) => string;
  readonly getLabel: (item: T) => string;
  readonly placeholder?: string;
  readonly searchPlaceholder?: string;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly isLoading?: boolean;
  readonly getSearchValue?: (item: T) => string;
  readonly renderItem?: (item: T) => ReactNode;
  readonly defaultLabel?: string;
  readonly renderSelected?: (item: T) => string;
  readonly emptyIcon?: LucideIcon;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly headerSlot?: ReactNode;
  readonly prependItems?: ReactNode;
  readonly popoverWidth?: string;
  readonly popoverAlign?: "start" | "center" | "end";
  readonly popoverClassName?: string;
  readonly modal?: boolean;
  readonly size?: "xs" | "sm";
  readonly onSearchChange?: (search: string) => void;
  readonly serverSideSearch?: boolean;
  readonly onLoadMore?: () => void;
  readonly hasMore?: boolean;
  readonly isLoadingMore?: boolean;
  readonly disableTooltip?: boolean;
  readonly error?: string;
  /** แจ้ง caller เมื่อ popover เปิด/ปิด — ใช้คู่กับ lazy mode เพื่อ trigger fetch ตอนเปิด */
  readonly onOpenChange?: (open: boolean) => void;
  /** เริ่มต้นเปิด popover ทันทีที่ mount (ใช้คู่กับ lazy mode ของ caller) */
  readonly defaultOpen?: boolean;
  /** Render plain text แทน popover (สำหรับ view mode) — ไม่กระทบ submit pending */
  readonly readOnly?: boolean;
  /** ความสูงโดยประมาณของแต่ละ item — ส่งต่อไป virtualizer (default 32) */
  readonly estimateSize?: number;
  /** ความสูงสูงสุดของ list panel (default 300) */
  readonly maxHeight?: number;
}

/**
 * Combobox ทั่วไปสำหรับใช้เป็นฐานของ lookup component ต่าง ๆ รองรับการค้นหา, virtual list, โหลดเพิ่ม และ tooltip
 * @param props - props ของ LookupCombobox (ภาษาไทย)
 * @returns React element ของ lookup component
 */
export function LookupCombobox<T>({
  value,
  onValueChange,
  items,
  getId,
  getLabel,
  placeholder,
  searchPlaceholder,
  className,
  disabled,
  isLoading,
  getSearchValue,
  renderItem,
  defaultLabel,
  renderSelected,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  headerSlot,
  prependItems,
  popoverWidth = "w-[--radix-popover-trigger-width]",
  popoverAlign,
  popoverClassName,
  modal,
  size = "sm",
  onSearchChange,
  serverSideSearch,
  onLoadMore,
  hasMore,
  isLoadingMore,
  disableTooltip,
  error,
  onOpenChange,
  defaultOpen,
  readOnly,
  estimateSize,
  maxHeight,
}: LookupComboboxProps<T>) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [search, setSearch] = useState("");

  const t = useTranslations("lookup");
  const resolvedPlaceholder = placeholder ?? t("selectPlaceholder");
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("searchPlaceholder");

  const searchFn = getSearchValue ?? getLabel;
  const debouncedSearch = useDebouncedValue(search, 150);

  useEffect(() => {
    onSearchChange?.(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  const q = debouncedSearch.toLowerCase();
  const filteredItems =
    serverSideSearch || !debouncedSearch
      ? items
      : items.filter((item) => searchFn(item).toLowerCase().includes(q));

  const selectedItem = value
    ? items.find((item) => getId(item) === value)
    : undefined;
  let selectedLabel: string | null = null;
  if (value) {
    if (selectedItem) {
      selectedLabel = renderSelected
        ? renderSelected(selectedItem)
        : getLabel(selectedItem);
    } else {
      selectedLabel = defaultLabel ?? null;
    }
  }

  const showTooltip = !error && !disableTooltip && !open && !!selectedLabel;
  const showErrorTooltip = !!error && !open;

  if (readOnly) {
    return (
      <span
        className={cn(
          "inline-flex items-center text-sm",
          size === "sm" && "min-h-8",
          size === "xs" && "min-h-6 text-xs",
          !selectedLabel && "text-muted-foreground",
          className,
        )}
      >
        {selectedLabel ?? "—"}
      </span>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
        onOpenChange?.(o);
      }}
      modal={modal}
    >
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                aria-expanded={open}
                aria-invalid={!!error}
                className={cn(
                  "flex items-center justify-between pr-1 pl-3 text-sm",
                  size === "sm" && "h-8",
                  size === "xs" && "h-6 gap-1 px-2 text-xs",
                  // important: ชนะ `dark:border-input` ของ Button outline
                  // (specificity 0,2,0 จาก dark variant `:is(.dark *)`)
                  error && "border-destructive! pr-7",
                  className,
                )}
                disabled={disabled}
              >
                {isLoading ? (
                  <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
                ) : (
                  <span
                    className={cn(
                      "truncate",
                      !selectedLabel && "text-muted-foreground text-xs",
                    )}
                  >
                    {selectedLabel ?? resolvedPlaceholder}
                  </span>
                )}
                {error ? (
                  <CircleAlert
                    className="text-destructive size-4 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronsUpDown
                    className={cn(
                      "shrink-0 opacity-50",
                      size === "xs" ? "size-3" : "h-4 w-4",
                    )}
                  />
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          {showErrorTooltip && (
            <TooltipContent
              side="top"
              align="end"
              className="bg-background text-destructive [&>svg]:fill-background [&>svg]:text-border border px-3 py-2 text-xs font-semibold"
            >
              {error}
            </TooltipContent>
          )}
          {showTooltip && (
            <TooltipContent
              side="top"
              className="bg-popover text-popover-foreground [&>svg]:fill-popover [&>svg]:text-border max-w-[20rem] rounded-lg border px-3 py-2 shadow-md"
            >
              <p className="text-xs font-semibold">{selectedLabel}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        className={cn(popoverWidth, "p-0", popoverClassName)}
        align={popoverAlign}
      >
        <Command shouldFilter={false}>
          <div className="relative w-full">
            <CommandInput
              placeholder={resolvedSearchPlaceholder}
              className={cn("placeholder:text-xs", headerSlot && "pr-8")}
              value={search}
              onValueChange={setSearch}
            />
            {headerSlot}
          </div>
          {isLoading ? (
            <LookupSkeletonList />
          ) : (
            <>
              {prependItems}
              <VirtualCommandList
                items={filteredItems}
                onLoadMore={onLoadMore}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                estimateSize={estimateSize}
                maxHeight={maxHeight}
                emptyMessage={
                  <EmptyComponent
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                }
              >
                {(item) => (
                  <button
                    type="button"
                    aria-pressed={value === getId(item)}
                    data-value={searchFn(item)}
                    className={cn(
                      "relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-hidden select-none",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                    )}
                    onClick={() => {
                      const id = getId(item);
                      onValueChange(
                        value === id ? "" : id,
                        value === id ? undefined : item,
                      );
                      setOpen(false);
                    }}
                  >
                    {renderItem ? renderItem(item) : getLabel(item)}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4 shrink-0",
                        value === getId(item) ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </button>
                )}
              </VirtualCommandList>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
