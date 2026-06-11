
import type React from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { useTranslations } from "use-intl";

interface FilterOption {
  value: string;
  label: string;
  group?: string;
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

/**
 * Multi-select filter button สำหรับ list page toolbar
 *
 * value เก็บเป็น comma-separated string เพื่อให้ sync กับ URL query
 * ได้ตรง ๆ รองรับ grouped options (ผ่าน field group ใน FilterOption),
 * search input (เมื่อ searchable=true), auto-clear เมื่อเลือกครบทุก option
 * และปุ่ม X clear ในตัว trigger แสดง Badge จำนวนที่เลือก
 *
 * @param props - value (csv), onChange, options, placeholder, searchable ฯลฯ
 * @returns JSX element ของปุ่ม filter พร้อม popover
 * @example
 * ```tsx
 * <MultiSelectFilter
 *   value={statusFilter}
 *   onChange={setStatusFilter}
 *   options={PR_STATUS_OPTIONS}
 *   placeholder="Status"
 *   searchable
 * />
 * ```
 */
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("justify-between gap-1 text-xs font-normal", className)}
        >
          <span className="truncate text-xs">
            {selected.length > 0 ? (
              <>
                {placeholder}
                <Badge variant="secondary" size="xs" className="ml-1 tabular-nums">
                  {selected.length}
                </Badge>
              </>
            ) : (
              placeholder
            )}
          </span>
          <span className="flex items-center gap-0.5">
            {selected.length > 0 && (
              <span
                onClick={clear}
                aria-hidden="true"
              >
                <X className="size-3 text-muted-foreground hover:text-foreground" />
              </span>
            )}
            <ChevronsUpDown className="size-3 text-muted-foreground" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", searchable ? "w-56" : "w-48")} align="start">
        <Command>
          {searchable && (
            <CommandInput placeholder={searchPlaceholder} className="h-8 text-xs" />
          )}
          <CommandList>
            <CommandEmpty>{tc("noOptions")}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => onChange("")}
                className="text-xs"
              >
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
                        {opt.label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ));
            })()}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
