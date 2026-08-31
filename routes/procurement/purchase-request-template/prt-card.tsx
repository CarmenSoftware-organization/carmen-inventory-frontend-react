import { useTranslations } from "use-intl";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
  ListCardActiveRow,
} from "@/components/share/list-card";
import type { PurchaseRequestTemplate } from "@/types/purchase-request";

interface PrtCardProps {
  readonly item: PurchaseRequestTemplate;
  readonly onEdit: (item: PurchaseRequestTemplate) => void;
  readonly onDelete: (item: PurchaseRequestTemplate) => void;
}

/**
 * การ์ดเทมเพลต PR 1 ใบ สำหรับหน้ารายการโหมด grid/mobile
 *
 * ใช้ `ListCard` ตัวเดียวกับการ์ด PR/SR/IA — ไฟล์นี้เหลือแค่ว่าข้อมูลอะไรอยู่แถวไหน
 *
 * @param props.item - ข้อมูลเทมเพลต
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onDelete - callback เมื่อกดปุ่มลบ
 */
export default function PrtCard({ item, onEdit, onDelete }: PrtCardProps) {
  const tfl = useTranslations("field");

  return (
    <ListCard
      title={item.name || "..."}
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      <ListCardActiveRow active={item.is_active} />
      {item.workflow_name && (
        <ListCardRow label={tfl("workflow")}>{item.workflow_name}</ListCardRow>
      )}
      {item.department_name && (
        <ListCardRow label={tfl("department")}>
          {item.department_name}
        </ListCardRow>
      )}
      {item.description && (
        <ListCardRow label={tfl("description")}>{item.description}</ListCardRow>
      )}
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
