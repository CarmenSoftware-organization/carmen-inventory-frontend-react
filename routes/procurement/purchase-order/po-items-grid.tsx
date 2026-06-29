import { Fragment, memo, useCallback, useState } from "react";
import { useTranslations } from "use-intl";
import { type UseFormReturn } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { PoItemComputedSync } from "./po-item-table";
import { ItemCard } from "./po-items-grid-card";
import { ExpandedRow } from "./po-items-grid-expanded";
import { ItemRow } from "./po-items-grid-row";
import type { PoFormValues } from "./po-form-schema";

interface PoItemsGridProps {
  readonly form: UseFormReturn<PoFormValues>;
  readonly itemCount: number;
  /** counter ที่เพิ่มทุกครั้งที่ add item — trigger auto-expand row บนสุด (index 0) */
  readonly addSignal: number;
  /** counter ที่เพิ่มทุกครั้งที่ validation ไม่ผ่าน — trigger auto-expand row ที่ location ติด error */
  readonly revealErrorSignal: number;
  readonly disabled: boolean;
  /** disabled แยกสำหรับ location editor (PO จาก price list ปล่อยให้แก้ได้) */
  readonly locationsDisabled: boolean;
  readonly readOnly: boolean;
  readonly showApproveCheckbox: boolean;
  readonly selected: Set<number>;
  readonly onToggleSelected: (index: number, checked: boolean) => void;
  readonly onToggleSelectAll: (checked: boolean) => void;
  readonly onDelete: (index: number) => void;
}

