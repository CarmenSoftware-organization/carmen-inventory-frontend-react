import { useState } from "react";
import { Filter as FilterIcon } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { FieldLabel } from "@/components/ui/field";
import { useIsMobile } from "@/hooks/use-mobile";
import { FilterFieldControl } from "./filter-field-control";
import type { FilterFieldDef } from "@/types/list-filter";

interface ListFilterSheetProps {
  readonly fields: readonly FilterFieldDef[];
  readonly values: Record<string, string>;
  readonly setValue: (key: string, value: string) => void;
  readonly onClearAll: () => void;
  readonly onSaveClick: () => void;
  readonly activeCount: number;
}

/**
 * แผ่น filter ที่ปรับตัวได้สำหรับ desktop (ขวา) และ mobile (ล่าง)
 *
 * แสดงปุ่ม Filter พร้อม badge ที่บ่งชี้จำนวน filter ที่ใช้งานอยู่
 * เมื่อกด เปิด Sheet ที่มี fields สำหรับควบคุม filter
 * ปุ่ม "Clear All" ลบ filter ทั้งหมด
 * ปุ่ม "Save Current View" เปิด SaveViewDialog จากนั้นปิด sheet
 * ปุ่ม "Done" ปิด sheet
 *
 * @param props - props ของ ListFilterSheet
 * @param props.fields - รายการ FilterFieldDef สำหรับ filter
 * @param props.values - object ค่า filter ปัจจุบัน (key => filter string)
 * @param props.setValue - callback เปลี่ยนค่า filter ตามกุญแจ
 * @param props.onClearAll - callback ลบ filter ทั้งหมด
 * @param props.onSaveClick - callback เปิด SaveViewDialog
 * @param props.activeCount - จำนวน filter ที่ใช้งานอยู่
 * @returns JSX element ของ sheet filter
 * @example
 * ```tsx
 * <ListFilterSheet
 *   fields={filterFields}
 *   values={filterValues}
 *   setValue={handleSetFilterValue}
 *   onClearAll={handleClearAllFilters}
 *   onSaveClick={handleOpenSaveDialog}
 *   activeCount={activeFilterCount}
 * />
 * ```
 */
export function ListFilterSheet({
  fields, values, setValue, onClearAll, onSaveClick, activeCount,
}: ListFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const t = useTranslations();
  const tc = useTranslations("common");
  const tv = useTranslations("listView");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="relative">
          <FilterIcon aria-hidden="true" />
          {tc("filter")}
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              size="xs"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-micro-legal tabular-nums"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "max-h-[80vh] overflow-y-auto" : "w-80 sm:w-96 overflow-y-auto"}
      >
        <SheetHeader>
          <SheetTitle>{tc("filter")}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <FieldLabel className="text-xs">{t(f.labelKey)}</FieldLabel>
              <FilterFieldControl
                field={f}
                value={values[f.key] ?? ""}
                onChange={(v) => setValue(f.key, v)}
              />
            </div>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" onClick={onClearAll}>
              {tc("clearAll")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                onSaveClick();
              }}
            >
              {tv("saveCurrent")}
            </Button>
            <Button onClick={() => setOpen(false)}>
              {tc("done")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
