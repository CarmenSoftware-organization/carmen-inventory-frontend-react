import { Lock } from "lucide-react";
import { useTranslations } from "use-intl";

/**
 * บอกว่าทำไมส่วนของ stage กับเส้นทางถึงแก้ไม่ได้ ทั้งที่ส่วนอื่นของฟอร์มยังแก้ได้
 *
 * ถ้าไม่มีข้อความนี้ ผู้ใช้จะเห็นแค่ช่องที่เป็นสีเทาปะปนกับช่องที่ยังกรอกได้ในหน้าเดียวกัน แล้วเดาเอาเองว่า
 * ระบบพัง — ไม่ใช่ว่ามีเอกสารกำลังเดินอยู่บนโครงนี้
 * @param props - ตัวเลือกของแบนเนอร์
 * @param props.count - จำนวนเอกสารที่ยังดำเนินการอยู่ ซึ่งเป็นเหตุผลของการล็อก
 * @returns แบนเนอร์อธิบายเหตุผล
 */
export function WfStructureLockNotice({ count }: { readonly count: number }) {
  const t = useTranslations("systemAdmin.workflow.documents");

  return (
    <div className="border-warning/30 bg-warning/5 text-warning-ink mb-4 flex items-start gap-2.5 rounded-lg border p-3 text-sm">
      <Lock className="mt-0.5 size-4 shrink-0" />
      <span>{t("structureLocked", { count })}</span>
    </div>
  );
}
