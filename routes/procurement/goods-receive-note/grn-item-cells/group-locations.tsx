import { type UseFormReturn } from "react-hook-form";
import type { GrnFormValues } from "../grn-form-schema";
import { GrnLocationRow } from "../grn-location-row";
import { grnItemCols } from "../grn-item-columns";
import type { GrnGroup } from "./types";

/**
 * เนื้อหา expand ของแถว product — location rows เป็น `<table table-fixed>` ที่ align
 * คอลัมน์กับ group row ผ่าน GRN_COL (mirror po-items-grid-locations)
 *
 * ไม่มีหัวคอลัมน์เป็นของตัวเอง — colgroup ชุดเดียวกับตารางหลัก คอลัมน์จึงตรงกัน
 * อยู่แล้ว หัวอีกชุดคือการอ่านคำเดิมซ้ำห่างกันไม่กี่สิบพิกเซล
 */
export function GrnGroupLocations({
  group,
  form,
  itemFields,
  disabled,
  plainText,
  isPo,
  autoOpenLocationKey,
  openLocationKey,
  onLocationOpenChange,
  onDeleteItem,
}: {
  group: GrnGroup;
  form: UseFormReturn<GrnFormValues>;
  itemFields: { id: string }[];
  disabled: boolean;
  plainText: boolean;
  isPo: boolean;
  autoOpenLocationKey: string | null;
  openLocationKey: string | null;
  onLocationOpenChange: (groupKey: string, open: boolean) => void;
  onDeleteItem: (index: number) => void;
}) {
  "use no memo";
  const showActionCol = !disabled;

  // คอลัมน์ align กับ group row — % ของ (data + action ถ้ามี); order นับเฉพาะ isPo
  // ความกว้าง combo (discount/tax) ย่อในโหมดอ่าน ใช้เกณฑ์เดียวกับ showActionCol
  const { col: GRN_COL, dataTotal } = grnItemCols(isPo, showActionCol);
  const denom = dataTotal + (showActionCol ? GRN_COL.action : 0);
  const pct = (px: number) => `${(px / denom) * 100}%`;
  const colCount = 10 + (isPo ? 1 : 0) + (showActionCol ? 1 : 0);

  return (
    <table className="w-full table-fixed border-separate border-spacing-0 text-xs">
      <colgroup>
        <col style={{ width: pct(GRN_COL.product) }} />
        <col style={{ width: pct(GRN_COL.unit) }} />
        {isPo && <col style={{ width: pct(GRN_COL.order) }} />}
        <col style={{ width: pct(GRN_COL.received) }} />
        <col style={{ width: pct(GRN_COL.foc) }} />
        <col style={{ width: pct(GRN_COL.price) }} />
        <col style={{ width: pct(GRN_COL.sub) }} />
        <col style={{ width: pct(GRN_COL.discount) }} />
        <col style={{ width: pct(GRN_COL.net) }} />
        <col style={{ width: pct(GRN_COL.tax) }} />
        <col style={{ width: pct(GRN_COL.amt) }} />
        {showActionCol && <col style={{ width: pct(GRN_COL.action) }} />}
      </colgroup>
      <tbody className="divide-border/60 divide-y">
        {group.indices.length === 0 && (
          <tr>
            <td
              colSpan={colCount}
              className="text-muted-foreground py-3 text-center"
            >
              —
            </td>
          </tr>
        )}
        {group.indices.map((idx) => (
          <GrnLocationRow
            key={itemFields[idx]?.id ?? idx}
            index={idx}
            form={form}
            disabled={disabled}
            isManual={group.isManual}
            isPo={isPo}
            showDelete={showActionCol}
            onDelete={() => onDeleteItem(idx)}
            groupIndices={group.indices}
            plainText={plainText}
            autoOpenLocation={group.key === autoOpenLocationKey}
            locationOpen={
              // เปิดเฉพาะแถวแรกของกลุ่ม — เลือกสินค้าครั้งเดียวไม่ควรเปิดทุกคลัง
              idx === group.indices[0] && group.key === openLocationKey
                ? true
                : undefined
            }
            onLocationOpenChange={(open) =>
              onLocationOpenChange(group.key, open)
            }
          />
        ))}
      </tbody>
    </table>
  );
}
