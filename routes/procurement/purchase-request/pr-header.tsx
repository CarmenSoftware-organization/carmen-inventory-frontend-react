import { type ReactNode } from "react";
import { History } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { WorkflowStep } from "@/components/share/workflow-step";
import { PR_STATUS, type PurchaseRequest } from "@/types/purchase-request";
import { PR_STATUS_CONFIG } from "@/constant/purchase-request";
import {
  DocFormHeader,
  DocumentRibbon,
  RibbonCell,
} from "@/components/share/doc-form-header";

interface PrHeaderProps {
  readonly purchaseRequest?: PurchaseRequest;
  readonly onBack: () => void;
  readonly reqName: string;
  readonly departmentName: string;
  readonly prDateDisplay: string;
  /** ปุ่ม action (PrFormActions) — caller ประกอบเอง */
  readonly actions: ReactNode;
  /** มี workflow history ให้ดูไหม — คุมว่า WorkflowStep กดได้หรือไม่ */
  readonly hasHistory?: boolean;
  /** เปิด workflow history sheet (แตะที่ WorkflowStep) */
  readonly onShowHistory?: () => void;
}

export function PrHeader({
  purchaseRequest,
  onBack,
  reqName,
  departmentName,
  prDateDisplay,
  actions,
  hasHistory,
  onShowHistory,
}: PrHeaderProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  const statusCfg = purchaseRequest
    ? PR_STATUS_CONFIG[purchaseRequest.pr_status]
    : null;

  const badges = (
    <>
      {statusCfg && (
        <Badge className={statusCfg.className} size="sm">
          {statusCfg.label ?? purchaseRequest?.pr_status}
        </Badge>
      )}
    </>
  );

  // draft/add ยังไม่เข้า workflow — ซ่อน workflow cell/step
  const isDraft =
    !purchaseRequest?.pr_status ||
    purchaseRequest.pr_status === PR_STATUS.DRAFT;

  // แสดง ribbon ทุกโหมด รวม add (requester/department/date seed จาก profile/วันนี้)
  const ribbon = (
    <DocumentRibbon>
      {!isDraft && purchaseRequest?.workflow_name && (
        <RibbonCell label={tfl("workflow")}>
          {purchaseRequest.workflow_name}
        </RibbonCell>
      )}
      <RibbonCell label={tfl("requester")}>{reqName || "—"}</RibbonCell>
      <RibbonCell label={tfl("department")}>{departmentName || "—"}</RibbonCell>
      <RibbonCell label={tfl("date")}>{prDateDisplay || "—"}</RibbonCell>
    </DocumentRibbon>
  );

  const workflowStepEl =
    !isDraft && purchaseRequest?.workflow_current_stage ? (
      <WorkflowStep
        previousStage={purchaseRequest.workflow_previous_stage}
        currentStage={purchaseRequest.workflow_current_stage}
        nextStage={
          purchaseRequest.pr_status === PR_STATUS.COMPLETED
            ? undefined
            : purchaseRequest.workflow_next_stage
        }
        terminalState={
          purchaseRequest.pr_status === PR_STATUS.VOIDED ? "voided" : undefined
        }
      />
    ) : undefined;

  // แตะที่ workflow step → เปิด history sheet (progressive disclosure)
  const workflowStep =
    workflowStepEl && hasHistory && onShowHistory ? (
      <button
        type="button"
        onClick={onShowHistory}
        title={t("tabWorkflowHistory")}
        aria-label={t("tabWorkflowHistory")}
        className="group hover:bg-muted/60 focus-visible:ring-ring flex flex-col items-end rounded-lg px-1 pb-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {workflowStepEl}
        <span className="text-muted-foreground/50 group-hover:text-muted-foreground flex items-center gap-0.5 self-end text-[0.5625rem] tracking-wide transition-colors">
          <History className="size-2.5" />
          {t("viewHistoryHint")}
        </span>
      </button>
    ) : (
      workflowStepEl
    );

  const subtitle =
    purchaseRequest?.doc_version != null
      ? `${tfl("version")} ${purchaseRequest.doc_version}`
      : undefined;

  return (
    <DocFormHeader
      title={purchaseRequest?.pr_no ?? t("title")}
      subtitle={subtitle}
      backLabel={tc("goBack")}
      onBack={onBack}
      badges={badges}
      actions={actions}
      ribbon={ribbon}
      workflowStep={workflowStep}
    />
  );
}
