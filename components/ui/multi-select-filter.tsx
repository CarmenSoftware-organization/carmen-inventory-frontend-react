import type React from "react";
import { useContext } from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FilterInlineContext } from "@/components/ui/filter-inline-context";
import { cn } from "@/lib/utils";
import { useTranslations } from "use-intl";

interface FilterOption {
  value: string;
  label: string;
  group?: string;
  /** สีจุดสถานะหน้า label (ค่า CSS เช่น `var(--status-draft)`) — ไม่ใส่ = ไม่มีจุด */
  dotColor?: string;
}

interface MultiSelectFilterProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: FilterOption[];
  readonly placeholder?: string;
  readonly className?: string;
  readonly searchable?: boolean;
  readonly searchPlaceholder?: string;
}

export function MultiSelectFilter({
  value,
  onChange,
  options,
  placeholder = "Filter",
  className,
  searchable,
  searchPlaceholder = "Search...",
}: MultiSelectFilterProps) {
  const tc = useTranslations("common");
  const inline = useContext(FilterInlineContext);
  const selected = value ? value.split(",") : [];

  const toggle = (optValue: string) => {
    const next = selected.includes(optValue)
      ? selected.filter((v) => v !== optValue)
      : [...selected, optValue];
    onChange(next.length >= options.length ? "" : next.join(","));
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  // ปุ่มพูดค่าที่เลือก ไม่ใช่ชื่อ field — "Draft +2" อ่านออกทันทีว่ากรองอะไรอยู่
  // (ชื่อ field มี FieldLabel ของชีทบอกอยู่แล้ว)
  const selectedLabels = selected
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean) as string[];
  const valueText =
    selectedLabels.length > 0
      ? selectedLabels[0] +
        (selectedLabels.length > 1 ? ` +${selectedLabels.length - 1}` : "")
      : "";

  const list = (
    <Command>
      {searchable && (
        <CommandInput placeholder={searchPlaceholder} className="h-8 text-xs" />
      )}
      <CommandList>
        <CommandEmpty>{tc("noOptions")}</CommandEmpty>
        <CommandGroup>
          <CommandItem onSelect={() => onChange("")} className="text-xs">
            <Checkbox checked={selected.length === 0} tabIndex={-1} />
            {tc("all")}
          </CommandItem>
        </CommandGroup>
        {(() => {
          const grouped = new Map<string, FilterOption[]>();
          for (const opt of options) {
            const key = opt.group ?? "";
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(opt);
          }
          const hasGroups = Array.from(grouped.keys()).some((k) => k !== "");
          if (!hasGroups) {
            return (
              <CommandGroup>
                {options.map((opt) => {
                  const isSelected = selected.includes(opt.value);
                  return (
                    <CommandItem
                      key={opt.value}
                      onSelect={() => toggle(opt.value)}
                      className="text-xs"
                    >
                      <Checkbox checked={isSelected} tabIndex={-1} />
                      {opt.dotColor && (
                        <span
                          aria-hidden="true"
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: opt.dotColor }}
                        />
                      )}
                      {opt.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          }
          return Array.from(grouped.entries()).map(([groupName, opts]) => (
            <CommandGroup
              key={groupName || "_ungrouped"}
              heading={groupName || undefined}
            >
              {opts.map((opt) => {
                const isSelected = selected.includes(opt.value);
                return (
                  <CommandItem
                    key={opt.value}
                    value={`${opt.value} ${opt.label}`}
                    onSelect={() => toggle(opt.value)}
                    className="text-xs"
                  >
                    <Checkbox checked={isSelected} tabIndex={-1} />
                    {opt.dotColor && (
                      <span
                        aria-hidden="true"
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: opt.dotColor }}
                      />
                    )}
                    {opt.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ));
        })()}
      </CommandList>
    </Command>
  );

  // ใน submenu ของ ListFilterMenu — โชว์รายการตรง ๆ ไม่ต้องมีปุ่ม trigger ซ้อน
  if (inline) {
    return list;
  }

  return (
    // modal — ใช้ใน ListFilter (Dialog modal) เป็นหลัก ถ้าไม่ประกาศ scroll
    // ในรายการจะโดน scroll lock ของ Sheet กิน (เหมือน FilterStage/Requester ฯลฯ)
    <Popover modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("justify-between gap-1 text-xs font-normal", className)}
        >
          <span
            className={cn(
              "truncate text-xs",
              !valueText && "text-muted-foreground",
            )}
          >
            {valueText || placeholder}
          </span>
          <span className="flex items-center gap-0.5">
            {selected.length > 0 && (
              <span onClick={clear} aria-hidden="true">
                <X className="text-muted-foreground hover:text-foreground size-3" />
              </span>
            )}
            <ChevronsUpDown className="text-muted-foreground size-3" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0", searchable ? "w-56" : "w-48")}
        align="start"
      >
        {list}
      </PopoverContent>
    </Popover>
  );
}
