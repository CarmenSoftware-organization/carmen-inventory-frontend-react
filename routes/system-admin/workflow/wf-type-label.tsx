import { useTranslations } from "use-intl";
import { WF_TYPE_ICON, getWorkflowTypeLabels } from "@/constant/workflow";
import { cn } from "@/lib/utils";

/**
 * ชนิดของ workflow แบบ **ไอคอน + ป้าย ไม่มีกรอบชิป**
 *
 * ไอคอนไม่มีสี — ชนิดของใบเป็นคุณสมบัติ ไม่ใช่ความคืบหน้า ให้สีแล้วแย่งสายตาไปจาก
 * คอลัมน์สถานะซึ่งเป็นสิ่งที่คนกวาดตาหาจริง (กติกาเดียวกับ `TYPE_ICON` ใน
 * `status-icon-label.tsx`) ใช้ทั้งในตารางและการ์ด ค่าดิบจาก API จะได้ไม่โผล่ที่ไหน
 *
 * @param props.type - ค่า `workflow_type` ดิบ (`purchase_request` / …)
 */
export function WfTypeLabel({
  type,
  className,
}: {
  readonly type: string;
  readonly className?: string;
}) {
  const t = useTranslations("systemAdmin.workflow");
  const Icon = WF_TYPE_ICON[type];
  const label = getWorkflowTypeLabels(t)[type] ?? type;

  return (
    // data-slot กัน clamp ของ DataGrid เปลี่ยน span เป็น -webkit-box
    // ซึ่งจะดันไอคอนกับป้ายไปคนละบรรทัด (ดู data-grid-table.tsx)
    <span
      data-slot="type"
      className={cn(
        "text-foreground text-micro inline-flex items-center gap-1.5 tracking-wide whitespace-nowrap",
        className,
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
      {label || "—"}
    </span>
  );
}
