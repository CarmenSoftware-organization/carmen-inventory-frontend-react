import { useTranslations } from "use-intl";
import { SendBackBadge } from "@/components/share/sendback-badge";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
} from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { StatusIconLabel } from "@/components/ui/status-icon-label";
import type { StoreRequisition } from "@/types/store-requisition";

interface SrCardProps {
  readonly item: StoreRequisition;
  readonly onEdit: (item: StoreRequisition) => void;
  readonly onDelete: (item: StoreRequisition) => void;
}

/**
 * การ์ดใบเบิกสินค้า 1 ใบ สำหรับหน้ารายการ mobile/grid
 *
 * ใช้ `ListCard` ตัวเดียวกับการ์ด PR/IA — ไฟล์นี้เหลือแค่ว่าข้อมูลอะไรอยู่แถวไหน
 * ครบเท่าคอลัมน์ของตาราง SR
 *
 * @param props.item - ข้อมูล StoreRequisition
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onDelete - callback เมื่อกดปุ่มลบ
 * @example
 * <SrCard item={sr} onEdit={(it) => navigate(`/.../${it.id}`)} onDelete={setDeleteTarget} />
 */
export default function SrCard({ item, onEdit, onDelete }: SrCardProps) {
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const { dateFormat } = useProfile();

  return (
    <ListCard
      title={item.sr_no}
      badge={
        <div className="flex shrink-0 items-center gap-1">
          <SendBackBadge lastAction={item.last_action} />
          <StatusIconLabel
            status={item.doc_status}
            label={ts(item.doc_status)}
            className="uppercase"
          />
        </div>
      }
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      <ListCardRow label={tfl("date")}>
        <span className="tabular-nums">
          {formatDate(item.sr_date, dateFormat)}
        </span>
      </ListCardRow>
      {item.sr_type && (
        <ListCardRow label={tfl("type")}>
          <StatusIconLabel
            status={item.sr_type}
            label={item.sr_type}
            className="text-muted-foreground uppercase"
          />
        </ListCardRow>
      )}
      <ListCardRow label={tfl("fromTo")}>
        {item.from_location_name}
        {item.to_location_name && (
          <span className="text-muted-foreground font-normal">
            {" → "}
            {item.to_location_name}
          </span>
        )}
      </ListCardRow>
      <ListCardRow label={tfl("requester")}>{item.requestor_name}</ListCardRow>
      <ListCardRow label={tfl("department")}>
        {item.department_name}
      </ListCardRow>
      {item.workflow_name && (
        <ListCardRow label={tfl("workflowStage")}>
          {item.workflow_name}
        </ListCardRow>
      )}
      {item.workflow_current_stage && (
        <ListCardRow label={tfl("currentStage")}>
          {item.workflow_current_stage}
        </ListCardRow>
      )}
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
