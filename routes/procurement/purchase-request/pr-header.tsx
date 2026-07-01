import { type ReactNode } from "react";
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
}

export function PrHeader({
  purchaseRequest,
  onBack,
  reqName,
  departmentName,
  prDateDisplay,
  actions,
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
      {purchaseRequest?.workflow_name && (
        <Badge variant="info-light" size="sm">
          {purchaseRequest.workflow_name}
        </Badge>
      )}
    </>
  );

  // แสดง ribbon ทุกโหมด รวม add (requester/department/date seed จาก profile/วันนี้)
  const ribbon = (
    <DocumentRibbon>
      <RibbonCell label={tfl("requester")}>{reqName || "—"}</RibbonCell>
      <RibbonCell label={tfl("department")}>{departmentName || "—"}</RibbonCell>
      <RibbonCell label={tfl("date")}>{prDateDisplay || "—"}</RibbonCell>
    </DocumentRibbon>
  );

  const workflowStep = purchaseRequest?.workflow_current_stage ? (
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
