
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SR_WORKFLOW_ACTION_CONFIG } from "@/constant/store-requisition";
import type { WorkflowHistoryEntry } from "@/types/store-requisition";

interface SrWorkflowHistoryProps {
  readonly history: WorkflowHistoryEntry[];
}

/**
 * แสดงไทม์ไลน์ประวัติ workflow ของใบเบิกสินค้า
 * แสดง badge action และข้อความ "no history" ถ้าไม่มีข้อมูล
 *
 * @param props - รายการประวัติ workflow
 * @param props.history - array ของ WorkflowHistoryEntry
 * @returns คอมโพเนนต์ไทม์ไลน์
 * @example
 * <SrWorkflowHistory history={storeRequisition.workflow_history} />
 */
export function SrWorkflowHistory({ history }: SrWorkflowHistoryProps) {
  const t = useTranslations("storeOperation.storeRequisition");
  if (!history || history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("noWorkflowHistory")}</p>
    );
  }

  return (
    <div className="space-y-0">
      {history.map((entry, i) => {
        const isLast = i === history.length - 1;
        const wfKey = `wf_${entry.action}`;
        const config = SR_WORKFLOW_ACTION_CONFIG[wfKey] ?? SR_WORKFLOW_ACTION_CONFIG.wf_submitted;

        return (
          <div key={`${entry.user.id}-${entry.action}-${i}`} className="relative flex gap-3 pb-4">
            {!isLast && (
              <div className="absolute left-1.75 top-4 h-full w-px bg-border" />
            )}
            <div
              className={cn(
                "relative z-10 mt-1 size-3.5 shrink-0 rounded-full border-2",
                i === 0
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/30 bg-background",
              )}
            />

            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{entry.user.name}</span>
                <Badge className={config.className} size="xs">
                  {config.label}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {entry.current_stage && <span>{entry.current_stage}</span>}
                {entry.current_stage && entry.next_stage && <span> → </span>}
                {entry.next_stage && <span>{entry.next_stage}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
