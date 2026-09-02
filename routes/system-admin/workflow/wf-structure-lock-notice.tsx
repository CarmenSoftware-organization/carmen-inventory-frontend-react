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
    <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
      <Lock className="mt-0.5 size-4 shrink-0" />
      <span>{t("structureLocked", { count })}</span>
    </div>
  );
}
