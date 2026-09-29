import { useTranslations } from "use-intl";
import { useContext, useState } from "react";
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
import { useGoodsReceiveNote } from "@/hooks/use-goods-receive-note";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import { cn } from "@/lib/utils";
import type { GoodsReceiveNote } from "@/types/goods-receive-note";

interface GrnInvoiceFilterProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

const PREFIX = "invoice_no|string:";

const ROW_CLASS = cn(
  "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none",
  "hover:bg-accent hover:text-accent-foreground",
);

/**
 * ตัวกรองเลขที่ใบแจ้งหนี้ของหน้า GRN — ค่าที่ส่งออกเป็น clause
 * `invoice_no|string:INV-001,INV-002`
 *
 * ตัวเลือกมาจากใบรับของ (distinct `invoice_no`) — ยิงตอนเปิด popover เท่านั้น
 * ค้นที่ server (search ของ GRN ครอบทั้ง invoice_no และ grn_no) เรียงตามเลขที่
 * ใบแจ้งหนี้ แล้วเลื่อนโหลดทีละหน้า — ใบที่ไม่มีเลขที่ (null) ตกไปท้ายสุดเอง
 * ค่าที่เก็บ *คือ* ป้ายอยู่แล้ว (ไม่ใช่ id) ปุ่มและ chip จึงพูดค่าได้โดยไม่ต้องรอโหลด
 *
 * อยู่ใต้ route ของ GRN ไม่ใช่ `components/filter/` เพราะผูกกับ
 * `useGoodsReceiveNote` ตัวเดียว — ไม่มีหน้าอื่นใช้ได้
 */
export function GrnInvoiceFilter({
  value,
  onChange,
  className,
}: GrnInvoiceFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 150);
  const inline = useContext(FilterInlineContext);
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  const { items: grns, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<GoodsReceiveNote>({
      useListHook: useGoodsReceiveNote,
      search: debouncedSearch,
      // หลายใบอ้างใบแจ้งหนี้เดียวกันได้ — หน้าละ 50 ใบให้ได้เลขที่พอล้นกล่อง
      // (VirtualCommandList โหลดหน้าถัดไปเมื่อเลื่อนถึงท้ายเท่านั้น)
      perpage: 50,
      sort: "invoice_no:asc",
      // inline (submenu ของ ListFilterMenu) ไม่มีจังหวะ "เปิด popover" — fetch เลย
      enabled: open || inline,
    });

  // Parse filter value (format: "invoice_no|string:INV-001,INV-002")
  const selected = (() => {
    if (!value) return new Set<string>();
    const match = /invoice_no\|string:(.+)/.exec(value);
    if (!match) return new Set<string>();
    return new Set(match[1].split(","));
  })();

  // distinct ตามลำดับของ server (เรียงเลขที่แล้ว)
  const invoiceNos = (() => {
    const seen = new Set<string>();
    for (const g of grns) {
      const no = g.invoice_no?.trim();
      if (no) seen.add(no);
    }
    return [...seen];
  })();

  // ที่เลือกไว้อยู่บนสุดเสมอ — ยกเลิกได้แม้ไม่อยู่ในหน้าที่โหลดมา
  const rows = [
    ...selected,
    ...invoiceNos.filter((no) => !selected.has(no)),
  ];

  const handleToggle = (no: string) => {
    const next = new Set(selected);
    if (next.has(no)) {
      next.delete(no);
    } else {
      next.add(no);
    }
    onChange(next.size === 0 ? "" : `${PREFIX}${Array.from(next).join(",")}`);
  };

  const selectedCount = selected.size;
  const firstNo = [...selected][0];
  const valueText =
    selectedCount > 0
      ? `${firstNo}${selectedCount > 1 ? ` +${selectedCount - 1}` : ""}`
      : tfl("invoiceNo");

  const list = (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder={tfl("invoiceNo")}
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
            {(no) => (
              <label key={no} className={ROW_CLASS}>
                <Checkbox
                  checked={selected.has(no)}
                  onCheckedChange={() => handleToggle(no)}
                />
                <span className="truncate">{no}</span>
              </label>
            )}
          </VirtualCommandList>
        )}
      </div>
    </Command>
  );

  // ใน submenu ของ ListFilterMenu — โชว์รายการตรง ๆ ไม่ต้องมีปุ่ม trigger ซ้อน
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
