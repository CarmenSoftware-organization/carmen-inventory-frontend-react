
import { useTranslations } from "use-intl";
import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { STORE_REQUISITION_STATUS_OPTIONS } from "@/constant/store-requisition";
import { cn } from "@/lib/utils";

interface SrFilterStatusProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

const FIELD_PREFIX = "doc_status|string:";

/**
 * Popover filter แบบเลือกหลายสถานะเอกสาร SR พร้อม checkbox
 * สร้างค่า filter string เป็นรูปแบบ "doc_status|string:xxx,yyy"
 *
 * @param props - value ปัจจุบัน, onChange handler และ className
 * @param props.value - filter string ปัจจุบัน
 * @param props.onChange - callback เมื่อเลือกสถานะ
 * @param props.className - className เพิ่มเติมของ trigger
 * @returns คอมโพเนนต์ popover filter
 * @example
 * <SrFilterStatus value={filter} onChange={setFilter} />
 */
export function SrFilterStatus({
  value,
  onChange,
  className,
}: SrFilterStatusProps) {
  const [open, setOpen] = useState(false);
  const tc = useTranslations("common");

  const selectedStatuses = !value?.startsWith(FIELD_PREFIX)
    ? new Set<string>()
    : new Set(value.slice(FIELD_PREFIX.length).split(","));

  const getStatusKey = (optionValue: string) =>
    optionValue.slice(FIELD_PREFIX.length);

  const handleToggle = (statusKey: string) => {
    const next = new Set(selectedStatuses);
    if (next.has(statusKey)) {
      next.delete(statusKey);
    } else {
      next.add(statusKey);
    }

    if (next.size === 0) {
      onChange("");
    } else {
      onChange(`${FIELD_PREFIX}${Array.from(next).join(",")}`);
    }
  };

  const selectedCount = selectedStatuses.size;

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("justify-between", className)}
        >
          <span className={cn("truncate", !selectedCount && "text-xs")}>
            {selectedCount > 0
              ? `${tc("status")} (${selectedCount})`
              : tc("status")}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
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
            <span className="truncate">{tc("allStatus")}</span>
          </label>
          {STORE_REQUISITION_STATUS_OPTIONS.map((opt) => {
            const statusKey = getStatusKey(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none",
                  "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Checkbox
                  checked={selectedStatuses.has(statusKey)}
                  onCheckedChange={() => handleToggle(statusKey)}
                />
                <span className="truncate">{opt.label}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
