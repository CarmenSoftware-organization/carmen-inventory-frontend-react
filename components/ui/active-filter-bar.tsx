import { useTranslations } from "use-intl";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FilterInlineContext } from "@/components/ui/filter-inline-context";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FilterFieldControl } from "@/components/list-filter/filter-field-control";
import { SUBMENU_CLASS } from "@/components/list-filter/list-filter-menu";
import type { FilterFieldDef, FilterPeerAccess } from "@/types/list-filter";

export interface ActiveFilter {
  readonly key: string;
  readonly label: string;
  readonly value?: string;
  readonly onRemove: () => void;
  /**
   * ของสำหรับแก้ค่าจาก chip โดยตรง (กดที่ตัว chip แล้วเปิดตัวเลือก inline แบบ
   * เดียวกับ submenu ของ ListFilterMenu) — ไม่ส่งมา = chip อ่านอย่างเดียว ลบได้จาก X
   */
  readonly field?: FilterFieldDef;
  readonly rawValue?: string;
  readonly onChange?: (value: string) => void;
  readonly peer?: FilterPeerAccess;
}

interface ActiveFilterBarProps {
  readonly filters: ActiveFilter[];
  readonly onClearAll: () => void;
}

/**
 * แถบ chip ของ filter ที่ใช้งานอยู่ — chip ที่มาพร้อม `field` กดแล้วเปิด popover
 * ตัวเลือกของ field นั้น (control inline ชุดเดียวกับ submenu ของเมนู filter ผ่าน
 * FilterInlineContext) แก้ค่าได้ทันทีไม่ต้องกลับไปเปิดเมนู — ปุ่ม X ลบ filter ทิ้ง
 * แยกจากส่วนที่กดเปิด editor
 */
export function ActiveFilterBar({ filters, onClearAll }: ActiveFilterBarProps) {
  const tc = useTranslations("common");

  if (filters.length === 0) return null;

  return (
    <div className="bg-muted/30 flex scrollbar-none flex-nowrap items-center gap-1.5 overflow-x-auto rounded-md px-2 py-1.5 sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
      <span className="text-muted-foreground text-micro-legal sm:text-micro shrink-0">
        {tc("activeFilter")}:
      </span>
      {filters.map((filter) => {
        const chipText = filter.value ? (
          <>
            <span className="text-muted-foreground font-normal">
              {filter.label}
            </span>
            {filter.value}
          </>
        ) : (
          filter.label
        );

        return (
          <Badge
            key={filter.key}
            variant="secondary"
            size="xs"
            className="text-micro-legal sm:text-micro shrink-0 gap-1"
          >
            {filter.field && filter.onChange ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex cursor-pointer items-center gap-1"
                  >
                    {chipText}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className={cn(SUBMENU_CLASS[filter.field.control])}
                >
                  <FilterInlineContext.Provider value={true}>
                    <FilterFieldControl
                      field={filter.field}
                      value={filter.rawValue ?? ""}
                      onChange={filter.onChange}
                      peer={filter.peer}
                    />
                  </FilterInlineContext.Provider>
                </PopoverContent>
              </Popover>
            ) : (
              chipText
            )}
            <button
              type="button"
              onClick={filter.onRemove}
              aria-label={`Remove ${filter.label} filter`}
              className="hover:text-foreground -mr-0.5 cursor-pointer rounded-full"
            >
              <X className="size-3" />
            </button>
          </Badge>
        );
      })}
      <button
        type="button"
        onClick={onClearAll}
        className="text-muted-foreground hover:text-foreground text-micro-legal sm:text-micro shrink-0 cursor-pointer underline"
      >
        {tc("clearAll")}
      </button>
    </div>
  );
}
