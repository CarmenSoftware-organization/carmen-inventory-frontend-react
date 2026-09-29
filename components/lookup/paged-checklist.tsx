import { useState, type ReactNode } from "react";
import { useTranslations } from "use-intl";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandInput } from "@/components/ui/command";
import { VirtualCommandList } from "@/components/ui/virtual-command-list";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { LookupListHook } from "@/hooks/use-entities-by-ids";
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import { cn } from "@/lib/utils";

interface PagedChecklistProps<T> {
  readonly useListHook: LookupListHook<T>;
  readonly getId: (item: T) => string;
  readonly getLabel: (item: T) => string;
  /** คอลัมน์ id ฝั่ง backend ตอนดึงชื่อของค่าที่เลือก — default "id" */
  readonly idFilterKey?: string;
  /** undefined = ACTIVE_ONLY_FILTER, null = ไม่กรอง (users ห้ามส่ง is_active) */
  readonly serverFilter?: string | null;
  readonly value: string[];
  readonly onChange: (value: string[]) => void;
  /** ปิดการติ๊ก/เอาออก แต่ยังค้นและเลื่อนดูได้ */
  readonly disabled?: boolean;
  /** วาดแถวเอง (เช่นการ์ด) — default คือ Checkbox + label */
  readonly renderItem?: (
    item: T,
    checked: boolean,
    toggle: () => void,
  ) => ReactNode;
  readonly showSelectedBadges?: boolean;
  /** ความสูงสูงสุดของรายการ (px) */
  readonly maxHeight?: number;
  /** ความสูงแถวโดยประมาณก่อนวัดจริง (px) */
  readonly estimateSize?: number;
  readonly searchPlaceholder?: string;
  readonly emptyMessage?: ReactNode;
  /** ต่อท้าย class ของกรอบ (ช่องค้น + รายการ) */
  readonly className?: string;
}

const ROW_CLASS =
  "hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1 text-sm select-none";

/**
 * checklist เลือกหลายค่าจากทะเบียนในฟอร์ม — ค้นที่ server และโหลดทีละหน้า
 * (ไม่ lazy: แสดงในฟอร์มตลอด ไม่มี popover ให้รอเปิด)
 *
 * ชื่อของค่าที่เลือกไว้ดึงตาม id เสมอ (`selectedIds` ไม่ผ่าน `serverFilter`) badge จึงขึ้นชื่อ
 * ได้ทันทีแม้ค่าอยู่หลังหน้าแรกหรือถูกปิดใช้งานไปแล้ว · ค่าที่เลือกแต่ยังไม่อยู่ในหน้าที่โหลด
 * ถูกปักไว้บนสุดของรายการ ให้ติ๊กออกได้แม้ปิด badge (`showSelectedBadges={false}`)
 */
export function PagedChecklist<T>({
  useListHook,
  getId,
  getLabel,
  idFilterKey,
  serverFilter,
  value,
  onChange,
  disabled = false,
  renderItem,
  showSelectedBadges = true,
  maxHeight = 160,
  estimateSize = 28,
  searchPlaceholder,
  emptyMessage,
  className,
}: PagedChecklistProps<T>) {
  const tc = useTranslations("common");
  const tl = useTranslations("lookup");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 150);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<T>({
      useListHook,
      search: debouncedSearch,
      serverFilter:
        serverFilter === null
          ? undefined
          : (serverFilter ?? ACTIVE_ONLY_FILTER),
      getId,
      idFilterKey,
      selectedIds: value,
    });

  const selectedSet = new Set(value);
  const toggle = (id: string) => {
    if (disabled) return;
    onChange(
      selectedSet.has(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  };

  const labelById = new Map(
    selectedItems.map((it) => [getId(it), getLabel(it)] as const),
  );

  // ค่าที่เลือกแต่ยังไม่อยู่ในหน้าที่โหลด (หลังหน้าแรก / ถูกปิดใช้งาน) ขึ้นบนสุด —
  // แถวที่โหลดแล้วอยู่ที่เดิม ติ๊กแล้วไม่กระโดด
  const loadedIds = new Set(items.map((it) => getId(it)));
  const rows = [
    ...selectedItems.filter((it) => !loadedIds.has(getId(it))),
    ...items,
  ];

  return (
    <div className="flex flex-col gap-2">
      {showSelectedBadges && value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((id) => {
            // resolve ไม่ได้ (เช่นแผนกที่เปลี่ยนชื่อไปแล้ว) = แสดงค่าดิบ ยังเอาออกได้
            const name = labelById.get(id) ?? id;
            return (
              <Badge key={id} asChild variant="default" className="gap-1">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(id)}
                  aria-label={tl("remove", { name })}
                  className="disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {name}
                  <X className="size-3" aria-hidden="true" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      <Command
        shouldFilter={false}
        className={cn("h-auto rounded-md border bg-transparent", className)}
      >
        <CommandInput
          placeholder={searchPlaceholder ?? tc("search")}
          value={search}
          onValueChange={setSearch}
        />
        {isLoading ? (
          <div className="text-muted-foreground px-3 py-2 text-xs">
            {tc("loading")}
          </div>
        ) : (
          <VirtualCommandList
            items={rows}
            maxHeight={maxHeight}
            estimateSize={estimateSize}
            measureRows
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            emptyMessage={
              emptyMessage ?? (
                <span className="text-muted-foreground text-xs">
                  {tc("noSearchResult")}
                </span>
              )
            }
          >
            {(item) => {
              const id = getId(item);
              const checked = selectedSet.has(id);
              if (renderItem) return renderItem(item, checked, () => toggle(id));
              return (
                <label
                  className={cn(
                    ROW_CLASS,
                    disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => toggle(id)}
                  />
                  <span className="truncate">{getLabel(item)}</span>
                </label>
              );
            }}
          </VirtualCommandList>
        )}
      </Command>
    </div>
  );
}
