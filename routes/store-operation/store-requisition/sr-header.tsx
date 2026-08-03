import { useState } from "react";
import { useTranslations } from "use-intl";
import { Pencil, Save, Trash2, X } from "lucide-react";
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
import { WorkflowTrack } from "@/components/share/workflow-track";
import { WorkflowHistoryTimeline } from "@/components/share/workflow-history-timeline";
import { SR_WORKFLOW_ACTION_CONFIG } from "@/constant/store-requisition";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DocFormHeader } from "@/components/share/doc-form-header";
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
      {/* เลขที่ใบ · สถานะ · รุ่น = ตัวตนของเอกสาร อยู่บรรทัดเดียวกันหมด
          เพื่อคืนบรรทัด subtitle ให้แถบขั้นตอน */}
      {storeRequisition?.doc_version != null && (
        <span className="text-muted-foreground text-xs">
          {tfl("version")} {storeRequisition.doc_version}
        </span>
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
      {/* ไม่ override ความกว้าง — ใช้ค่า default ของ SheetContent
          (w-3/4 sm:max-w-sm) ให้เท่ากับ comment sheet */}
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("tabWorkflowHistory")}</SheetTitle>
          <SheetDescription className="sr-only">
            {t("tabWorkflowHistory")}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <WorkflowHistoryTimeline
            history={workflowHistory}
            statusConfig={SR_WORKFLOW_ACTION_CONFIG}
            emptyLabel={t("noWorkflowHistory")}
            requestorName={requesterName}
            createdAt={storeRequisition?.created_at}
          />
        </div>
      </SheetContent>
    </Sheet>
  ) : null;

  // ไม่มีแผนก = กรอกใบต่อไม่ได้ ต้องเตือน แต่ไม่ต้องเปลี่ยนเป็นข้อความสีแดง
  // คนละชนิดกับช่องอื่น — ใช้ Input เหมือนกันหมดแล้วให้ aria-invalid วาดกรอบแดง
  // (กติกาเดียวกับช่องที่ยังกรอกไม่ครบทั้งแอป)
  const departmentMissing = !isLoading && !departmentName;
  const departmentValue = isLoading
    ? "—"
    : departmentName
      ? `${departmentName}${departmentCode ? ` (${departmentCode})` : ""}`
      : t("noDepartment");

  // ribbon เป็น grid คอลัมน์ fixed 10rem → cells ชิดซ้าย compact (เหมือน PO/PR).
  // ml-4 หักล้าง -ml-4 ของ DocFormHeader · workflow ไม่อยู่ที่นี่ — อยู่ในบล็อก
  // ฟอร์มด้านล่างที่เดียวทุกโหมด
  const ribbon = (
    <div className="ml-4 grid w-full grid-cols-1 gap-x-2 gap-y-4 sm:grid-cols-2 lg:grid-cols-6">
      <Field>
        <FieldLabel>{tfl("srDate")}</FieldLabel>
        <Input value={srDate ? formatDate(srDate, dateFormat) : "—"} disabled />
      </Field>
      <Field>
        <FieldLabel>{tfl("requester")}</FieldLabel>
        <Input value={isLoading ? "—" : requesterName || "—"} disabled />
      </Field>
      <Field>
        <FieldLabel>{tfl("department")}</FieldLabel>
        <Input
          value={departmentValue}
          disabled
          aria-invalid={departmentMissing || undefined}
        />
      </Field>
    </div>
  );

  // workflow stepper ใน header (เหมือน PR) — แสดงเส้นทาง prev → current → next
  const workflowStepEl =
    !isDraft && storeRequisition?.workflow_current_stage ? (
      <WorkflowTrack
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

  // กดที่แถบขั้นตอน = เปิดประวัติ · ไม่มีข้อความบอกว่า "กดเพื่อดู" แล้ว —
  // ถ้าต้องติดป้ายบอกว่ากดได้ แปลว่า affordance ยังไม่พอ ให้ hover/cursor กับ
  // tooltip ทำหน้าที่แทน · -ml-1 หักล้าง px-1 ของตัวเอง ให้แถบชิดซ้ายเสมอ title
  const workflowStep =
    workflowStepEl && hasHistory ? (
      <button
        type="button"
        onClick={() => setShowHistory(true)}
        title={t("tabWorkflowHistory")}
        aria-label={t("tabWorkflowHistory")}
        className="hover:bg-muted/60 focus-visible:ring-ring -ml-1 w-fit cursor-pointer rounded-lg px-1 py-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {workflowStepEl}
      </button>
    ) : (
      workflowStepEl
    );

  return (
    <>
      <DocFormHeader
        title={storeRequisition?.sr_no ?? t("title")}
        subtitle={workflowStep}
        backLabel={tc("goBack")}
        onBack={onBack}
        badges={badges}
        actions={actions}
        ribbon={ribbon}
      />
      {workflowHistorySheet}
    </>
  );
}
