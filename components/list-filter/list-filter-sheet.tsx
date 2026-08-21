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
import type { FilterFieldDef, FilterPeerAccess } from "@/types/list-filter";

interface ListFilterSheetProps {
  readonly fields: readonly FilterFieldDef[];
  readonly values: Record<string, string>;
  readonly setValue: (key: string, value: string) => void;
  /**
   * เลิกใช้แล้ว — Clear All ล้างใน draft และมีผลตอนกด Done เหมือนการแก้ field อื่น
   * คง prop ไว้เพื่อไม่ต้องแก้ call site ทุกหน้า (ActiveFilterBar ยังใช้ clearAll ตรงปกติ)
   */
  readonly onClearAll?: () => void;
  readonly onSaveClick: () => void;
  readonly activeCount: number;
}

/**
 * แผ่น filter ที่ปรับตัวได้สำหรับ desktop (ขวา) และ mobile (ล่าง)
 *
 * แสดงปุ่ม Filter พร้อม badge ที่บ่งชี้จำนวน filter ที่ใช้งานอยู่
 * ค่าที่แก้ในชีทเป็น **draft** — มีผลจริงเมื่อกด Done (หรือ Save Current View)
 * ปิดชีทด้วยวิธีอื่น (คลิกนอก/Esc) = ทิ้ง draft ค่าเดิมไม่ถูกแตะ
 * ปุ่ม "Clear All" ล้างทุกค่าใน draft (disabled เมื่อไม่มีอะไรให้ล้าง)
 * ปุ่ม "Save Current View" apply draft แล้วเปิด SaveViewDialog
 *
 * @param props - props ของ ListFilterSheet
 * @param props.fields - รายการ FilterFieldDef สำหรับ filter
 * @param props.values - object ค่า filter ที่ apply แล้ว (key => filter string)
 * @param props.setValue - callback เขียนค่า filter จริงตามกุญแจ (ใช้ตอน apply)
 * @param props.onSaveClick - callback เปิด SaveViewDialog
 * @param props.activeCount - จำนวน filter ที่ใช้งานอยู่
 * @returns JSX element ของ sheet filter
 * @example
 * ```tsx
 * <ListFilterSheet
 *   fields={filterFields}
 *   values={filterValues}
 *   setValue={handleSetFilterValue}
 *   onSaveClick={handleOpenSaveDialog}
 *   activeCount={activeFilterCount}
 * />
 * ```
 */
export function ListFilterSheet({
  fields,
  values,
  setValue,
  onSaveClick,
  activeCount,
}: ListFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
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

  const handleOpenChange = (next: boolean) => {
    // เปิดชีท = เริ่ม draft จากค่าที่ apply อยู่จริง — ปิดโดยไม่ Done คือทิ้ง draft
    if (next) setDraft({ ...values });
    setOpen(next);
  };

  const setDraftValue = (key: string, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // ให้ custom control ที่ถือ key คู่ (เช่น created_at_to) อ่าน/เขียน draft เดียวกัน
  const peer: FilterPeerAccess = {
    get: (key) => draft[key] ?? "",
    set: setDraftValue,
  };

  /**
   * เขียนเฉพาะ key ที่ต่างจากค่าจริงลง URL — ทุก setValue อยู่ใน handler เดียวกัน
   * React batch ให้เป็น re-render เดียว จึง refetch รอบเดียวไม่ว่าจะแก้กี่ field
   */
  const apply = () => {
    for (const f of fields) {
      const next = draft[f.key] ?? "";
      if (next !== (values[f.key] ?? "")) setValue(f.key, next);
    }
  };

  const hasDraftValues = fields.some((f) => draft[f.key]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
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
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "max-h-[80vh]" : "w-[34rem] sm:max-w-[34rem]"}
      >
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
                      value={draft[f.key] ?? ""}
                      onChange={(v) => setDraftValue(f.key, v)}
                      peer={peer}
                    />
                  </div>
                ) : (
                  <FilterFieldControl
                    field={f}
                    value={draft[f.key] ?? ""}
                    onChange={(v) => setDraftValue(f.key, v)}
                    peer={peer}
                  />
                )}
              </Fragment>
            );
          })}
        </div>
        {/* desktop เรียงแถวนอน (Clear All ชิดซ้าย) — มือถือซ้อนแนวตั้งเต็มกว้างตามเดิม */}
        <SheetFooter className={cn("border-t", !isMobile && "flex-row")}>
          <Button
            variant="outline"
            disabled={!hasDraftValues}
            className={cn(!isMobile && "me-auto")}
            onClick={() =>
              setDraft(Object.fromEntries(fields.map((f) => [f.key, ""])))
            }
          >
            {tc("clearAll")}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              apply();
              setOpen(false);
              onSaveClick();
            }}
          >
            {tv("saveCurrent")}
          </Button>
          <Button
            onClick={() => {
              apply();
              setOpen(false);
            }}
          >
            {tc("done")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
