
import { useState } from "react";
import { useTranslations } from "use-intl";
import {
  Check,
  ChevronsUpDown,
  CircleAlert,
  Loader2,
  RadioTower,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Badge } from "@/components/ui/badge";
import { useBusinessType } from "@/hooks/use-business-type";
import EmptyComponent from "../empty-component";

interface LookupBuTypeProps {
  readonly value?: { id: string; name: string }[];
  readonly onValueChange: (value: { id: string; name: string }[]) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly error?: string;
}

/**
 * Lookup Popover + Command สำหรับเลือกประเภทของ Business Unit (multi-select)
 *
 * ดึงข้อมูลผ่าน `useBusinessType` (endpoint `/business-types`) พร้อม server-side search
 * กรองเฉพาะ `is_active = true` รองรับการเลือกหลายรายการ (multi-select) แสดงเป็น badge
 * ที่มีปุ่ม X สำหรับลบแต่ละรายการ ไม่ใช้ `LookupCombobox` เพราะเป็น multi-select
 *
 * @param value - array ของ business type ที่เลือกอยู่ (`{ id, name }[]`)
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่ง array ใหม่
 * @param disabled - ปิดการใช้งาน lookup
 * @param placeholder - ข้อความ placeholder ตอนยังไม่เลือก
 * @param className - className เพิ่มเติม
 * @returns JSX popover element สำหรับ multi-select business type
 * @example
 * ```tsx
 * <Controller
 *   name="business_types"
 *   control={form.control}
 *   render={({ field }) => (
 *     <LookupBuType value={field.value} onValueChange={field.onChange} />
 *   )}
 * />
 * ```
 */
export function LookupBuType({
  value = [],
  onValueChange,
  disabled,
  placeholder,
  className,
  error,
}: LookupBuTypeProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useBusinessType({ search: search || undefined, perpage: 30 });
  const businessTypes = data?.data?.filter((b) => b.is_active) ?? [];

  const [open, setOpen] = useState(false);

  const selectedIds = new Set(value.map((v) => v.id));

  const handleSelect = (bt: { id: string; name: string }) => {
    if (selectedIds.has(bt.id)) {
      onValueChange(value.filter((v) => v.id !== bt.id));
    } else {
      onValueChange([...value, { id: bt.id, name: bt.name }]);
    }
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onValueChange(value.filter((v) => v.id !== id));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                aria-expanded={open}
                aria-invalid={!!error}
                className={cn(
                  "h-auto min-h-8 flex justify-between items-center pl-3 pr-1 text-sm py-1",
                  error && "border-destructive",
                  className,
                )}
                disabled={disabled}
              >
                <div className="flex flex-wrap gap-1">
                  {value.length > 0 ? (
                    value.map((item) => (
                      <Badge key={item.id} variant="secondary" size="sm">
                        {item.name}
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={tl("remove", { name: item.name })}
                          className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => handleRemove(e, item.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleRemove(
                                e as unknown as React.MouseEvent,
                                item.id,
                              );
                            }
                          }}
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </span>
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">
                      {placeholder ?? tl("select", { entity: tfl("businessType") })}
                    </span>
                  )}
                </div>
                {error ? (
                  <CircleAlert
                    className="size-4 shrink-0 text-destructive"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          {!!error && !open && (
            <TooltipContent
              side="top"
              align="end"
              className="bg-background text-destructive [&>svg]:fill-background [&>svg]:text-border border px-3 py-2 text-xs font-semibold"
            >
              {error}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command
          filter={(value, search) => {
            if (!search) return 1;
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput
            placeholder={tl("search", { entity: tfl("businessType") })}
            className="placeholder:text-xs"
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <EmptyComponent
                    title={tl("noFound", { entity: tfl("businessType") })}
                    icon={RadioTower}
                  />
                </CommandEmpty>
                <CommandGroup>
                  {businessTypes.map((bt) => {
                    const isSelected = selectedIds.has(bt.id);
                    return (
                      <CommandItem
                        key={bt.id}
                        value={bt.name}
                        onSelect={() => handleSelect(bt)}
                        className="text-xs"
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible",
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </div>
                        {bt.name}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
