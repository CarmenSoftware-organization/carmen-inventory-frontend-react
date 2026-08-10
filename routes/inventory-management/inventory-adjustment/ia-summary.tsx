import { useFormatter, useTranslations } from "use-intl";
import { useWatch, type useForm } from "react-hook-form";
import { Ban, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SummaryFooterBar } from "@/components/ui/summary-bar";
import { useProfile } from "@/hooks/use-profile";
import type { AdjFormValues } from "./ia-form-schema";

interface AdjSummaryFooterProps {
  readonly form: ReturnType<typeof useForm<AdjFormValues>>;
  readonly formatter: ReturnType<typeof useFormatter>;
  readonly t: ReturnType<typeof useTranslations>;
  readonly canVoid: boolean;
  readonly canCommit: boolean;
  readonly isPending: boolean;
  readonly voidIsPending: boolean;
  readonly onVoid: () => void;
  readonly onCommit: () => void;
}

/**
 * แถบสรุปท้ายฟอร์ม — ยอดรวมอย่างเดียว
 *
 * ของเดิมเป็น sidebar ติดขวา 20rem ที่เอา status/วันที่/เหตุผล/คลัง มาโชว์ซ้ำกับ
 * hero และ document info อยู่แล้ว ย้ายลง `SummaryFooterBar` ตำแหน่งเดียวกับ
 * PR/PO/GRN/CN/SR แล้วคืนความกว้างให้ตารางรายการ · ขนาด/สไตล์ตาม PO เป๊ะ
 * (`emphasis` + suffix เป็นรหัสสกุลเงิน ไม่ override ขนาดเอง)
 *
 * Void กับ Commit อยู่แถวเดียวกับยอดรวม (แบบ SR/CN) — เป็นการตัดสินใจปิดจบ
 * เอกสารที่ดูยอดรวมประกอบ ไม่ใช่ปุ่มจัดการเอกสารทั่วไปแบบ edit/delete/print
 * ที่ยังอยู่บน hero
 */
export function AdjSummaryFooter({
  form,
  formatter,
  t,
  canVoid,
  canCommit,
  isPending,
  voidIsPending,
  onVoid,
  onCommit,
}: AdjSummaryFooterProps) {
  // commit อ่านจาก namespace ของโมดูล (t) ไม่ใช่ common.commit เพราะภาษาไทย
  // ของคีย์กลางคือ "ยืนยันรับสินค้า" ซึ่งเป็นของ GRN · ส่วน void เป็นคำกลางจริง
  const tc = useTranslations("common");
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const { defaultCurrencyCode } = useProfile();

  const grandTotal = items.reduce(
    (sum, it) => sum + (Number(it.total_cost) || 0),
    0,
  );

  const hasItems = items.length > 0;
  const showActions = canVoid || canCommit;
  // ยังไม่มีรายการและไม่มีปุ่มให้กด = ไม่มีอะไรให้แสดง ไม่ต้องมีแถบเปล่าค้างก้นจอ
  if (!hasItems && !showActions) return null;

  return (
    <SummaryFooterBar
      hasRecord={hasItems}
      items={[
        {
          key: "grandTotal",
          label: t("grandTotal"),
          value: formatter.number(grandTotal, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          emphasis: true,
          suffix: defaultCurrencyCode,
        },
      ]}
    >
      {showActions && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {canVoid && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onVoid}
              disabled={isPending || voidIsPending}
            >
              <Ban />
              {tc("void")}
            </Button>
          )}
          {/* น้ำเงินตัวเดียวกับ Submit — commit คือการปิดเอกสารของเจ้าของใบ
              ไม่ใช่การอนุมัติ · เขียว (success) ทั้งแอปสงวนไว้ให้ Approve
              เดิมเป็น info ซึ่งไม่ใช่สีของการกระทำ และไม่มีปุ่มไหนใช้อีกเลย */}
          {canCommit && (
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={onCommit}
            >
              <Check />
              {t("commit")}
            </Button>
          )}
        </div>
      )}
    </SummaryFooterBar>
  );
}
