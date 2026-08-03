import { useTranslations } from "use-intl";
import {
  HistoryTimeline,
  HistoryTimelineItem,
} from "@/components/share/history-timeline";
import { Badge } from "@/components/ui/badge";
import {
  unknownStatusEntry,
  type StatusConfigEntry,
} from "@/constant/status-config";

/** ประวัติ workflow ระดับเอกสาร 1 ก้าว — โครงเดียวกันทั้ง PR / PO / SR */
export interface WorkflowHistoryTimelineEntry {
  user: { id: string; name: string };
  action: string;
  /** ชื่อฟิลด์เวลาไม่ตรงกันระหว่างโมดูล — PR/PO ส่ง `datetime`, SR ส่ง `at` */
  at?: string;
  datetime?: string;
  current_stage?: string;
  next_stage?: string;
}

interface WorkflowHistoryTimelineProps {
  readonly history: WorkflowHistoryTimelineEntry[];
  /** map action → สี/ป้ายของโมดูลนั้น (เช่น `PR_WORKFLOW_ACTION_CONFIG`) */
  readonly statusConfig: Record<string, StatusConfigEntry>;
  /** ข้อความเมื่อยังไม่มีประวัติ (เช่น `t("noWorkflowHistory")`) */
  readonly emptyLabel: string;
  readonly requestorName?: string;
  readonly createdAt?: string;
}

/**
 * Timeline ประวัติ workflow ระดับเอกสาร — คอลัมน์เดียว รางวันที่/เวลาอยู่ซ้าย
 * เรียงล่าสุดขึ้นบนสุด พร้อม badge action และการเปลี่ยน stage
 *
 * แถวสุดท้ายคือผู้ร้องขอ + วันที่สร้างเอกสาร ซึ่งอยู่ในรางเวลาเดียวกับก้าวอื่น
 * เพราะการสร้างเอกสารก็คือเหตุการณ์แรกของ workflow จริง ๆ
 *
 * ใช้ร่วมกันทุกโมดูลที่มี workflow ระดับเอกสาร (PR/PO/SR) — สิ่งที่ต่างกันคือชุด
 * action กับข้อความ empty เท่านั้น จึงรับมาเป็น prop ไม่ผูกกับโมดูลใดโมดูลหนึ่ง
 * (คู่กับ `ItemHistorySheet` ที่เป็นประวัติระดับรายบรรทัด)
 *
 * @param props.history - ประวัติ (เรียงเก่า→ใหม่ ตามที่ backend ส่งมา)
 * @param props.statusConfig - map action → สี/ป้ายของโมดูล
 * @param props.emptyLabel - ข้อความเมื่อไม่มีประวัติ
 * @param props.requestorName - ชื่อผู้ร้องขอ/ผู้ซื้อ แสดงเป็นแถวสุดท้าย
 * @param props.createdAt - วันที่สร้างเอกสาร แสดงในรางของแถวผู้ร้องขอ
 * @returns React element ของไทม์ไลน์ หรือข้อความว่างเมื่อไม่มีประวัติ
 * @example
 * <WorkflowHistoryTimeline
 *   history={purchaseRequest.workflow_history}
 *   statusConfig={PR_WORKFLOW_ACTION_CONFIG}
 *   emptyLabel={t("noWorkflowHistory")}
 *   requestorName={purchaseRequest.requestor_name}
 *   createdAt={purchaseRequest.created_at}
 * />
 */
export function WorkflowHistoryTimeline({
  history,
  statusConfig,
  emptyLabel,
  requestorName,
  createdAt,
}: WorkflowHistoryTimelineProps) {
  const tfl = useTranslations("field");

  if (!history || history.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }

  // Reverse เพื่อให้ล่าสุดขึ้นบนสุด
  const reversedHistory = [...history].reverse();

  return (
    <HistoryTimeline>
      {reversedHistory.map((entry, i) => {
        // action ที่ไม่มีในแผนที่ต้องไม่ไปยืมป้ายของ action อื่น — เดิม fallback
        // เป็น `.submitted` ทำให้ action แปลก ๆ โชว์ว่า "SUBMITTED" ทั้งที่ไม่ใช่
        // (ผิดข้อมูล ไม่ใช่แค่หน้าตาเพี้ยน)
        const config =
          statusConfig[entry.action] ?? unknownStatusEntry(entry.action);

        return (
          <HistoryTimelineItem
            key={`${entry.user.id}-${entry.action}-${i}`}
            at={entry.at ?? entry.datetime ?? ""}
            marker={i === 0 ? "current" : "default"}
            badge={
              <Badge className={config.className} size="xs">
                {config.label}
              </Badge>
            }
            title={entry.user.name}
          >
            {(entry.current_stage || entry.next_stage) && (
              <>
                {entry.current_stage}
                {entry.current_stage && entry.next_stage && " → "}
                {entry.next_stage}
              </>
            )}
          </HistoryTimelineItem>
        );
      })}

      {requestorName && (
        <HistoryTimelineItem
          at={createdAt ?? ""}
          marker="origin"
          title={requestorName}
        >
          {tfl("requester")}
        </HistoryTimelineItem>
      )}
    </HistoryTimeline>
  );
}
