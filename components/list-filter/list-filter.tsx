import { Fragment, useState } from "react";
import { ListFilterPlus } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EyeBrow } from "@/components/ui/eye-brow";
import { FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { FilterFieldControl } from "./filter-field-control";
import { ListFilterMenu } from "./list-filter-menu";
import type { FilterFieldDef, FilterPeerAccess } from "@/types/list-filter";

interface ListFilterProps {
  readonly fields: readonly FilterFieldDef[];
  readonly values: Record<string, string>;
  readonly setValue: (key: string, value: string) => void;
  /** ล้าง filter ทั้งชุด (จัดการ linked/hidden key ให้ครบ) — ไม่ส่ง = ไล่ล้างรายตัว */
  readonly onClearAll?: () => void;
  readonly onSaveClick: () => void;
  readonly activeCount: number;
}

/**
 * จุดเข้า filter ของหน้า list — desktop มอบต่อให้ ListFilterMenu (popover สองชั้น
 * แบบ Linear) ส่วนมือถือ render bottom sheet ในไฟล์นี้
 *
 * แสดงปุ่ม Filter พร้อม badge ที่บ่งชี้จำนวน filter ที่ใช้งานอยู่
 * เลือกค่าแล้ว**มีผลทันที** (ยิง query เลย ไม่ต้องกด Done) — ปุ่ม Done แค่ปิดชีท
 * ปุ่ม "Clear All" ล้าง filter ทั้งชุดทันที (disabled เมื่อไม่มีอะไรให้ล้าง)
 * ปุ่ม "Save Current View" ปิดชีทแล้วเปิด SaveViewDialog
 *
 * @param props - props ของ ListFilter
 * @param props.fields - รายการ FilterFieldDef สำหรับ filter
 * @param props.values - object ค่า filter ปัจจุบัน (key => filter string)
 * @param props.setValue - callback เขียนค่า filter ตามกุญแจ
 * @param props.onClearAll - callback ล้าง filter ทั้งชุด
 * @param props.onSaveClick - callback เปิด SaveViewDialog
 * @param props.activeCount - จำนวน filter ที่ใช้งานอยู่
 * @returns JSX element ของ sheet filter
 * @example
 * ```tsx
 * <ListFilter
 *   fields={filterFields}
 *   values={filterValues}
 *   setValue={handleSetFilterValue}
 *   onSaveClick={handleOpenSaveDialog}
 *   activeCount={activeFilterCount}
 * />
 * ```
 */
export function ListFilter({
  fields,
  values,
  setValue,
  onClearAll,
  onSaveClick,
  activeCount,
}: ListFilterProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const t = useTranslations();
  const tc = useTranslations("common");
  const tv = useTranslations("listView");

  const visibleFields = fields.filter((f) => !f.hidden);

  // ไม่มี field ให้ filter เลย (เช่น credit-note-reason, approval) — ปุ่ม Filter
  // ไม่มีประโยชน์ ซ่อนทั้งปุ่มไป ViewSelector ยังคง sort ได้ตามปกติ
  if (visibleFields.length === 0) {
    return null;
  }

  // desktop ใช้เมนู popover สองชั้นแบบ Linear แทน sheet — มือถือคง bottom sheet
  // เดิมข้างล่างนี้ (submenu แบบเมนูไม่มีที่เด้งบนจอแคบ และ sheet เดิมเหมาะกับนิ้ว
  // อยู่แล้ว) props ส่งต่อทั้งชุดตรง ๆ logic filter อยู่ที่ useListFilters เหมือนเดิม
  if (!isMobile) {
    return (
      <ListFilterMenu
        fields={fields}
        values={values}
        setValue={setValue}
        onClearAll={onClearAll}
        onSaveClick={onSaveClick}
        activeCount={activeCount}
      />
    );
  }

  // ให้ custom control ที่ถือ key คู่ (เช่น created_at_to) อ่าน/เขียนค่าจริงชุดเดียวกัน
  const peer: FilterPeerAccess = {
    get: (key) => values[key] ?? "",
    set: setValue,
  };

  const hasValues = fields.some((f) => values[f.key]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="relative">
          <ListFilterPlus aria-hidden="true" />
          {tc("filter")}
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              size="xs"
              className="text-micro-legal absolute -top-1 -right-1 h-4 min-w-4 px-1 tabular-nums"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh]">
        <SheetHeader>
          <SheetTitle>{tc("filter")}</SheetTitle>
        </SheetHeader>
        {/* มือถือคอลัมน์เดียว (จอแคบ แบ่งสองแล้วค่าที่เลือกโดนตัด) — desktop สองคอลัมน์ */}
        <div className="grid flex-1 grid-cols-1 content-start gap-x-3 gap-y-4 overflow-y-auto px-4 pb-4 sm:grid-cols-2">
          {/* field ที่ hidden: true คือ "hidden holder" ของอีก field หนึ่ง (เช่น
             created_at_to คู่กับ created_at_from) — ไม่ render อะไรเลยในชีทนี้
             (ค่ายังคง "จริง" ใน values/encode/saved-views ปกติ ดู FilterFieldDef) */}
          {visibleFields.map((f, i) => {
            /* หัวข้อ section โผล่เมื่อ field แรกของกลุ่ม (section ต่างจาก field
               ก่อนหน้า) — จัดกลุ่มตามลำดับ field ล้วน ๆ ไม่ re-sort ให้ */
            const showHeading =
              !!f.section && f.section !== visibleFields[i - 1]?.section;
            return (
              <Fragment key={f.key}>
                {/* เส้นคั่นก่อนหัวข้อ section — ยกเว้นกลุ่มแรกสุดของชีท */}
                {showHeading && i > 0 && <Separator className="col-span-full" />}
                {showHeading && (
                  <EyeBrow className="col-span-full -mb-2">
                    {t(f.section!)}
                  </EyeBrow>
                )}
                {/* labelKey ว่าง = field ไม่มี label ของตัวเอง (เช่น custom control
                   ที่จัดการ label ภายในตัวเองอยู่แล้ว หรือซ่อนทั้ง field ด้วย
                   breakpoint class) — render control เปล่า ๆ ไม่ห่อ wrapper
                   `space-y-1.5` เพื่อไม่ให้เหลือช่องว่างลอย ๆ */}
                {f.labelKey ? (
                  <div
                    // ช่วงวันที่กินเต็มแถว — ข้อความช่วงวัน (จาก – ถึง) ยาวเกินครึ่งคอลัมน์
                    className={cn(
                      "space-y-1.5",
                      f.control === "date-range" && "sm:col-span-2",
                    )}
                  >
                    <FieldLabel className="text-xs">{t(f.labelKey)}</FieldLabel>
                    <FilterFieldControl
                      field={f}
                      value={values[f.key] ?? ""}
                      onChange={(v) => setValue(f.key, v)}
                      peer={peer}
                    />
                  </div>
                ) : (
                  <FilterFieldControl
                    field={f}
                    value={values[f.key] ?? ""}
                    onChange={(v) => setValue(f.key, v)}
                    peer={peer}
                  />
                )}
              </Fragment>
            );
          })}
        </div>
        <SheetFooter className="border-t">
          <Button
            variant="outline"
            disabled={!hasValues}
            className={cn(!isMobile && "me-auto")}
            onClick={() => {
              // ล้างเป็นชุดเดียว (onClearAll จัดการ linked/hidden key ให้ครบ) —
              // fallback ไล่ล้างรายตัวเมื่อหน้าไม่ได้ส่ง prop มา
              if (onClearAll) onClearAll();
              else for (const f of fields) setValue(f.key, "");
            }}
          >
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
          <Button onClick={() => setOpen(false)}>{tc("done")}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
