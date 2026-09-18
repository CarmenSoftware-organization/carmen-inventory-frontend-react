import { type UseFormReturn } from "react-hook-form";
import { formatCurrency } from "@/lib/currency-utils";
import type { CnFormValues } from "../cn-form-schema";
import type { CnCreditNoteType } from "../cn-item-compute";
import { useCnItemLine } from "./helpers";

/**
 * ส่วนลดของบรรทัดคืน — อ่านอย่างเดียว คิดจาก rate ที่ติดมากับบรรทัด GRN
 * (`amount_discount` ไม่มีส่วนลดต่อบรรทัด สูตรคืน 0 มาเอง — ช่องตัวเลขต้องขึ้น
 * ตัวเลข คนอ่านจะได้เอาไปบวกลบกับคอลัมน์อื่นได้เลย)
 */
export function DiscountCell({
  form,
  index,
  type,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  type: CnCreditNoteType;
}) {
  "use no memo";
  const line = useCnItemLine(form, index, type);
  return (
    <span className="block text-right text-xs tabular-nums">
      {formatCurrency(line.discount_amount)}
    </span>
  );
}
