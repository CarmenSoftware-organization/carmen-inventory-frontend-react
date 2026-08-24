import { useTranslations } from "use-intl";
import { Building2, Lock, Pencil, Save, Trash2, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocActionsMenu } from "@/components/share/doc-actions-menu";
import { WorkflowTrack } from "@/components/share/workflow-track";
import { usePurchaseOrderComments } from "@/hooks/use-purchase-order";
import { PO_STATUS, type PurchaseOrder } from "@/types/purchase-order";
import { StatusIconLabel } from "@/components/ui/status-icon-label";
import { PO_STATUS_CONFIG, PO_TYPE_CONFIG } from "@/constant/purchase-order";
import type { FormMode } from "@/types/form";
import { DocFormHeader } from "@/components/share/doc-form-header";

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
  readonly onBack: () => void;
  readonly onCancel: () => void;
  readonly onEnterEdit: () => void;
  readonly onShowClose: () => void;
  readonly onShowComment: () => void;
  readonly onShowDelete: () => void;
  /** มี workflow history ให้ดูไหม — คุมว่าแถบขั้นตอนกดได้หรือไม่ */
  readonly hasHistory?: boolean;
  /** เปิด workflow history sheet (กดที่แถบขั้นตอน) */
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
  const { data: comments } = usePurchaseOrderComments(purchaseOrder?.id);

  const isView = mode === "view";
  const isEditMode = mode === "edit";
  const isAdd = !purchaseOrder;
  const headerTitle = purchaseOrder?.po_no ?? t("entity");
  const poStatusConfig = purchaseOrder
    ? PO_STATUS_CONFIG[purchaseOrder.po_status]
    : null;
  const poTypeConfig = purchaseOrder
    ? PO_TYPE_CONFIG[purchaseOrder.po_type]
    : null;

  // แยกเป็นคนละกลุ่มกับเลขที่ใบด้วยเส้นคั่น + ระยะห่าง — เลขที่ใบคือตัวตนของ
  // เอกสาร ส่วนสถานะ/ประเภท/รุ่นคือ "ตอนนี้มันอยู่ตรงไหน" คนละคำถามกัน
  const badges = (
    <div className="border-border/60 ms-1 flex items-center gap-2 border-s ps-3">
      {poStatusConfig && purchaseOrder && (
        <StatusIconLabel
          status={purchaseOrder.po_status}
          label={poStatusConfig.label}
          // เบากว่าในตาราง: ตัวเอกของแถบนี้คือเลขที่ใบ สถานะเป็นข้อมูลประกอบ
          // เหลือสีไว้ที่ไอคอนจุดเดียวซึ่งเป็นสัญญาณที่ต้องเห็นจริง ๆ
          className="text-muted-foreground text-micro [&>svg]:size-3"
        />
      )}
      {poTypeConfig && purchaseOrder && (
        <StatusIconLabel
          status={purchaseOrder.po_type}
          label={poTypeConfig.label}
          className="text-muted-foreground text-micro [&>svg]:size-3"
        />
      )}
      {/* รุ่นเอกสารย้ายมาอยู่แถวเดียวกับเลขที่ใบ เพื่อคืนบรรทัด subtitle
          ให้แถบขั้นตอน — เลขที่ใบ · สถานะ · รุ่น คือตัวตนของเอกสารชุดเดียวกัน */}
      {purchaseOrder?.doc_version != null && (
        <span className="text-muted-foreground text-micro">
          {tfl("version")} {purchaseOrder.doc_version}
        </span>
      )}
    </div>
  );

  const actions = (
    <>
      {purchaseOrder && (
        <>
          {canClose && purchaseOrder.po_status === PO_STATUS.SENT && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={onShowClose}
            >
              <Lock aria-hidden="true" />
              {tc("close")}
            </Button>
          )}
          {isView && canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEnterEdit}
              disabled={isPending}
            >
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
            </>
          )}
          {canEdit && !terminalStatus && (
            <Button
              size="sm"
              variant="outline"
              disabled={deletePoIsPending || isPending}
              onClick={onShowDelete}
            >
              <Trash2 aria-hidden="true" />
              {tc("delete")}
            </Button>
          )}
          <DocActionsMenu
            onComment={onShowComment}
            commentCount={comments?.length}
            activity={{ id: purchaseOrder.id, label: purchaseOrder.po_no }}
            print={
              isView
                ? {
                    documentType: "PO",
                    documentId: purchaseOrder.id,
                    filters: purchaseOrder.po_no
                      ? { DocumentNo: purchaseOrder.po_no }
                      : undefined,
                  }
                : undefined
            }
          />
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

  /**
   * ผู้ซื้อ + แผนก อยู่ใต้เลขที่ใบเป็นข้อความ ไม่ใช่ช่องกรอกที่จางทั้งแถว (ทรง
   * เดียวกับใบลดหนี้และใบรับสินค้า) — สองค่านี้อ่านอย่างเดียว ไม่เข้า payload
   * การทำเป็นช่อง disabled กินพื้นที่เท่าช่องที่กรอกได้จริงและชวนให้เข้าใจผิด
   *
   * วันที่ย้ายไปเป็นช่องกรอกในฟอร์มแล้ว (ก่อนวันที่ส่งของ) จึงไม่โชว์ซ้ำที่นี่
   */
  const docMeta =
    buyerName || departmentName ? (
      <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
        {buyerName && (
          <span className="flex items-center gap-1">
            <User className="size-3 shrink-0" aria-hidden="true" />
            {buyerName}
          </span>
        )}
        {departmentName && (
          <span className="flex items-center gap-1">
            <Building2 className="size-3 shrink-0" aria-hidden="true" />
            {departmentName}
          </span>
        )}
      </span>
    ) : null;

  const workflowStepEl = purchaseOrder?.workflow_current_stage ? (
    <WorkflowTrack
      previousStage={purchaseOrder.workflow_previous_stage}
      currentStage={purchaseOrder.workflow_current_stage}
      nextStage={
        purchaseOrder.po_status === "completed"
          ? undefined
          : purchaseOrder.workflow_next_stage
      }
    />
  ) : undefined;

  // กดที่แถบขั้นตอน = เปิดประวัติ · ไม่มีข้อความบอกว่า "กดเพื่อดู" แล้ว —
  // ถ้าต้องติดป้ายบอกว่ากดได้ แปลว่า affordance ยังไม่พอ ให้ hover/cursor กับ
  // tooltip ทำหน้าที่แทน · -ml-1 หักล้าง px-1 ของตัวเอง ให้แถบชิดซ้ายเสมอ title
  const workflowStep =
    workflowStepEl && hasHistory && onShowHistory ? (
      <button
        type="button"
        onClick={onShowHistory}
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
    <DocFormHeader
      title={headerTitle}
      subtitle={
        docMeta || workflowStep ? (
          <span className="flex flex-col gap-1">
            {docMeta}
            {workflowStep}
          </span>
        ) : undefined
      }
      backLabel={tc("goBack")}
      onBack={onBack}
      badges={badges}
      actions={actions}
    />
  );
}
