import { useTranslations } from "use-intl";
import {
  History,
  Lock,
  MessageSquare,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PrintDocumentButton } from "@/components/print-document-button";
import { WorkflowStep } from "@/components/share/workflow-step";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { PO_STATUS, type PurchaseOrder } from "@/types/purchase-order";
import { PO_STATUS_CONFIG, PO_TYPE_CONFIG } from "@/constant/purchase-order";
import type { FormMode } from "@/types/form";
import {
  DocFormHeader,
  DocumentRibbon,
  RibbonCell,
} from "@/components/share/doc-form-header";

interface PoHeaderProps {
  readonly purchaseOrder?: PurchaseOrder;
  readonly mode: FormMode;
  readonly canEdit: boolean;
  readonly canClose: boolean;
  readonly terminalStatus: boolean;
  readonly isPending: boolean;
  readonly deletePoIsPending: boolean;
  readonly departmentName: string;
  readonly buyerName: string;
  readonly orderDate?: string;
  readonly onBack: () => void;
  readonly onCancel: () => void;
  readonly onEnterEdit: () => void;
  readonly onShowClose: () => void;
  readonly onShowComment: () => void;
  readonly onShowDelete: () => void;
  /** มี workflow history ให้ดูไหม — คุมว่า WorkflowStep กดได้หรือไม่ */
  readonly hasHistory?: boolean;
  /** เปิด workflow history sheet (แตะที่ WorkflowStep) */
  readonly onShowHistory?: () => void;
}

export function PoHeader({
  purchaseOrder,
  mode,
  canEdit,
  canClose,
  terminalStatus,
  isPending,
  deletePoIsPending,
  departmentName,
  buyerName,
  orderDate,
  onBack,
  onCancel,
  onEnterEdit,
  onShowClose,
  onShowComment,
  onShowDelete,
  hasHistory,
  onShowHistory,
}: PoHeaderProps) {
  const t = useTranslations("procurement.purchaseOrder");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();

  const isView = mode === "view";
  const isEditMode = mode === "edit";
  const isAdd = !purchaseOrder;
  const isDraft =
    !purchaseOrder?.po_status ||
    purchaseOrder.po_status === PO_STATUS.DRAFT;

  const headerTitle = purchaseOrder?.po_no ?? t("entity");
  const poStatusConfig = purchaseOrder
    ? PO_STATUS_CONFIG[purchaseOrder.po_status]
    : null;
  const poTypeConfig = purchaseOrder
    ? PO_TYPE_CONFIG[purchaseOrder.po_type]
    : null;

  const badges = (
    <>
      {poStatusConfig && (
        <Badge className={poStatusConfig.className} size="sm">
          {poStatusConfig.label}
        </Badge>
      )}
      {poTypeConfig && (
        <Badge className={poTypeConfig.className} size="sm">
          {poTypeConfig.label}
        </Badge>
      )}
    </>
  );

  const actions = (
    <>
      {purchaseOrder && (
        <>
          {canClose && purchaseOrder.po_status === PO_STATUS.SENT && (
            <Button
              size="sm"
              variant="warning"
              disabled={isPending}
              onClick={onShowClose}
            >
              <Lock aria-hidden="true" />
              {tc("close")}
            </Button>
          )}
          {isView && (
            <PrintDocumentButton
              documentType="PO"
              documentId={purchaseOrder.id}
              filters={
                purchaseOrder.po_no
                  ? { DocumentNo: purchaseOrder.po_no }
                  : undefined
              }
            />
          )}
          {isView && canEdit && (
            <Button size="sm" onClick={onEnterEdit} disabled={isPending}>
              <Pencil aria-hidden="true" />
              {tc("edit")}
            </Button>
          )}
          {isEditMode && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onCancel}
                disabled={isPending}
              >
                <X aria-hidden="true" />
                {tc("cancel")}
              </Button>
              <Button
                size="sm"
                type="submit"
                form="po-form"
                disabled={isPending}
              >
                <Save aria-hidden="true" />
                {tc("save")}
              </Button>
              {canEdit && !terminalStatus && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deletePoIsPending || isPending}
                  onClick={onShowDelete}
                >
                  <Trash2 aria-hidden="true" />
                  {tc("delete")}
                </Button>
              )}
            </>
          )}
          <Button size="sm" variant="info" onClick={onShowComment}>
            <MessageSquare aria-hidden="true" />
            {tc("comment")}
          </Button>
        </>
      )}
      {isAdd && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            <X aria-hidden="true" />
            {tc("cancel")}
          </Button>
          <Button size="sm" type="submit" form="po-form" disabled={isPending}>
            <Save aria-hidden="true" />
            {tc("save")}
          </Button>
        </>
      )}
    </>
  );

  // แสดง ribbon ทุกโหมด รวม add (buyer = current user, orderDate = วันนี้)
  const ribbon = (
    <DocumentRibbon>
      {!isDraft && purchaseOrder?.workflow_name && (
        <RibbonCell label={tfl("workflow")}>
          {purchaseOrder.workflow_name}
        </RibbonCell>
      )}
      <RibbonCell label={tfl("buyer")}>{buyerName || "—"}</RibbonCell>
      <RibbonCell label={tfl("department")}>{departmentName || "—"}</RibbonCell>
      <RibbonCell label={tfl("orderDate")}>
        {orderDate ? formatDate(orderDate, dateFormat) : "—"}
      </RibbonCell>
    </DocumentRibbon>
  );

  const workflowStepEl = purchaseOrder?.workflow_current_stage ? (
    <WorkflowStep
      previousStage={purchaseOrder.workflow_previous_stage}
      currentStage={purchaseOrder.workflow_current_stage}
      nextStage={
        purchaseOrder.po_status === "completed"
          ? undefined
          : purchaseOrder.workflow_next_stage
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
    purchaseOrder?.doc_version != null
      ? `${tfl("version")} ${purchaseOrder.doc_version}`
      : undefined;

  return (
    <DocFormHeader
      title={headerTitle}
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
