import { type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import type { CnFormValues } from "../cn-form-schema";
import type { CnCreditNoteType } from "../cn-item-compute";
import { CN_COL, cnReturnRowTotal } from "./helpers";
import { QtyCell } from "./qty-cell";
import { PriceCell } from "./price-cell";
import { LineSubtotalText, SubtotalCell } from "./subtotal-cell";
import { DiscountCell } from "./discount-cell";
import { NetCell } from "./net-cell";
import { TaxCell } from "./tax-cell";
import { TotalCell } from "./total-cell";

/**
 * แถวที่กางออก = ฝั่ง "คืน" ช่องกรอกทั้งหมดอยู่ที่นี่
 * table-fixed + colgroup คิดความกว้างเป็น % ของช่วงที่ครอบ (ทรงเดียวกับ
 * LocationsEditor ของ PO) — ใช้ px ตรง ๆ ไม่ได้เพราะตารางหลัก scroll แนวนอน
 */
export function CnReturnRow({
  form,
  index,
  type,
  disabled,
  showActionCol,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  type: CnCreditNoteType;
  disabled: boolean;
  showActionCol: boolean;
}) {
  "use no memo";
  const t = useTranslations("procurement.creditNote");
  const isAmountDiscountRow = type === "amount_discount";
  const denom = cnReturnRowTotal(showActionCol);
  const pct = (px: number) => `${(px / denom) * 100}%`;

  return (
    <table className="w-full table-fixed text-xs">
      <colgroup>
        {/* ป้าย "คืน" กินที่ของ product + location รวมกัน */}
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
        {/* h-11 + px-3 py-1 = ระยะเดียวกับเซลล์ของตารางหลักเป๊ะ ๆ เดิมแถวคืนใช้
            px-2/px-1 และไม่มีความสูงขั้นต่ำ แถบจึงเตี้ยกว่าแถวหลักที่ชื่อสินค้า
            กินสองบรรทัด อ่านแล้วเหมือนคนละตาราง */}
        <tr className="h-11 align-middle">
          {/* ป้ายบอกว่าแถวนี้คือของที่คืน — อยู่ท้ายช่วง product+location ชิดขวา
              ติดกับช่องค่าแรก · เดิมวางซ้อนอยู่เหนือค่า ทำให้ค่าในช่องนี้ต่ำกว่า
              ค่าช่องอื่นทั้งแถว อ่านแล้วไม่เป็นแนวเดียวกัน */}
          <td className="text-muted-foreground text-micro px-3 py-1 text-right font-semibold">
            {isAmountDiscountRow ? t("cnAmount") : t("returnLine")}
          </td>
          {/* ช่องกรอกของแถวอยู่ตรงนี้ช่องเดียว สลับตามประเภทใบ — quantity_return
              กรอกจำนวนคืน, amount_discount กรอกยอดลดหนี้ตรง ๆ (จำนวนคืนไม่มีผล
              ต่อยอดในโหมดนั้น จึงไม่ต้องมีช่องล็อกไว้ให้รก) */}
          <td className="px-3 py-1 text-right">
            {isAmountDiscountRow ? (
              <SubtotalCell
                form={form}
                index={index}
                type={type}
                disabled={disabled}
              />
            ) : (
              <QtyCell
                form={form}
                index={index}
                disabled={disabled}
                locked={false}
              />
            )}
          </td>
          {/* ราคาต่อหน่วยเท่าฝั่งรับเสมอ — คืนของชิ้นเดิมในราคาเดิม */}
          <td className="px-3 py-1 text-right">
            <PriceCell control={form.control} index={index} />
          </td>
          {/* ช่องกรอกย้ายไปอยู่ช่องแรกของแถวแล้ว ตรงนี้จึงเป็นยอดอ่านอย่างเดียว
              ทั้งสองโหมด (amount_discount → subtotal = ยอดที่กรอกเอง) */}
          <td className="px-3 py-1 text-right">
            <LineSubtotalText form={form} index={index} type={type} />
          </td>
          <td className="px-3 py-1 text-right">
            <DiscountCell
              form={form}
              index={index}
              type={type}
              disabled={disabled}
            />
          </td>
          <td className="px-3 py-1 text-right">
            <NetCell control={form.control} index={index} />
          </td>
          <td className="px-3 py-1 text-right">
            <TaxCell
              form={form}
              index={index}
              type={type}
              disabled={disabled}
            />
          </td>
          <td className="px-3 py-1 text-right">
            <TotalCell control={form.control} index={index} />
          </td>
          {showActionCol && <td className="px-3 py-1" />}
        </tr>
      </tbody>
    </table>
  );
}
