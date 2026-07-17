import { useState } from "react";
import { useTranslations } from "use-intl";
import { History, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CommentButton } from "@/components/comment-button";
import { useStoreRequisitionComments } from "@/hooks/use-store-requisition";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PrintDocumentButton } from "@/components/print-document-button";
import { WorkflowStep } from "@/components/share/workflow-step";
import { SrWorkflowHistory } from "./sr-workflow-history";
import {
  DocFormHeader,
  RibbonField,
} from "@/components/share/doc-form-header";
import { formatDate } from "@/lib/date-utils";
import {
  SR_STATUS_CONFIG,
  SR_TYPE_VARIANT,
} from "@/constant/store-requisition";
import { getModeLabels, type FormMode } from "@/types/form";
import { STAGE_ROLE } from "@/types/stage-role";
import type {
  StoreRequisition,
  StoreRequisitionType,
} from "@/types/store-requisition";

interface SrHeaderProps {
  readonly storeRequisition?: StoreRequisition;
  readonly srType?: StoreRequisitionType;
  readonly mode: FormMode;
  readonly isPending: boolean;
  readonly hasDepartment: boolean;
  readonly isDeletePending: boolean;
  /** ribbon — document info (date/requester/department) */
  readonly srDate?: string;
  readonly dateFormat: string;
  readonly requesterName: string;
  readonly departmentName: string;
  readonly departmentCode: string;
  readonly isLoading?: boolean;
  readonly onBack: () => void;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
  readonly onDelete: () => void;
  readonly onComment?: () => void;
}

/**
 * Header ของฟอร์ม Store Requisition — ใช้ `DocFormHeader` กลางร่วมกับ
 * PO/PR/GRN/CN พร้อม ribbon แสดง document info (sr_date / requester /
 * department)
 */
