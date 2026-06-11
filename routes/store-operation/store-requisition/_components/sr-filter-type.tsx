
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
import { Badge } from "@/components/ui/badge";
import { SR_TYPE, type StoreRequisitionType } from "@/types/store-requisition";
import { cn } from "@/lib/utils";

interface SrFilterTypeProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

const FIELD_PREFIX = "sr_type|string:";
const TYPE_OPTIONS: { value: StoreRequisitionType; labelKey: string }[] = [
  { value: SR_TYPE.TRANSFER, labelKey: "transfer" },
  { value: SR_TYPE.ISSUE, labelKey: "issue" },
];

/**
 * Popover filter เลือกประเภทใบเบิกสินค้าหลายค่า (Transfer / Issue) ผ่าน checkbox
 * สร้างค่า filter string รูปแบบ "sr_type|string:transfer,issue"
 *
 * @param props - value ปัจจุบัน, onChange handler และ className
 * @param props.value - filter string ปัจจุบัน
 * @param props.onChange - callback เมื่อเลือกประเภท
 * @param props.className - className เพิ่มเติมของ trigger
 * @returns คอมโพเนนต์ popover filter
 * @example
 * <SrFilterType value={srType} onChange={setSrType} />
 */
export function SrFilterType({
  value,
  onChange,
  className,
}: SrFilterTypeProps) {
  const [open, setOpen] = useState(false);
  const tc = useTranslations("common");

  const selectedTypes = !value?.startsWith(FIELD_PREFIX)
    ? new Set<string>()
    : new Set(value.slice(FIELD_PREFIX.length).split(",").filter(Boolean));

  const handleToggle = (typeKey: string) => {
    const next = new Set(selectedTypes);
    if (next.has(typeKey)) {
      next.delete(typeKey);
    } else {
      next.add(typeKey);
    }

    // Selecting every option == no filter (all)
    if (next.size === 0 || next.size === TYPE_OPTIONS.length) {
      onChange("");
    } else {
      onChange(`${FIELD_PREFIX}${Array.from(next).join(",")}`);
    }
  };

  const selectedCount = selectedTypes.size;

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("justify-between gap-1 text-xs font-normal", className)}
        >
          <span className="truncate text-xs">
            {tc("type")}
            {selectedCount > 0 && (
              <Badge
                variant="secondary"
                size="xs"
                className="ml-1 tabular-nums"
              >
                {selectedCount}
              </Badge>
            )}
          </span>
          <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
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
          {TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none",
                "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Checkbox
                checked={selectedTypes.has(opt.value)}
                onCheckedChange={() => handleToggle(opt.value)}
              />
              <span className="truncate">{tc(opt.labelKey)}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
