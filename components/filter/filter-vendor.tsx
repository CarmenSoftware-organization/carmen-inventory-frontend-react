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
import { useVendor } from "@/hooks/use-vendor";
import { cn } from "@/lib/utils";

interface FilterVendorProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

/**
 * ตัวกรอง vendor แบบเลือกหลายค่า — ค่าที่ส่งออกเป็น clause
 * `vendor_id|string:id1,id2`
 *
 * ทะเบียน vendor ของ BU หนึ่งใหญ่หลักร้อย KB (T02: 858 แถว ≈ 435 KB) จึง
 * **ไม่ยิงตอน mount** แต่รอจังหวะเปิด popover เหมือน FilterDepartment/FilterRequester
 * — หน้า list ที่ผู้ใช้ไม่ได้แตะ filter เลยจะไม่จ่ายค่านี้
 */
export function FilterVendor({
  value,
  onChange,
  className,
}: FilterVendorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inline = useContext(FilterInlineContext);
  // inline (submenu ของ ListFilterMenu) ไม่มีจังหวะ "เปิด popover" — fetch เลย
  const { data } = useVendor({ perpage: -1 }, { enabled: open || inline });
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  const vendors = data?.data?.filter((v) => v.is_active) ?? [];

  const filteredVendors = (() => {
    if (!search) return vendors;
    const q = search.toLowerCase();
    return vendors.filter((v) => v.name.toLowerCase().includes(q));
  })();

  // Parse filter value (format: "vendor_id|string:id1,id2,id3")
  const selectedIds = (() => {
    if (!value) return new Set<string>();
    const match = /vendor_id\|string:(.+)/.exec(value);
    if (!match) return new Set<string>();
    return new Set(match[1].split(","));
  })();

  const handleToggle = (vendorId: string) => {
    const newIds = new Set(selectedIds);
    if (newIds.has(vendorId)) {
      newIds.delete(vendorId);
    } else {
      newIds.add(vendorId);
    }

    if (newIds.size === 0) {
      onChange("");
    } else {
      onChange(`vendor_id|string:${Array.from(newIds).join(",")}`);
    }
  };

  const selectedCount = selectedIds.size;

  // ปุ่มพูดค่าที่เลือก — "ชื่อผู้ขายแรก +N" อ่านออกทันทีว่ากรองอะไรอยู่
  // (ทะเบียน fetch ตอนเปิด popover เท่านั้น — ยังไม่มีข้อมูล เช่นเปิดจาก
  // deep link/saved view โดยไม่เคยเปิด popover ให้ถอยไปแบบ "ผู้ขาย (N)")
  const firstName = vendors.find((v) => selectedIds.has(v.id))?.name;
  const valueText =
    selectedCount > 0
      ? `${firstName ?? `${tfl("vendor")} (${selectedCount})`}${
          firstName && selectedCount > 1 ? ` +${selectedCount - 1}` : ""
        }`
      : tfl("vendor");

  const list = (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder={tfl("vendor")}
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
        {filteredVendors.map((vendor) => (
          <label
            key={vendor.id}
            className={cn(
              "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none",
              "hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Checkbox
              checked={selectedIds.has(vendor.id)}
              onCheckedChange={() => handleToggle(vendor.id)}
            />
            <span className="truncate">{vendor.name}</span>
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