export function SrHeader({
  storeRequisition,
  srType,
  mode,
  isPending,
  hasDepartment,
  isDeletePending,
  srDate,
  dateFormat,
  requesterName,
  departmentName,
  departmentCode,
  isLoading,
  onBack,
  onEdit,
  onCancel,
  onDelete,
  onComment,
}: SrHeaderProps) {
  const t = useTranslations("storeOperation.storeRequisition");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const tfl = useTranslations("field");
  const { data: comments } = useStoreRequisitionComments(storeRequisition?.id);

  const isView = mode === "view";
  const isAdd = mode === "add";
  const isEdit = mode === "edit";
  const docStatus = storeRequisition?.doc_status;
  // draft/add ยังไม่เข้า workflow — ซ่อน workflow step (เหมือน PR)
  const isDraft = !docStatus || docStatus === "draft";

  const workflowHistory = storeRequisition?.workflow_history;
  const hasHistory = !!workflowHistory && workflowHistory.length > 0;
  const [showHistory, setShowHistory] = useState(false);

  const role = storeRequisition?.role ?? STAGE_ROLE.CREATE;
  const canEdit =
    role === STAGE_ROLE.CREATE ||
    role === STAGE_ROLE.APPROVE ||
    role === STAGE_ROLE.ISSUE;

  const badges = (
    <>
      {docStatus && (
        <Badge className={SR_STATUS_CONFIG[docStatus]?.className}>
          {ts(docStatus).toUpperCase()}
        </Badge>
      )}
      {srType && (
        <Badge
          variant={SR_TYPE_VARIANT[srType]}
          size="sm"
          className="uppercase"
        >
          {srType}
        </Badge>
      )}
      {isAdd && (
        <Badge variant="secondary" size="sm">
          {t("breadcrumbNew")}
        </Badge>
      )}
    </>
  );

  const actions = (
    <>
      {isView ? (
        canEdit && (
          <Button type="button" size="sm" variant="outline" onClick={onEdit}>
            <Pencil aria-hidden="true" />
            {tc("edit")}
          </Button>
        )
      ) : (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            <X aria-hidden="true" />
            {tc("cancel")}
          </Button>
          <Button
            type="submit"
            form="store-requisition-form"
            size="sm"
            disabled={isPending || !hasDepartment}
            title={hasDepartment ? undefined : t("noDepartment")}
          >
            <Save aria-hidden="true" />
            {isPending ? getModeLabels(mode, t("entity")).pending : tc("save")}
          </Button>
          {isEdit && storeRequisition && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={isPending || isDeletePending}
            >
              <Trash2 aria-hidden="true" />
              {tc("delete")}
            </Button>
          )}
        </>
      )}
      {storeRequisition && onComment && (
        <CommentButton count={comments?.length} onClick={onComment} />
      )}
      {isView && storeRequisition?.id && (
        <PrintDocumentButton
          documentType="SR"
          documentId={storeRequisition.id}
          filters={
            storeRequisition.sr_no
              ? { DocumentNo: storeRequisition.sr_no }
              : undefined
          }
        />
      )}
    </>
  );

  const workflowHistorySheet = hasHistory ? (
    <Sheet open={showHistory} onOpenChange={setShowHistory}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl lg:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>{t("tabWorkflowHistory")}</SheetTitle>
          <SheetDescription className="sr-only">
            {t("tabWorkflowHistory")}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <SrWorkflowHistory
            history={workflowHistory}
            requestorName={requesterName}
            createdAt={storeRequisition?.created_at}
          />
        </div>
      </SheetContent>
    </Sheet>
  ) : null;

  const departmentValue = (() => {
    if (isLoading) return "—";
    if (!departmentName) {
      return (
        <span className="text-destructive font-semibold" role="alert">
          {t("noDepartment")}
        </span>
      );
    }
    return (
      <span>
        {departmentName}
        {departmentCode && (
          <span className="text-muted-foreground ml-2 text-xs font-normal">
            {departmentCode}
          </span>
        )}
      </span>
    );
  })();

  // ribbon เป็น grid คอลัมน์ fixed 10rem → cells ชิดซ้าย compact (เหมือน PO/PR).
  // ml-4 หักล้าง -ml-4 ของ DocFormHeader. draft = 3 cells; ไม่ draft = 4 (มี workflow)
  const ribbon = (
    <div className="ml-4 grid w-full grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,10rem))]">
      {!isDraft && storeRequisition?.workflow_name && (
        <RibbonField
          label={tfl("workflow")}
          value={storeRequisition.workflow_name}
        />
      )}
      <RibbonField
        label={tfl("srDate")}
        value={srDate ? formatDate(srDate, dateFormat) : "—"}
      />
      <RibbonField
        label={tfl("requester")}
        value={isLoading ? "—" : requesterName || "—"}
      />
      <RibbonField label={tfl("department")} value={departmentValue} />
    </div>
  );

  const subtitle =
    storeRequisition?.doc_version != null
      ? `${tfl("version")} ${storeRequisition.doc_version}`
      : undefined;

  // workflow stepper ใน header (เหมือน PR) — แสดงเส้นทาง prev → current → next
  const workflowStepEl =
    !isDraft && storeRequisition?.workflow_current_stage ? (
      <WorkflowStep
        previousStage={storeRequisition.workflow_previous_stage}
        currentStage={storeRequisition.workflow_current_stage}
        nextStage={
          docStatus === "completed" ||
          docStatus === "cancelled" ||
          docStatus === "voided"
            ? undefined
            : storeRequisition.workflow_next_stage
        }
        terminalState={docStatus === "voided" ? "voided" : undefined}
      />
    ) : undefined;

  // แตะที่ workflow step → เปิด history sheet (progressive disclosure, เหมือน PR)
  const workflowStep =
    workflowStepEl && hasHistory ? (
      <button
        type="button"
        onClick={() => setShowHistory(true)}
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

  return (
    <>
      <DocFormHeader
        title={storeRequisition?.sr_no ?? t("title")}
        subtitle={subtitle}
        backLabel={tc("goBack")}
        onBack={onBack}
        badges={badges}
        actions={actions}
        ribbon={ribbon}
        workflowStep={workflowStep}
        workflowStepBelow
      />
      {workflowHistorySheet}
    </>
  );
}
