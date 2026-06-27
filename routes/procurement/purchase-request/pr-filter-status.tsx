
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
import { PURCHASE_REQUEST_STATUS_OPTIONS } from "@/constant/purchase-request";
import { cn } from "@/lib/utils";

interface PrFilterStatusProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

const FIELD_PREFIX = "pr_status|string:";

/**
 * ตัวกรองสถานะใบขอซื้อแบบ multi-select แสดงใน Popover พร้อมรายการ Checkbox
 * ของทุกสถานะใน `PURCHASE_REQUEST_STATUS_OPTIONS` เก็บค่าเป็นสตริงรูปแบบ
 * `pr_status|string:draft,in_progress` เพื่อส่งเข้า API filter โดยตรง
 * มีตัวเลือก "All status" สำหรับล้างค่า และแสดงจำนวนที่เลือกบนปุ่ม trigger
 * @param props - คุณสมบัติของตัวกรอง
 * @param props.value - ค่าตัวกรองปัจจุบันในรูปแบบ `pr_status|string:...`
 * @param props.onChange - callback เมื่อเลือก/ยกเลิกสถานะ ส่งสตริงใหม่ (หรือ "" ถ้าไม่เลือก)
 * @param props.className - className เพิ่มเติมสำหรับปุ่ม trigger
 * @returns React element ของ Popover พร้อมรายการเช็กบ็อกซ์สถานะ PR
 * @example
 * <PrFilterStatus value={filter} onChange={setFilter} className="w-full" />
 */
export function PrFilterStatus({
  value,
  onChange,
  className,
}: PrFilterStatusProps) {
  const [open, setOpen] = useState(false);
  const tc = useTranslations("common");

  // Parse selected statuses from value (format: "pr_status|string:draft,in_progress")
  const selectedStatuses = (() => {
    if (!value?.startsWith(FIELD_PREFIX)) return new Set<string>();
    return new Set(value.slice(FIELD_PREFIX.length).split(","));
  })();

  // Extract raw status key from option value (e.g. "draft" from "pr_status|string:draft")
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
          {PURCHASE_REQUEST_STATUS_OPTIONS.map((opt) => {
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
