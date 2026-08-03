import { useTranslations } from "use-intl";
import { UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/ui/timeline";
import {
  unknownStatusEntry,
  type StatusConfigEntry,
} from "@/constant/status-config";
import { formatDate } from "@/lib/date-utils";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

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
 * Timeline ประวัติ workflow ระดับเอกสาร — ซิกแซกสลับซ้าย/ขวา เรียงล่าสุดขึ้นบนสุด
 * พร้อม badge action และการเปลี่ยน stage · ท้ายสุดเป็นผู้ร้องขอ + วันที่สร้าง
 *
 * ใช้ร่วมกันทุกโมดูลที่มี workflow ระดับเอกสาร (PR/PO/SR) — สิ่งที่ต่างกันคือชุด
 * action กับข้อความ empty เท่านั้น จึงรับมาเป็น prop ไม่ผูกกับโมดูลใดโมดูลหนึ่ง
 * (คู่กับ `ItemHistorySheet` ที่เป็นประวัติระดับรายบรรทัด)
 *
 * @param props.history - ประวัติ (เรียงเก่า→ใหม่ ตามที่ backend ส่งมา)
 * @param props.statusConfig - map action → สี/ป้ายของโมดูล
 * @param props.emptyLabel - ข้อความเมื่อไม่มีประวัติ
 * @param props.requestorName - ชื่อผู้ร้องขอ/ผู้ซื้อ แสดงใต้ไทม์ไลน์
 * @param props.createdAt - วันที่สร้างเอกสาร แสดงใต้ชื่อผู้ร้องขอ
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
  const { dateFormat } = useProfile();

  if (!history || history.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }

  // Reverse เพื่อให้ล่าสุดขึ้นบนสุด
  const reversedHistory = [...history].reverse();

  return (
    <div className="space-y-3">
      <Timeline defaultValue={reversedHistory.length} orientation="vertical">
        {reversedHistory.map((entry, i) => {
          // action ที่ไม่มีในแผนที่ต้องไม่ไปยืมป้ายของ action อื่น — เดิม fallback
          // เป็น `.submitted` ทำให้ action แปลก ๆ โชว์ว่า "SUBMITTED" ทั้งที่ไม่ใช่
          // (ผิดข้อมูล ไม่ใช่แค่หน้าตาเพี้ยน)
          const config =
            statusConfig[entry.action] ?? unknownStatusEntry(entry.action);
          const isEven = i % 2 === 0;

          return (
            <TimelineItem
              key={`${entry.user.id}-${entry.action}-${i}`}
              step={i + 1}
              className={cn(
                "w-[calc(50%-1.5rem)]",
                // Even (index 0, 2, 4...) = ขวา
                "even:ms-auto",
                // Odd (index 1, 3, 5...) = ซ้าย
                "odd:me-auto odd:text-right",
                // Odd: ย้าย indicator และ separator ไปขวา
                "odd:group-data-[orientation=vertical]/timeline:ms-0 odd:group-data-[orientation=vertical]/timeline:me-8",
                "odd:group-data-[orientation=vertical]/timeline:**:data-[slot=timeline-indicator]:-right-6",
                "odd:group-data-[orientation=vertical]/timeline:**:data-[slot=timeline-indicator]:left-auto",
                "odd:group-data-[orientation=vertical]/timeline:**:data-[slot=timeline-indicator]:translate-x-1/2",
                "odd:group-data-[orientation=vertical]/timeline:**:data-[slot=timeline-separator]:-right-6",
                "odd:group-data-[orientation=vertical]/timeline:**:data-[slot=timeline-separator]:left-auto",
                "odd:group-data-[orientation=vertical]/timeline:**:data-[slot=timeline-separator]:translate-x-1/2",
              )}
            >
              <TimelineHeader className="space-y-1">
                <TimelineSeparator />
                <TimelineIndicator />
                <TimelineDate>
                  {formatDate(
                    entry.at ?? entry.datetime ?? "",
                    `${dateFormat} HH:mm`,
                  )}
                </TimelineDate>
                <div
                  className={cn(
                    "flex items-center gap-2",
                    isEven && "flex-row-reverse",
                  )}
                >
                  <TimelineTitle>{entry.user.name}</TimelineTitle>
                  <Badge className={config.className} size="xs">
                    {config.label}
                  </Badge>
                </div>
              </TimelineHeader>
              {(entry.current_stage || entry.next_stage) && (
                <TimelineContent>
                  {entry.current_stage && <span>{entry.current_stage}</span>}
                  {entry.current_stage && entry.next_stage && <span> → </span>}
                  {entry.next_stage && <span>{entry.next_stage}</span>}
                </TimelineContent>
              )}
            </TimelineItem>
          );
        })}
      </Timeline>
      {requestorName && (
        <div className="flex flex-col items-center gap-1.5">
          <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full">
            <UserRound className="size-4" aria-hidden="true" />
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-xs">{tfl("requester")}</p>
            <p className="text-sm font-semibold">{requestorName}</p>
            {createdAt && (
              <p className="text-muted-foreground text-xs">
                {formatDate(createdAt, `${dateFormat} HH:mm`)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
