
import { useDeferredValue, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { Inbox, Search, SearchX } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface DisplayItem {
  id: string;
  title: string;
}

interface ProductPanelProps {
  readonly title: string;
  readonly totalLabel: string;
  readonly items: DisplayItem[];
  readonly selectedIds: Set<string>;
  readonly onToggle: (id: string) => void;
  readonly onSetMany: (ids: string[], shouldSelect: boolean) => void;
  readonly disabled: boolean;
}

const ROW_ESTIMATE = 32;

export function ProductPanel({
  title,
  totalLabel,
  items,
  selectedIds,
  onToggle,
  onSetMany,
  disabled,
}: ProductPanelProps) {
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const q = deferredSearch.toLowerCase();
  const visible =
    q === "" ? items : items.filter((it) => it.title.toLowerCase().includes(q));

  const visibleSelectedCount = visible.reduce(
    (n, it) => (selectedIds.has(it.id) ? n + 1 : n),
    0,
  );
  const allVisibleSelected =
    visible.length > 0 && visibleSelectedCount === visible.length;
  const someVisibleSelected =
    visibleSelectedCount > 0 && visibleSelectedCount < visible.length;

  const toggleAllVisible = () => {
    const ids = visible.map((it) => it.id);
    onSetMany(ids, !allVisibleSelected);
  };

  const headerCheckState: boolean | "indeterminate" = allVisibleSelected
    ? true
    : someVisibleSelected
      ? "indeterminate"
      : false;

  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 8,
    getItemKey: (i) => visible[i]?.id ?? i,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className="border-border/60 bg-card flex flex-1 flex-col overflow-hidden rounded-xl border">
      <div className="border-border/40 bg-muted/40 flex h-9 items-center gap-2 border-b px-3">
        <Checkbox
          checked={headerCheckState}
          onCheckedChange={toggleAllVisible}
          disabled={disabled || visible.length === 0}
        />
        <span className="text-foreground text-[0.6875rem] font-semibold tracking-widest uppercase">
          {title}
        </span>
        <span className="bg-primary/15 text-primary ml-auto inline-flex h-4 min-w-6 items-center justify-center rounded-full px-1.5 text-[0.5625rem] font-bold tracking-wider tabular-nums">
          {totalLabel}
        </span>
      </div>

      <div className="border-border/40 bg-card border-b px-2 py-1.5">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tc("search")}
            className="border-border/40 hover:border-foreground/50 focus-visible:border-primary bg-card h-7 rounded-md pl-7 text-xs shadow-none focus-visible:ring-0"
            disabled={disabled}
          />
        </div>
      </div>

      <div
        ref={scrollRef}
        className="contain:strict relative h-60 flex-1 overflow-y-auto"
      >
        {visible.length === 0 && <PanelEmpty hasSearch={!!search} />}
        {visible.length > 0 && (
          <div
            style={{
              height: rowVirtualizer.getTotalSize(),
              position: "relative",
              width: "100%",
            }}
          >
            {virtualItems.map((vi) => {
              const item = visible[vi.index];
              const checked = selectedIds.has(item.id);
              return (
                <label
                  key={vi.key}
                  data-index={vi.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${vi.start}px)`,
                  }}
                  className={cn(
                    "border-border/30 flex cursor-pointer items-center gap-2 border-b px-3 py-1.5 text-xs transition-colors",
                    "hover:bg-muted/40",
                    checked && "bg-primary/10 hover:bg-primary/15",
                    disabled && "pointer-events-none opacity-50",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggle(item.id)}
                    disabled={disabled}
                  />
                  <span
                    className={cn(
                      "truncate",
                      checked
                        ? "text-foreground font-semibold"
                        : "text-foreground/85",
                    )}
                  >
                    {item.title}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PanelEmpty({ hasSearch }: { readonly hasSearch: boolean }) {
  const tc = useTranslations("common");
  const Icon = hasSearch ? SearchX : Inbox;
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-10">
      <div className="bg-muted/60 text-muted-foreground/70 flex size-9 items-center justify-center rounded-full">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <span className="text-muted-foreground text-[0.6875rem]">
        {hasSearch ? tc("transferNoMatches") : tc("transferNoItems")}
      </span>
    </div>
  );
}
