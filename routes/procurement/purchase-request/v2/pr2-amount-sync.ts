import { useEffect } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import {
  computePrItemAmounts,
  resolveApprovedQty,
  type PrFormValues,
} from "../pr-form-schema";

/**
 * คำนวณ discount/tax/net/total ของแถวหนึ่งให้ตรงกับราคาและจำนวนที่กรอกอยู่เสมอ
 *
 * หน้าเดิมทำงานนี้สองที่: `pr-item-expand` (ตอนกางแถว) กับ `applyDerivedAmounts`
 * ใน `pr-item-fields` (ตอนดึงราคาอัตโนมัติให้แถวที่หุบอยู่) — แปลว่าแถวที่ไม่เคยกาง
 * และไม่เคยถูก auto-allocate จะไม่มีใครคำนวณให้เลย
 *
 * v2 ไม่มีการกาง/หุบ แถวเดียวเห็นหมด ตัวนี้จึงติดอยู่กับแถวโดยตรง ทุกแถวได้รับการ
 * คำนวณเท่ากันตลอดเวลา ไม่ขึ้นกับว่าผู้ใช้เคยเปิดดูหรือยัง
 *
 * override เปิด (`is_*_adjustment`) = ผู้ใช้กรอก amount เอง ตัวนี้จะไม่ไปทับ
 */
export function usePr2AmountSync(
  form: UseFormReturn<PrFormValues>,
  index: number,
  enabled: boolean,
) {
  "use no memo";
  const [
    price,
    requestedQty,
    approvedQty,
    discRate,
    isDiscAdj,
    discAmt,
    taxRate,
    isTaxAdj,
    taxAmt,
  ] = useWatch({
    control: form.control,
    name: [
      `items.${index}.pricelist_price`,
      `items.${index}.requested_qty`,
      `items.${index}.approved_qty`,
      `items.${index}.discount_rate`,
      `items.${index}.is_discount_adjustment`,
      `items.${index}.discount_amount`,
      `items.${index}.tax_rate`,
      `items.${index}.is_tax_adjustment`,
      `items.${index}.tax_amount`,
    ] as const,
  });

  const discOverride = isDiscAdj ?? false;
  const taxOverride = isTaxAdj ?? false;

  const { discountAmount, netAmount, taxAmount, totalPrice } =
    computePrItemAmounts({
      price: Number(price ?? 0),
      qty: resolveApprovedQty({
        approved_qty: Number(approvedQty ?? 0),
        requested_qty: Number(requestedQty ?? 0),
      }),
      discRate: Number(discRate ?? 0),
      isDiscAdj: discOverride,
      discAmt: Number(discAmt ?? 0),
      taxRate: Number(taxRate ?? 0),
      isTaxAdj: taxOverride,
      taxAmt: Number(taxAmt ?? 0),
    });

  useEffect(() => {
    if (!enabled || index < 0) return;
    const current = form.getValues(`items.${index}`);
    if (!current) return;

    const next = {
      ...current,
      ...(discOverride ? {} : { discount_amount: discountAmount }),
      ...(taxOverride ? {} : { tax_amount: taxAmount }),
      net_amount: netAmount,
      total_price: totalPrice,
    };

    // เขียนครั้งเดียวที่ตัว item ไม่ใช่ทีละ field — setValue แต่ละครั้งแจ้ง
    // subscriber ของฟอร์มหนึ่งรอบ
    //
    // วัดจริงที่ 100 รายการ (2026-07-27): ยุบ 4 ครั้งเหลือ 1 ได้ 159→139ms ต่อ
    // การพิมพ์หนึ่งตัวอักษร = ดีขึ้นแค่ ~13% ต้นทุนหลักไม่ได้อยู่ที่จำนวนครั้งที่เขียน
    // แต่อยู่ที่ "ทุกแถวถูกปลุกใหม่" เมื่อ items เปลี่ยน (เปลือกหน้า+ตารางเปล่าๆ
    // ใช้ 32ms แต่พิมพ์ในช่องจำนวนใช้ ~140ms) → ทางแก้จริงคือ virtualize ให้เรนเดอร์
    // ~20 แถวแทน 100 ไม่ใช่ไล่ลดจำนวน setValue
    //
    // ไม่ตั้ง shouldDirty — ยอดพวกนี้เป็นค่าที่คำนวณมา ไม่ใช่สิ่งที่ผู้ใช้กรอก
    // (ตรงกับหน้าเดิมที่ setValue เปล่าๆ เหมือนกัน) ไม่งั้นแค่เปิดหน้าก็ dirty
    if (
      next.discount_amount === current.discount_amount &&
      next.tax_amount === current.tax_amount &&
      next.net_amount === current.net_amount &&
      next.total_price === current.total_price
    ) {
      return;
    }
    form.setValue(`items.${index}`, next);
  }, [
    enabled,
    form,
    index,
    discOverride,
    taxOverride,
    discountAmount,
    taxAmount,
    netAmount,
    totalPrice,
  ]);
}
