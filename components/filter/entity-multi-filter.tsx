import { useContext, useState } from "react";
import { useTranslations } from "use-intl";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandInput } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterInlineContext } from "@/components/ui/filter-inline-context";
import { VirtualCommandList } from "@/components/ui/virtual-command-list";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { LookupListHook } from "@/hooks/use-entities-by-ids";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import { clauseTokens } from "@/lib/list-filter-encode";
import { cn } from "@/lib/utils";

interface EntityMultiFilterProps<T> {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
  /** คอลัมน์ที่ clause ชี้ — ค่าที่ส่งออกเป็น `<fieldKey>|string:id1,id2` */
  readonly fieldKey: string;
  readonly label: string;
  readonly useListHook: LookupListHook<T>;
  readonly getId: (item: T) => string;
  readonly getLabel: (item: T) => string;
  readonly serverFilter?: string;
  readonly idFilterKey?: string;
  /** ค่าเป็น id เปล่าคั่น `,` (ไม่มี `<fieldKey>|string:`) — ดู EntityFilterSource.bareIds */
  readonly bareIds?: boolean;
}

const ROW_CLASS = cn(
  "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none",
  "hover:bg-accent hover:text-accent-foreground",
);

/**
 * ตัวกรองเลือกหลายค่าจากทะเบียน (vendor / แผนก / ผู้ใช้) — ค้นที่ server และโหลดทีละหน้า
 * รายการยิงเมื่อเปิด popover เท่านั้น ส่วนชื่อของค่าที่เลือกไว้ดึงตาม id เสมอ ปุ่มจึง
 * "ชื่อแรก +N" ได้ทันทีแม้เปิดจาก deep link / saved view
 */
export function EntityMultiFilter<T>({
  value,
  onChange,
  className,
  fieldKey,
  label,
  useListHook,
  getId,
  getLabel,
  serverFilter,
  idFilterKey,
  bareIds,
}: EntityMultiFilterProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 150);
  const inline = useContext(FilterInlineContext);
  const tc = useTranslations("common");

  const prefix = bareIds ? "" : `${fieldKey}|string:`;
  // อ่านได้ทั้งรูปปัจจุบัน รูปเก่าของ MultiSelectFilter (saved view / ลิงก์ก่อนย้าย
  // มา entity: `<col>|string:a,<col>|string:b`) และ id เปล่า — เขียนกลับรูปเดียวเสมอ
  const selectedIds = clauseTokens(value);
  const selectedSet = new Set(selectedIds);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<T>({
      useListHook,
      search: debouncedSearch,
      serverFilter,
      // inline (submenu ของ ListFilterMenu) ไม่มีจังหวะ "เปิด popover" — fetch เลย
      enabled: open || inline,
      selectedIds,
      getId,
      idFilterKey,
    });

  const handleToggle = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next.size === 0 ? "" : `${prefix}${Array.from(next).join(",")}`);
  };

  // ที่เลือกไว้อยู่บนสุดเสมอ — ยกเลิกได้แม้ไม่อยู่ในผลค้นหาปัจจุบัน
  const rows = [
    ...selectedItems,
    ...items.filter((it) => !selectedSet.has(getId(it))),
  ];

  const selectedCount = selectedIds.length;
  const firstName = selectedItems[0] ? getLabel(selectedItems[0]) : undefined;
  const valueText =
    selectedCount > 0
      ? `${firstName ?? `${label} (${selectedCount})`}${
          firstName && selectedCount > 1 ? ` +${selectedCount - 1}` : ""
        }`
      : label;

  const list = (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder={label}
        className="placeholder:text-xs"
        value={search}
        onValueChange={setSearch}
      />
      <div className="p-1">
        <label className={ROW_CLASS}>
          <Checkbox
            checked={selectedCount === 0}
            onCheckedChange={() => onChange("")}
          />
          <span className="truncate">{tc("all")}</span>
        </label>
        {isLoading ? (
          <div className="text-muted-foreground px-2 py-1.5 text-xs">
            {tc("loading")}
          </div>
        ) : (
          <VirtualCommandList
            items={rows}
            maxHeight={240}
            estimateSize={28}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            emptyMessage={
              <span className="text-muted-foreground text-xs">
                {tc("noSearchResult")}
              </span>
            }
          >
            {(item) => {
              const id = getId(item);
              return (
                <label key={id} className={ROW_CLASS}>
                  <Checkbox
                    checked={selectedSet.has(id)}
                    onCheckedChange={() => handleToggle(id)}
                  />
                  <span className="truncate">{getLabel(item)}</span>
                </label>
              );
            }}
          </VirtualCommandList>
        )}
      </div>
    </Command>
  );

  if (inline) {
    return list;
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
      modal
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("justify-between", className)}
        >
          <span
            className={cn(
              "truncate",
              !selectedCount && "text-muted-foreground text-xs",
            )}
          >
            {valueText}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        {list}
      </PopoverContent>
    </Popover>
  );
}
