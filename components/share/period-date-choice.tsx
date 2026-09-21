import { useTranslations } from "use-intl";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/use-profile";
import { formatDate, isOutsideOpenPeriod } from "@/lib/date-utils";

export type PeriodDateChoice = "open-period" | "document";

/**
 * ถามว่าจะลงวันที่ไหน เมื่อวันที่บนเอกสารอยู่นอกงวดบัญชีที่เปิดอยู่
 *
 * เรนเดอร์เฉพาะตอนที่ต้องถามจริง — วันที่ในงวดอยู่แล้วคืน `null` กล่องยืนยันก็
 * เหลือข้อความเดิมล้วน ๆ ไม่มีอะไรให้ตัดสินใจเพิ่ม (คนกดส่วนใหญ่อยู่เคสนี้)
 *
 * ตัวเลือก "ในงวด" ใช้ **วันแรกของงวด** (`start_at`) — ไม่ใช่วันนี้หรือวันสุดท้าย
 * เพราะเอกสารย้อนหลังที่โยนเข้างวดปัจจุบันควรไปกองที่ต้นงวด ไม่ใช่ไปปนกับ
 * รายการปลายงวดที่เกิดจริงช่วงนั้น
 *
 * @param docDate - วันที่บนเอกสาร (`grn_date` / `sr_date`)
 * @param value - ตัวเลือกปัจจุบัน
 * @param onChange - ผู้เรียกเก็บ state เอง เพราะต้องเอาไปใช้ตอนยิง API
 */
export function PeriodDateChoice({
  docDate,
  value,
  onChange,
}: {
  readonly docDate?: string;
  readonly value: PeriodDateChoice;
  readonly onChange: (value: PeriodDateChoice) => void;
}) {
  const t = useTranslations("period");
  const { currentPeriod, dateFormat } = useProfile();

  if (!currentPeriod || !isOutsideOpenPeriod(docDate, currentPeriod)) {
    return null;
  }

  return (
    <div className="border-border bg-muted/40 mt-3 space-y-2 rounded-md border p-3">
      <p className="text-foreground text-xs font-medium">
        {t("outsideOpenPeriod", {
          from: formatDate(currentPeriod.start_at, dateFormat),
          to: formatDate(currentPeriod.end_at, dateFormat),
        })}
      </p>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as PeriodDateChoice)}
        className="gap-2"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="open-period" id="period-date-open" />
          <Label
            htmlFor="period-date-open"
            className="cursor-pointer text-xs font-normal"
          >
            {t("useOpenPeriodDate", {
              date: formatDate(currentPeriod.start_at, dateFormat),
            })}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="document" id="period-date-doc" />
          <Label
            htmlFor="period-date-doc"
            className="cursor-pointer text-xs font-normal"
          >
            {t("useDocumentDate", {
              date: docDate ? formatDate(docDate, dateFormat) : "—",
            })}
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}

/**
 * วันที่ที่ต้องลงจริงตามตัวเลือก — `null` = ไม่ต้องแตะวันที่เดิม
 *
 * แยกจากคอมโพเนนต์เพราะจุดที่ยิง API ต้องคำนวณเองโดยไม่ต้องผ่าน UI
 */
export function resolvePeriodDate(
  choice: PeriodDateChoice,
  docDate: string | undefined,
  period: { start_at: string; end_at: string } | undefined,
): string | null {
  if (choice !== "open-period") return null;
  if (!period || !isOutsideOpenPeriod(docDate, period)) return null;
  return period.start_at;
}
