
import { useTranslations } from "use-intl";
import { UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PR_WORKFLOW_ACTION_CONFIG } from "@/constant/purchase-request";
import type { WorkflowHistoryEntry } from "@/types/purchase-request";
import { formatDate } from "@/lib/date-utils";
import { useProfile } from "@/hooks/use-profile";
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
import { cn } from "@/lib/utils";

interface PrWorkflowHistoryProps {
  readonly history: WorkflowHistoryEntry[];
  readonly requestorName?: string;
  readonly createdAt?: string;
}

/**
 * Timeline แสดงประวัติการทำงาน workflow ของใบขอซื้อในรูปแบบซิกแซกสลับซ้าย/ขวา
 * เรียงลำดับจากล่าสุดขึ้นบนสุด พร้อมแสดง badge สถานะการกระทำและการเปลี่ยน stage
 * ด้านล่างสุดแสดงข้อมูลผู้ร้องขอและวันที่สร้างเอกสาร
 * @param props - ประวัติ workflow (history), ชื่อผู้ร้องขอ (requestorName) และวันที่สร้าง (createdAt)
 * @returns React element ของ timeline ประวัติ workflow หรือข้อความว่างหากไม่มีประวัติ
 * @example
 * <PrWorkflowHistory
 *   history={purchaseRequest.workflow_history}
 *   requestorName={purchaseRequest.requestor_name}
 *   createdAt={purchaseRequest.created_at}
 * />
 */
export function PrWorkflowHistory({
  history,
  requestorName,
  createdAt,
}: PrWorkflowHistoryProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();

  if (!history || history.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{t("noWorkflowHistory")}</p>
    );
  }

  // Reverse เพื่อให้ล่าสุดขึ้นบนสุด
  const reversedHistory = [...history].reverse();

  return (
    <div className="space-y-3">
      <Timeline defaultValue={reversedHistory.length} orientation="vertical">
        {reversedHistory.map((entry, i) => {
          const config = PR_WORKFLOW_ACTION_CONFIG[entry.action] ?? PR_WORKFLOW_ACTION_CONFIG.submitted;
          const stepNumber = i + 1;
          const isEven = i % 2 === 0;

          return (
            <TimelineItem
              key={`${entry.user.id}-${entry.action}-${i}`}
              step={stepNumber}
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
                  {formatDate(entry.datetime, `${dateFormat} HH:mm`)}
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
            <p className="text-sm font-medium">{requestorName}</p>
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
