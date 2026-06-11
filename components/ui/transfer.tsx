
import { useDeferredValue, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  Search,
  SearchX,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TransferItem {
  key: string;
  title: string;
}

export interface TransferProps {
  dataSource: TransferItem[];
  targetKeys: string[];
  onChange: (
    nextTargetKeys: string[],
    direction: "left" | "right",
    moveKeys: string[],
  ) => void;
  disabled?: boolean;
  loading?: boolean;
  titles?: [string, string];
}

export function Transfer({
  dataSource,
  targetKeys,
  onChange,
  disabled = false,
  loading = false,
  titles,
}: Readonly<TransferProps>) {
  const tc = useTranslations("common");
  const [defaultLeft, defaultRight] = [
    tc("transferAvailable"),
    tc("transferSelected"),
  ];
  const [leftTitle, rightTitle] = titles ?? [defaultLeft, defaultRight];
  const [leftChecked, setLeftChecked] = useState<Set<string>>(new Set());
  const [rightChecked, setRightChecked] = useState<Set<string>>(new Set());
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");

  // Deferred values — input stays responsive, filter lags slightly
  const deferredLeftSearch = useDeferredValue(leftSearch);
  const deferredRightSearch = useDeferredValue(rightSearch);

  const targetKeySet = useMemo(() => new Set(targetKeys), [targetKeys]);

  const leftItems = useMemo(() => {
    const q = deferredLeftSearch.toLowerCase();
    return dataSource.filter(
      (item) =>
        !targetKeySet.has(item.key) &&
        (q === "" || item.title.toLowerCase().includes(q)),
    );
  }, [dataSource, targetKeySet, deferredLeftSearch]);

  const rightItems = useMemo(() => {
    const q = deferredRightSearch.toLowerCase();
    return dataSource.filter(
      (item) =>
        targetKeySet.has(item.key) &&
        (q === "" || item.title.toLowerCase().includes(q)),
    );
  }, [dataSource, targetKeySet, deferredRightSearch]);

  const leftTotal = dataSource.length - targetKeys.length;
  const rightTotal = targetKeys.length;

  const moveRight = () => {
    const moveKeys = Array.from(leftChecked);
    const nextTargetKeys = [...targetKeys, ...moveKeys];
    onChange(nextTargetKeys, "right", moveKeys);
    setLeftChecked(new Set());
  };

  const moveLeft = () => {
    const moveKeys = Array.from(rightChecked);
    const nextTargetKeys = targetKeys.filter((k) => !rightChecked.has(k));
    onChange(nextTargetKeys, "left", moveKeys);
    setRightChecked(new Set());
  };

  return (
    <div className="flex items-stretch gap-2.5">
      <TransferPanel
        title={leftTitle}
        items={leftItems}
        checkedKeys={leftChecked}
        onCheckedChange={setLeftChecked}
        search={leftSearch}
        onSearchChange={setLeftSearch}
        disabled={disabled}
        loading={loading}
        totalCount={leftTotal}
      />
      <div className="flex flex-col items-center justify-center gap-2">
        <Button
          type="button"
          size="icon-sm"
          onClick={moveRight}
          disabled={disabled || leftChecked.size === 0}
          aria-label={tc("transferMoveRight")}
          className={cn(
            "rounded-full transition-all",
            leftChecked.size > 0 &&
              "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0.25rem_0.625rem_-0.125rem_color-mix(in_oklch,var(--primary),transparent_60%)]",
            leftChecked.size === 0 &&
              "border-border/40 bg-card/40 text-muted-foreground border backdrop-blur-sm",
          )}
        >
          <ChevronRight />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          onClick={moveLeft}
          disabled={disabled || rightChecked.size === 0}
          aria-label={tc("transferMoveLeft")}
          className={cn(
            "rounded-full transition-all",
            rightChecked.size > 0 &&
              "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0.25rem_0.625rem_-0.125rem_color-mix(in_oklch,var(--primary),transparent_60%)]",
            rightChecked.size === 0 &&
              "border-border/40 bg-card/40 text-muted-foreground border backdrop-blur-sm",
          )}
        >
          <ChevronLeft />
        </Button>
      </div>
      <TransferPanel
        title={rightTitle}
        items={rightItems}
        checkedKeys={rightChecked}
        onCheckedChange={setRightChecked}
        search={rightSearch}
        onSearchChange={setRightSearch}
        disabled={disabled}
        loading={loading}
        totalCount={rightTotal}
      />
    </div>
  );
}

const ROW_ESTIMATE = 32; // px ของแต่ละ row (text-xs + py-1.5 + border-b)

const TransferPanel = ({
  title,
  items,
  checkedKeys,
  onCheckedChange,
  search,
  onSearchChange,
  disabled,
  loading,
  totalCount,
}: Readonly<{
  title: string;
  items: TransferItem[];
  checkedKeys: Set<string>;
  onCheckedChange: (keys: Set<string>) => void;
  search: string;
  onSearchChange: (value: string) => void;
  disabled: boolean;
  loading: boolean;
  totalCount: number;
}>) => {
  const tc = useTranslations("common");
  const allChecked =
    items.length > 0 && items.every((i) => checkedKeys.has(i.key));
  const someChecked = items.some((i) => checkedKeys.has(i.key));

  const toggleAll = () => {
    if (allChecked) onCheckedChange(new Set());
    else onCheckedChange(new Set(items.map((i) => i.key)));
  };

  const toggleItem = (key: string) => {
    const next = new Set(checkedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onCheckedChange(next);
  };

  const getCheckState = () => {
    if (allChecked) return true;
    if (someChecked) return "indeterminate";
    return false;
  };

  // Virtualize list (render เฉพาะ rows ใน viewport — handle 1000+ items ได้)
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 8,
    getItemKey: (i) => items[i]?.key ?? i,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className="border-border/60 bg-card/70 flex flex-1 flex-col overflow-hidden rounded-xl border shadow-[0_0.125rem_0.5rem_-0.25rem_rgba(0,0,0,0.06)] backdrop-blur-xl">
      {/* Header */}
      <div className="border-border/40 bg-muted/40 flex h-9 items-center gap-2 border-b px-3">
        <Checkbox
          checked={getCheckState()}
          onCheckedChange={toggleAll}
          disabled={disabled || items.length === 0}
        />
        <span className="text-foreground text-[0.6875rem] font-semibold tracking-widest uppercase">
          {title}
        </span>
        <span
          className={cn(
            "ml-auto inline-flex h-4 min-w-6 items-center justify-center rounded-full px-1.5 text-[0.5625rem] font-bold tracking-wider tabular-nums",
            checkedKeys.size > 0
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {checkedKeys.size > 0
            ? `${checkedKeys.size}/${totalCount}`
            : totalCount}
        </span>
      </div>

      {/* Search */}
      <div className="border-border/40 bg-card/40 border-b px-2 py-1.5 backdrop-blur-sm">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={tc("search")}
            className="border-border/40 hover:border-foreground/50 focus-visible:border-primary bg-card/40 h-7 rounded-md pl-7 text-xs shadow-none focus-visible:ring-0"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Virtualized list */}
      <div
        ref={scrollRef}
        className="contain:strict relative h-60 flex-1 overflow-y-auto"
      >
        {loading && <PanelLoading />}
        {!loading && items.length === 0 && <PanelEmpty hasSearch={!!search} />}
        {!loading && items.length > 0 && (
          <div
            style={{
              height: rowVirtualizer.getTotalSize(),
              position: "relative",
              width: "100%",
            }}
          >
            {virtualItems.map((vi) => {
              const item = items[vi.index];
              const checked = checkedKeys.has(item.key);
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
                    onCheckedChange={() => toggleItem(item.key)}
                    disabled={disabled}
                  />
                  <span
                    className={cn(
                      "truncate",
                      checked
                        ? "text-foreground font-medium"
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
};

const PanelLoading = () => {
  const tc = useTranslations("common");
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-10"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="bg-muted/60 relative h-1 w-32 overflow-hidden rounded-full">
        <div className="bg-primary absolute inset-y-0 w-1/2 animate-pulse rounded-full" />
      </div>
      <span className="text-muted-foreground text-[0.625rem] font-semibold tracking-widest uppercase">
        {tc("loading")}
      </span>
    </div>
  );
};

const PanelEmpty = ({ hasSearch }: { readonly hasSearch: boolean }) => {
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
};
