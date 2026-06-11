"use no memo";

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
  disabled,
  locationsDisabled,
  readOnly,
  showApproveCheckbox,
  selected,
  onToggleSelected,
  onToggleSelectAll,
  onDelete,
}: PoItemsGridProps) {
  const tfl = useTranslations("field");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // stable open-toggle — กัน memo ของ ItemRow/ItemCard แตกตอน grid re-render
  const handleToggleOpen = useCallback(
    (index: number) =>
      setOpenIndex((prev) => (prev === index ? null : index)),
    [],
  );

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
        <PoItemComputedSync key={i} control={form.control} form={form} index={i} />
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
  return (
    <thead className="bg-muted/40 text-muted-foreground font-bold tracking-wider uppercase">
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
