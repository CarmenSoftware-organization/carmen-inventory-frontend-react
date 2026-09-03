import { useWatch, type Control } from "react-hook-form";
import { InputSuffixPlain } from "@/components/ui/input/input-suffix";
import type { CnFormValues } from "../cn-form-schema";

/**
 * Received — จำนวนที่รับเข้าตาม GRN บรรทัดอ้างอิง อ่านอย่างเดียวเสมอ
 * (เพดานอ้างอิงของจำนวนคืน ไม่ใช่ค่าที่ผู้ใช้กรอก และไม่เข้า payload)
 */
export function ReceivedCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const received = useWatch({
    control,
    name: `items.${index}._grn_received_qty`,
  });
  const unitName =
    useWatch({ control, name: `items.${index}.unit_name` }) ?? "";
  return (
    <InputSuffixPlain
      className="w-full"
      // null = ยังไม่ได้ค่าจาก GRN — ขีดไว้ ไม่โชว์ 0 ให้เข้าใจผิดว่ารับมา 0
      value={received == null ? "—" : String(received)}
      suffix={unitName}
    />
  );
}
