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
import { useGoodsReceiveNote } from "@/hooks/use-goods-receive-note";
import { cn } from "@/lib/utils";

interface GrnInvoiceFilterProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

/**
 * ตัวกรองเลขที่ใบแจ้งหนี้ของหน้า GRN — ค่าที่ส่งออกเป็น clause
 * `invoice_no|string:INV-001,INV-002`
 *
 * ตัวเลือกไม่ได้มาจากทะเบียนของตัวเอง แต่มาจาก **ใบรับของทั้ง BU** (distinct
 * `invoice_no`) ซึ่งเป็นก้อนที่โตขึ้นเรื่อย ๆ ตามจำนวนใบที่คีย์ จึง **ไม่ยิงตอน
 * mount** แต่รอจังหวะเปิด popover เหมือน FilterVendor — หน้า list ที่ผู้ใช้ไม่ได้
 * แตะตัวกรองเลยจะไม่จ่ายค่านี้
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
  const inline = useContext(FilterInlineContext);
  // inline (submenu ของ ListFilterMenu) ไม่มีจังหวะ "เปิด popover" — fetch เลย
  const { data } = useGoodsReceiveNote(
    { perpage: -1 },
    { enabled: open || inline },
  );
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  // distinct + ตัดค่าว่าง แล้วเรียง — ใบหลายใบอ้างใบแจ้งหนี้เดียวกันได้
  const invoiceNos = (() => {
    const seen = new Set<string>();
    for (const g of data?.data ?? []) {
      const no = g.invoice_no?.trim();
      if (no) seen.add(no);
    }
    return [...seen].sort();
  })();

  const filteredInvoiceNos = (() => {
    if (!search) return invoiceNos;
    const q = search.toLowerCase();
    return invoiceNos.filter((no) => no.toLowerCase().includes(q));
  })();

  // Parse filter value (format: "invoice_no|string:INV-001,INV-002")
  const selected = (() => {
    if (!value) return new Set<string>();
    const match = /invoice_no\|string:(.+)/.exec(value);
    if (!match) return new Set<string>();
    return new Set(match[1].split(","));
  })();

  const handleToggle = (no: string) => {
    const next = new Set(selected);
    if (next.has(no)) {
      next.delete(no);
    } else {
      next.add(no);
    }

    if (next.size === 0) {
      onChange("");
    } else {
      onChange(`invoice_no|string:${Array.from(next).join(",")}`);
    }
  };

  const selectedCount = selected.size;

  // ต่างจาก FilterVendor ตรงที่ค่าที่เก็บ *คือ* ป้ายอยู่แล้ว (เลขที่ใบแจ้งหนี้
  // ไม่ใช่ id) ปุ่มจึงพูดค่าได้ครบโดยไม่ต้องรอทะเบียนโหลด
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
      <div className="max-h-60 overflow-y-auto p-1">
        <label
          className={cn(
            "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none",
            "hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Checkbox
            checked={selectedCount === 0}
            onCheckedChange={() => onChange("")}
          />
          <span className="truncate">{tc("all")}</span>
        </label>
        {filteredInvoiceNos.map((no) => (
          <label
            key={no}
            className={cn(
              "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none",
              "hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Checkbox
              checked={selected.has(no)}
              onCheckedChange={() => handleToggle(no)}
            />
            <span className="truncate">{no}</span>
          </label>
        ))}
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