export const PoItemsGrid = memo(function PoItemsGrid({
  form,
  itemCount,
  addSignal,
  revealErrorSignal,
  disabled,
  locationsDisabled,
  readOnly,
  showApproveCheckbox,
  selected,
  onToggleSelected,
  onToggleSelectAll,
  onDelete,
}: PoItemsGridProps) {
  "use no memo";
  const tfl = useTranslations("field");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [handledReveal, setHandledReveal] = useState(revealErrorSignal);
  const [handledAdd, setHandledAdd] = useState(addSignal);

  // stable open-toggle — กัน memo ของ ItemRow/ItemCard แตกตอน grid re-render
  const handleToggleOpen = useCallback(
    (index: number) => setOpenIndex((prev) => (prev === index ? null : index)),
    [],
  );

  // add item ใหม่ → prepend อยู่ index 0 → เปิด row นั้นทันทีให้กรอก location ได้เลย
  // (set state ระหว่าง render ตาม pattern ที่ React แนะนำแทน effect)
  if (addSignal !== handledAdd) {
    setHandledAdd(addSignal);
    setOpenIndex(0);
  }

  // validation ไม่ผ่าน: location field อยู่ใน expanded row เท่านั้น ถ้า row หุบอยู่
  // scroll หาไม่เจอ — auto-expand row แรกที่ location ติด error
  // revealErrorSignal bump จากทั้ง path Save (handleSubmit) และ Submit (trigger)
  // ที่ระดับฟอร์ม → prop เปลี่ยน → grid re-render → อ่าน errors สด ๆ หา target
  // (set state ระหว่าง render ตาม pattern ที่ React แนะนำแทน effect; scroll ระดับ
  //  ฟอร์ม retry ข้ามเฟรมจน field ใน expanded row mount แล้วค่อย scroll)
  if (revealErrorSignal !== handledReveal) {
    setHandledReveal(revealErrorSignal);
    const itemErrors = form.formState.errors.items;
    // เปิด row ที่ field ในส่วน expanded ติด error — locations หรือ order_qty
    // (order_qty = ยอดรวมจาก locations, read-only ในแถวหลัก แก้ได้แค่ใน location editor)
    const target = itemErrors
      ? Object.keys(itemErrors)
          .map(Number)
          .filter((n) => !Number.isNaN(n))
          .sort((a, b) => a - b)
          .find((i) => !!itemErrors[i]?.locations || !!itemErrors[i]?.order_qty)
      : undefined;
    if (target != null) setOpenIndex(target);
  }

  if (itemCount === 0) return null;

  const allSelected = selected.size === itemCount && itemCount > 0;
  const someSelected = selected.size > 0 && !allSelected;
  const headerCheckState: boolean | "indeterminate" = someSelected
    ? "indeterminate"
    : allSelected;

  // visible column count for `colSpan` of expanded row
  // base = 9 cells (#, product, unit, qty, price, disc, tax, total, expand) + 1 if checkbox shown
  const colCount = showApproveCheckbox ? 10 : 9;

  return (
    <>
      {/* Derived-field sync — 1 ตัวต่อ item, รัน setValue ครั้งเดียว
          (ไม่ซ้ำใน desktop ItemRow + mobile ItemCard ที่ mount พร้อมกัน) */}
      {Array.from({ length: itemCount }, (_, i) => (
        <PoItemComputedSync
          key={i}
          control={form.control}
          form={form}
          index={i}
        />
      ))}

      {/* Desktop / tablet — HTML table, browser-managed column widths */}
      <div className="border-border/60 hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-xs">
          <ItemsHeader
            tfl={tfl}
            showApproveCheckbox={showApproveCheckbox}
            headerCheckState={headerCheckState}
            onToggleAll={onToggleSelectAll}
          />
          <tbody>
            {Array.from({ length: itemCount }, (_, i) => {
              const isOpen = openIndex === i;
              return (
                <Fragment key={i}>
                  <ItemRow
                    form={form}
                    index={i}
                    disabled={disabled}
                    readOnly={readOnly}
                    showApproveCheckbox={showApproveCheckbox}
                    isSelected={selected.has(i)}
                    onToggleSelected={onToggleSelected}
                    isOpen={isOpen}
                    onToggleOpen={handleToggleOpen}
                  />
                  {isOpen && (
                    <ExpandedRow
                      form={form}
                      index={i}
                      disabled={disabled}
                      locationsDisabled={locationsDisabled}
                      readOnly={readOnly}
                      colSpan={colCount}
                      onDelete={onDelete}
                    />
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile — card layout */}
      <div className="flex flex-col gap-3 text-xs md:hidden">
        {Array.from({ length: itemCount }, (_, i) => (
          <ItemCard
            key={i}
            form={form}
            index={i}
            disabled={disabled}
            locationsDisabled={locationsDisabled}
            readOnly={readOnly}
            showApproveCheckbox={showApproveCheckbox}
            isSelected={selected.has(i)}
            onToggleSelected={onToggleSelected}
            isOpen={openIndex === i}
            onToggleOpen={handleToggleOpen}
            onDelete={onDelete}
          />
        ))}
      </div>
    </>
  );
});

function ItemsHeader({
  tfl,
  showApproveCheckbox,
  headerCheckState,
  onToggleAll,
}: {
  readonly tfl: (key: string) => string;
  readonly showApproveCheckbox: boolean;
  readonly headerCheckState: boolean | "indeterminate";
  readonly onToggleAll: (checked: boolean) => void;
}) {
  "use no memo";
  return (
    <thead className="bg-muted/40 text-muted-foreground font-semibold tracking-wider uppercase">
      <tr>
        {showApproveCheckbox && (
          <th scope="col" className="w-10 px-2 py-2 text-center">
            <Checkbox
              checked={headerCheckState}
              onCheckedChange={(v) => onToggleAll(v === true)}
              aria-label="Select all"
            />
          </th>
        )}
        <th scope="col" className="w-8 px-2 py-2" />
        <th scope="col" className="w-7 px-2 py-2 text-left">
          #
        </th>
        <th scope="col" className="px-2 py-2 text-left">
          {tfl("product")}
        </th>
        <th scope="col" className="px-2 py-2 text-left">
          {tfl("unit")}
        </th>
        <th scope="col" className="px-2 py-2 text-right">
          {tfl("qty")}
        </th>
        <th scope="col" className="px-2 py-2 text-right">
          {tfl("unitPrice")}
        </th>
        <th scope="col" className="px-2 py-2 text-right">
          {tfl("discPercent")}
        </th>
        <th scope="col" className="px-2 py-2 text-right">
          {tfl("tax")}
        </th>
        <th scope="col" className="px-2 py-2 text-right">
          {tfl("total")}
        </th>
      </tr>
    </thead>
  );
}
