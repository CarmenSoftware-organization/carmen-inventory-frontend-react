import { type UseFormReturn } from "react-hook-form";
import type { CnFormValues } from "../cn-form-schema";
import { CN_COL, cnReturnRowTotal } from "./helpers";
import { ReceivedCell } from "./received-cell";
import { GrnAmountCell, GrnTaxCell } from "./grn-amount-cell";

/**
 * แถวที่กางออก = ยอดฝั่ง GRN ที่รับมาจริง อ่านอย่างเดียวทั้งแถว (ฝั่งคืนกรอกที่แถวหลัก)
 * table-fixed + colgroup คิดความกว้างเป็น % ของช่วงที่ครอบ (ทรงเดียวกับ
 * LocationsEditor ของ PO) — ใช้ px ตรง ๆ ไม่ได้เพราะตารางหลัก scroll แนวนอน
 */
export function CnGrnRow({
  form,
  index,
  showActionCol,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  showActionCol: boolean;
}) {
  "use no memo";
  const denom = cnReturnRowTotal(showActionCol);
  const pct = (px: number) => `${(px / denom) * 100}%`;
  const control = form.control;

  return (
    <table className="w-full table-fixed text-xs">
      <colgroup>
        {/* ช่องแรกกินที่ของ product + location รวมกัน */}
        <col style={{ width: pct(CN_COL.product + CN_COL.location) }} />
        <col style={{ width: pct(CN_COL.qty) }} />
        <col style={{ width: pct(CN_COL.price) }} />
        <col style={{ width: pct(CN_COL.sub) }} />
        <col style={{ width: pct(CN_COL.discount) }} />
        <col style={{ width: pct(CN_COL.net) }} />
        <col style={{ width: pct(CN_COL.tax) }} />
        <col style={{ width: pct(CN_COL.amount) }} />
        {showActionCol && <col style={{ width: pct(CN_COL.action) }} />}
      </colgroup>
      <tbody>
        {/* px-3 py-2.5 = ระยะเดียวกับเซลล์ของตารางหลักเป๊ะ ๆ เดิมแถวนี้ใช้
            px-2/px-1 แถบจึงเตี้ยกว่าแถวหลัก อ่านแล้วเหมือนคนละตาราง */}
        <tr className="align-top">
          {/* ที่ของ product + location — สินค้ากับคลังอ่านได้ที่แถวหลักแล้ว */}
          <td />
          <td className="px-3 py-2.5 text-right">
            <ReceivedCell control={control} index={index} />
          </td>
          <td className="px-3 py-2.5 text-right">
            <GrnAmountCell control={control} index={index} field="_grn_price" />
          </td>
          <td className="px-3 py-2.5 text-right">
            <GrnAmountCell
              control={control}
              index={index}
              field="_grn_sub_total"
            />
          </td>
          <td className="px-3 py-2.5 text-right">
            <GrnAmountCell
              control={control}
              index={index}
              field="_grn_discount_amount"
            />
          </td>
          <td className="px-3 py-2.5 text-right">
            <GrnAmountCell
              control={control}
              index={index}
              field="_grn_net_amount"
            />
          </td>
          <td className="px-3 py-2.5 text-right">
            <GrnTaxCell control={control} index={index} />
          </td>
          <td className="px-3 py-2.5 text-right">
            <GrnAmountCell
              control={control}
              index={index}
              field="_grn_total_amount"
            />
          </td>
          {showActionCol && <td className="px-3 py-2.5" />}
        </tr>
      </tbody>
    </table>
  );
}
