import { useEffect, useState, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Control, UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { ArrowDown, ArrowUp, ChevronsUpDown, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { PrFormValues } from "../pr-form-schema";
import { Pr2Row } from "./pr2-row";
import type { Pr2Sort } from "./pr2-use-rows";
import type { Pr2Permissions } from "./pr2-permissions";
import {
  pr2FrozenCount,
  pr2FrozenOffsets,
  pr2Columns,
  pr2MinWidth,
} from "./pr2-columns";

/** ต่ำกว่านี้ virtualize ไม่คุ้ม — เรนเดอร์ครบเลยเรียบง่ายกว่าและเร็วพอ */
const VIRTUALIZE_THRESHOLD = 40;

interface Pr2GridProps {
  readonly control: Control<PrFormValues>;
  readonly form: UseFormReturn<PrFormValues>;
  /** index ของ items ที่จะแสดง — กรอง+เรียงมาแล้วจาก usePr2Rows */
  readonly rows: readonly number[];
  readonly sort: Pr2Sort | null;
  /** โชว์คอลัมน์ท้าย (ประวัติ/ลบ) — ปิดเมื่อโหมดอ่านและไม่มีรายการไหนมีประวัติ */
  readonly showAction: boolean;
  readonly onSort: (key: string) => void;
  readonly selected: ReadonlySet<number>;
  readonly onSelect: (index: number, checked: boolean) => void;
  readonly onSelectAll: (checked: boolean) => void;
  readonly dateFormat: string;
  readonly currencyCode?: string;
  /** ไม่มีรายการเลยในใบ (ต่างจาก "กรองแล้วไม่เจอ") */
  readonly isEmptyDocument: boolean;
  readonly perms: Pr2Permissions;
  readonly buCode?: string;
  readonly today: Date;
  readonly role?: string;
  readonly onAddItem?: () => void;
  /** เหตุผลที่เพิ่มรายการยังไม่ได้ — โชว์ปุ่มไว้แต่กดไม่ได้ ดีกว่าซ่อนจนคนใช้ตัน */
  readonly addItemDisabledReason?: string;
  readonly onRemoveItem?: (index: number) => void;
  /**
   * ช่องให้ฟอร์มสั่ง "เลื่อนมาที่แถวของ items index นี้" — ตารางเป็นคนเติมฟังก์ชันให้
   * จำเป็นเพราะโหมด virtualize แถวนอกช่วงที่เรนเดอร์ไม่มีตัวตนใน DOM ใครที่หา
   * element เอาเองจึงหาไม่เจอ
   */
  readonly scrollToRowRef?: RefObject<((itemIndex: number) => void) | null>;
}

/**
 * ตารางรายการของ PR v2
 *
 * ต่างจากหน้าเดิมสามเรื่อง: ไม่มี expand row (ทุกอย่างอยู่บนแถว), หัวตารางสองชั้น
 * แบบ merge cell ของ Excel, และจัดกลุ่มตามคลังพร้อมยอดย่อย — ใบนึงมีได้ถึง
 * 100 รายการข้ามหลายคลัง ถ้าไล่เป็นแถวยาวรวดเดียวคนอ่านไม่ไหว
 *
 * ใช้ <table> จริงไม่ใช่ CSS grid: sticky ในกริดที่แต่ละแถวเป็นกริดของตัวเองจะถูก
 * clamp อยู่ใน grid area ของแถวนั้น ตรึงคอลัมน์ข้ามแถวไม่ได้จริง (ลองแล้ว ช่องซ้อนกัน)
 */
export function Pr2Grid({
  control,
  form,
  rows,
  sort,
  onSort,
  showAction,
  selected,
  onSelect,
  onSelectAll,
  dateFormat,
  currencyCode,
  isEmptyDocument,
  perms,
  buCode,
  today,
  role,
  onAddItem,
  addItemDisabledReason,
  onRemoveItem,
  scrollToRowRef,
}: Pr2GridProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const tv2 = useTranslations("procurement.purchaseRequest.v2");
  const tfl = useTranslations("field");
  const columns = pr2Columns(perms.isCreatorView, showAction, perms.showSelectColumn);

  const allSelected = rows.length > 0 && rows.every((i) => selected.has(i));
  const someSelected = rows.some((i) => selected.has(i));

  // ผูก scroll container ผ่าน state ไม่ใช่ ref — ref เป็น null ตอน virtualizer
  // init รอบแรก แล้วมันไม่ re-measure ให้เอง ผลคือคิดว่า viewport ใหญ่เท่าเนื้อหา
  // แล้วเรนเดอร์ครบทุกแถว (เจอมาแล้ว: virtualItems = 105 ทั้งที่ container สูง 359px)
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  /**
   * virtualize เฉพาะโหมดแก้ไขที่แถวเยอะ
   *
   * วัดจริงที่ 100 รายการ: โหมดอ่านอย่างเดียวเรนเดอร์ครบ 100 แถวแล้ว scroll ได้
   * 60fps ไม่มี long task เลย (แถวเป็นข้อความล้วน) — virtualize ไปก็ไม่ได้อะไร
   * แถมเพิ่มความซับซ้อน แต่โหมดแก้ไขมีช่องกรอกจริง ทุกแถวถูกปลุกใหม่เมื่อ items
   * เปลี่ยน → ต้นทุนโตตามจำนวนแถวที่เรนเดอร์อยู่ ตัดให้เหลือ ~20 แถวจึงตรงจุด
   */
  const virtualize = !perms.formLocked && rows.length > VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => 56,
    overscan: 8,
    enabled: virtualize,
  });

  useEffect(() => {
    if (!scrollToRowRef) return;
    scrollToRowRef.current = (itemIndex: number) => {
      const pos = rows.indexOf(itemIndex);
      if (pos < 0) return;

      // โหมด virtualize แถวนอกช่วงไม่มีตัวตนใน DOM ต้องพามันมาเรนเดอร์ก่อน
      if (virtualize) virtualizer.scrollToIndex(pos, { align: "center" });

      /**
       * จัดคอลัมน์ที่ผิดให้มาชิดขอบขวาของคอลัมน์ที่ตรึงไว้
       *
       * ปล่อยให้ scrollIntoView จัดเองไม่ได้ มันเลือกระยะที่ "ขยับน้อยที่สุด"
       * ช่องจึงไปโผล่ริมขวาสุดของจอ ห่างจากชื่อสินค้าคนละฟาก ต้องกวาดตาข้าม
       * ทั้งจอเพื่อจะรู้ว่าแถวไหน · ชิดคอลัมน์ที่ตรึงคือใกล้บริบทที่สุดเท่าที่ทำได้
       *
       * ต้อง retry เพราะทั้งแถวที่เพิ่งถูกพามาเรนเดอร์ และตัวช่วย focus ที่ทำงาน
       * ก่อนหน้า ต่างก็ใช้เวลาหลายเฟรม — ตัวนี้ต้องเป็นคนสุดท้ายที่แตะ scrollLeft
       */
      let tries = 0;
      const align = () => {
        const invalid = scrollEl?.querySelector<HTMLElement>(
          `tr[data-index="${pos}"] [aria-invalid="true"], tr[data-index="${pos}"] [data-invalid="true"]`,
        );
        const cell = invalid?.closest("td");
        if (!cell || !scrollEl) {
          if (tries++ < 12) requestAnimationFrame(align);
          return;
        }
        const frozenCells =
          cell.parentElement?.querySelectorAll<HTMLElement>("td.sticky");
        const lastFrozen = frozenCells?.[frozenCells.length - 1];
        // คิดจากตำแหน่งบนจอ (getBoundingClientRect) ไม่ใช่ offsetLeft — ช่องที่ตรึง
        // เป็น position:sticky ค่า offsetLeft ของมันรวมระยะที่ถูกตรึงเลื่อนไปด้วย
        // เอามาบวกลบเป็นความกว้างไม่ได้ (ลองแล้ว ได้ตัวเลขที่เลื่อนไปไม่ถึง)
        const stopAt = lastFrozen
          ? lastFrozen.getBoundingClientRect().right
          : scrollEl.getBoundingClientRect().left;
        scrollEl.scrollLeft += cell.getBoundingClientRect().left - stopAt;
      };
      // เรียกสองเฟรมติด: เฟรมแรกอาจชนกับการเลื่อนของตัวช่วย focus ที่ทำงานอยู่
      requestAnimationFrame(() => {
        align();
        requestAnimationFrame(align);
      });
    };
    return () => {
      scrollToRowRef.current = null;
    };
  }, [scrollToRowRef, rows, virtualize, virtualizer, scrollEl]);

  const virtualItems = virtualizer.getVirtualItems();
  const padTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const padBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  if (isEmptyDocument) {
    return (
      <Empty className="border-border rounded-lg border border-dashed py-12">
        <p className="font-medium">{t("noItems")}</p>
        <p className="text-muted-foreground text-sm">{t("noItemsDesc")}</p>
        {onAddItem && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={!!addItemDisabledReason}
            title={addItemDisabledReason}
            onClick={onAddItem}
          >
            <Plus />
            {t("addItem")}
          </Button>
        )}
      </Empty>
    );
  }

  return (
    <div
      ref={setScrollEl}
      // ความสูงมาจาก flex ของ parent ไม่ใช่ calc(vh) ที่ต้องเดาความสูง chrome
      // (chrome สูงไม่เท่ากันระหว่างโหมดดูกับโหมดแก้ — textarea หมายเหตุโผล่มา)
      className="border-border min-h-0 flex-1 overflow-auto rounded-lg border"
    >
      {/*
        border-separate ไม่ใช่ border-collapse — collapse ทำให้เส้นขอบกลายเป็นของ
        "ตาราง" ไม่ใช่ของช่อง ช่องที่ตรึงจึงบังเส้นตรงรอยต่อไม่ได้ แถวที่เลื่อนผ่าน
        ใต้มันโผล่ขึ้นมาเป็นเส้นตัวหนังสือวิ่งตามการเลื่อน (ย้อมสีเส้นให้ทึบก็ไม่หาย
        เพราะไม่ใช่เรื่องสี) · separate = แต่ละช่องวาดเส้นของตัวเอง ทับได้จริง
        แลกกับต้องย้ายเส้นล่างจาก <tr> ไปไว้ที่ <td> เพราะโหมดนี้ไม่วาดเส้นของ <tr>
      */}
      <table
        className="w-full table-fixed border-separate border-spacing-0 text-sm"
        style={{ minWidth: pr2MinWidth(perms.isCreatorView, showAction, perms.showSelectColumn) }}
      >
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={{ width: `${col.rem}rem` }} />
          ))}
        </colgroup>

        <thead>
          <tr className="text-muted-foreground text-xs font-medium">
            {columns.map((col, i) => {
              const frozen = i < pr2FrozenCount(perms.isCreatorView, perms.showSelectColumn);
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    // สีเส้นต้องทึบ ไม่ใช่ `border-border/60` — ช่องหัวที่ตรึงลอยอยู่เหนือหัว
                    // คอลัมน์อื่นที่เลื่อนผ่านใต้มัน เส้นโปร่งทำให้ตัวหนังสือโผล่ตรงเส้น
                    // (เดิมมีทั้ง /60 และตัวทึบใส่ซ้อนกัน ตัวโปร่งชนะ)
                    "bg-muted border-border sticky top-0 z-30 border-r border-b px-2 py-2 font-medium last:border-r-0",
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left",
                    frozen && "z-40",
                  )}
                  style={frozen ? { left: pr2FrozenOffsets(perms.isCreatorView, perms.showSelectColumn)[i] } : undefined}
                >
                  {col.key === "select" ? (
                    perms.canSelectRows && (
                      <Checkbox
                        checked={
                          allSelected
                            ? true
                            : someSelected
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={(c) => onSelectAll(c === true)}
                        aria-label={t("selectAllItems")}
                      />
                    )
                  ) : (col.labelKey || col.label) && col.sortable !== false ? (
                    // กดหัวคอลัมน์เพื่อเรียง — แทนการจัดกลุ่มตามคลังที่ถอดออกไป
                    // (อยากดูเรียงตามคลังก็กดที่หัวคอลัมน์คลัง)
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className={cn(
                        "hover:text-foreground inline-flex w-full items-center gap-1 transition-colors",
                        col.align === "right" && "justify-end",
                        col.align === "center" && "justify-center",
                        sort?.key === col.key && "text-foreground",
                      )}
                    >
                      {col.labelKey ? tfl(col.labelKey as "product") : col.label}
                      {sort?.key === col.key ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="size-3 shrink-0" />
                        ) : (
                          <ArrowDown className="size-3 shrink-0" />
                        )
                      ) : (
                        <ChevronsUpDown className="size-3 shrink-0 opacity-30" />
                      )}
                    </button>
                  ) : (
                    (col.labelKey ? tfl(col.labelKey as "product") : col.label)
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        {rows.length === 0 ? (
          <tbody>
            <tr>
              <td
                colSpan={columns.length}
                className="text-muted-foreground px-4 py-10 text-center"
              >
                {tv2("noMatch")}
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody>
            {/* แถวเว้นระยะบน/ล่าง — เทคนิคนี้ทำให้ <table> ยัง layout คอลัมน์เอง
                ได้ตามปกติ (ถ้าใช้ absolute positioning แถวจะหลุดออกจาก colgroup
                แล้วคอลัมน์เพี้ยนทั้งตาราง) */}
            {padTop > 0 && (
              <tr aria-hidden>
                <td colSpan={columns.length} style={{ height: padTop }} />
              </tr>
            )}

            {(virtualize
              ? virtualItems.map((v) => ({ index: rows[v.index], pos: v.index }))
              : rows.map((index, pos) => ({ index, pos }))
            ).map(({ index, pos }) => (
              <Pr2Row
                key={index}
                rowRef={virtualize ? virtualizer.measureElement : undefined}
                vIndex={pos}
                control={control}
                form={form}
                index={index}
                selected={selected.has(index)}
                onSelect={onSelect}
                dateFormat={dateFormat}
                zebra={pos % 2 === 1}
                perms={perms}
                showAction={showAction}
                buCode={buCode}
                baseCurrencyCode={currencyCode}
                today={today}
                role={role}
                onRemove={onRemoveItem}
              />
            ))}

            {padBottom > 0 && (
              <tr aria-hidden>
                <td colSpan={columns.length} style={{ height: padBottom }} />
              </tr>
            )}
          </tbody>
        )}
      </table>

      {onAddItem && (
        <div className="border-border/60 border-t px-2 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!!addItemDisabledReason}
            title={addItemDisabledReason}
            onClick={onAddItem}
          >
            <Plus />
            {t("addItem")}
          </Button>
        </div>
      )}
    </div>
  );
}
