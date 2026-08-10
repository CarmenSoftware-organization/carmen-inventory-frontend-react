import { Building2, CalendarDays, User } from "lucide-react";
import { type ReactNode } from "react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { WorkflowTrack } from "@/components/share/workflow-track";
import { PR_STATUS, type PurchaseRequest } from "@/types/purchase-request";
import { PR_STATUS_CONFIG } from "@/constant/purchase-request";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DocFormHeader } from "@/components/share/doc-form-header";

interface PrHeaderProps {
  readonly purchaseRequest?: PurchaseRequest;
  readonly onBack: () => void;
  readonly reqName: string;
  readonly departmentName: string;
  readonly prDateDisplay: string;
  /** ชื่อ workflow — ใช้ตอนอ่านอย่างเดียว (แก้ได้ให้ส่ง workflowField มาแทน) */
  readonly workflowName?: string;
  /** ช่องเลือก workflow ตอนแก้ได้ — วางในเซลล์เดียวกับตอนอ่านอย่างเดียว */
  readonly workflowField?: ReactNode;
  /** คำอธิบายใบ — ใช้ตอนอ่านอย่างเดียว */
  readonly description?: string;
  /** ช่องกรอกคำอธิบายตอนแก้ได้ — วางในเซลล์เดียวกับตอนอ่านอย่างเดียว */
  readonly descriptionField?: ReactNode;
  /** ปุ่ม action (PrFormActions) — caller ประกอบเอง */
  readonly actions: ReactNode;
  /** มี workflow history ให้ดูไหม — คุมว่าแถบขั้นตอนกดได้หรือไม่ */
  readonly hasHistory?: boolean;
  /** เปิด workflow history sheet (กดที่แถบขั้นตอน) */
  readonly onShowHistory?: () => void;
}

export function PrHeader({
  purchaseRequest,
  onBack,
  reqName,
  departmentName,
  prDateDisplay,
  workflowName,
  workflowField,
  description,
  descriptionField,
  actions,
  hasHistory,
  onShowHistory,
}: PrHeaderProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  const statusCfg = purchaseRequest
    ? (PR_STATUS_CONFIG[purchaseRequest.pr_status] ?? PR_STATUS_CONFIG.draft)
    : null;

  // edition ย้ายมาอยู่แถวเดียวกับเลขที่ใบ เพื่อคืนบรรทัด subtitle ให้แถบขั้นตอน
  // (เลขที่ใบ · สถานะ · รุ่น = ตัวตนของเอกสาร อยู่ด้วยกันหมดในบรรทัดเดียว)
  const badges = (
    <>
      {statusCfg && (
        <Badge className={statusCfg.className} size="sm">
          {statusCfg.label ?? purchaseRequest?.pr_status}
        </Badge>
      )}
      {purchaseRequest?.doc_version != null && (
        <span className="text-muted-foreground text-xs">
          {tfl("version")} {purchaseRequest.doc_version}
        </span>
      )}
    </>
  );

  // draft/add ยังไม่เข้า workflow — ซ่อน workflow cell/step
  const isDraft =
    !purchaseRequest?.pr_status ||
    purchaseRequest.pr_status === PR_STATUS.DRAFT;

  // แถบข้อมูลหัวเอกสาร — ทุกฟิลด์ของใบอยู่ที่นี่ที่เดียว ไม่มีบล็อกซ้ำในตัวฟอร์ม
  // ช่องที่แก้ได้ (workflow/description) ส่งเป็น node มาวางในเซลล์ของตัวเอง
  // ฟิลด์เดียวกันจึงอยู่ตำแหน่งเดิมเสมอ สลับ view/edit แล้วไม่ต้องไล่หาใหม่
  const workflowCell =
    workflowField ??
    (workflowName ? (
      <Field>
        <FieldLabel>{tfl("workflow")}</FieldLabel>
        <Input value={workflowName} disabled />
      </Field>
    ) : null);

  const descriptionCell =
    descriptionField ??
    (description?.trim() ? (
      <Field className="lg:col-span-2">
        <FieldLabel>{tfl("description")}</FieldLabel>
        <Input value={description} disabled />
      </Field>
    ) : null);

  // สองแถวเป็นคนละ grid แต่ track เดียวกัน — บังคับให้ workflow/description
  // ขึ้นบรรทัดใหม่เสมอ ไม่ว่าแถวบนจะมีกี่ช่อง (ถ้าใช้ grid เดียวแล้วปล่อยไหลเอง
  // ช่องจะเลื่อนไปต่อท้ายแถวบนเมื่อจอกว้างพอ) · ml-4 หักล้าง -ml-4 ของ DocFormHeader
  const ribbonRow =
    "grid w-full grid-cols-1 gap-x-2 gap-y-4 sm:grid-cols-2 lg:grid-cols-6";
  const ribbon = (workflowCell || descriptionCell) && (
    <div className="ml-4 w-full">
      <div className={ribbonRow}>
        {workflowCell}
        {descriptionCell}
      </div>
    </div>
  );

  /**
   * ผู้ขอ · แผนก · วันที่ อยู่ใต้เลขที่ใบเป็นข้อความ ไม่ใช่ช่องกรอกที่จางทั้งแถว
   * (ทรงเดียวกับ CN/GRN/PO) — สามค่านี้อ่านอย่างเดียว ไม่เข้า payload การทำเป็น
   * ช่อง disabled กินพื้นที่เท่าช่องที่กรอกได้จริงและชวนให้เข้าใจผิดว่าแก้ได้
   *
   * ต่างจากอีกสามใบตรงที่ PR ไม่เปิดให้เลือกวันที่ — วันที่ใบขอซื้อคือวันที่ระบบ
   * บันทึก ไม่ใช่ค่าที่ผู้ขอกรอกเอง จึงยังเป็นข้อความอ่านอย่างเดียวเหมือนเดิม
   */
  const docMeta =
    reqName || departmentName || prDateDisplay ? (
      <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
        {reqName && (
          <span className="flex items-center gap-1">
            <User className="size-3 shrink-0" aria-hidden="true" />
            {reqName}
          </span>
        )}
        {departmentName && (
          <span className="flex items-center gap-1">
            <Building2 className="size-3 shrink-0" aria-hidden="true" />
            {departmentName}
          </span>
        )}
        {prDateDisplay && (
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
            {prDateDisplay}
          </span>
        )}
      </span>
    ) : null;

  const workflowStepEl =
    !isDraft && purchaseRequest?.workflow_current_stage ? (
      <WorkflowTrack
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

  // กดที่แถบขั้นตอน = เปิดประวัติ · ไม่มีข้อความบอกว่า "กดเพื่อดู" แล้ว —
  // ถ้าต้องติดป้ายบอกว่ากดได้ แปลว่า affordance ยังไม่พอ ให้ hover/cursor กับ
  // tooltip ทำหน้าที่แทน (ของเดิมยังเขียนว่า "Tap" ซึ่งเป็นคำของมือถือ ทั้งที่
  // แอปนี้เป็นเครื่องมือบนโต๊ะทำงาน)
  const workflowStep =
    workflowStepEl && hasHistory && onShowHistory ? (
      <button
        type="button"
        onClick={onShowHistory}
        title={t("tabWorkflowHistory")}
        aria-label={t("tabWorkflowHistory")}
        // w-fit: พื้นหลังตอน hover ต้องกอดเฉพาะแถบ ไม่ใช่ลากยาวเต็มบรรทัด
        className="hover:bg-muted/60 focus-visible:ring-ring -ml-1 w-fit cursor-pointer rounded-lg px-1 py-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {workflowStepEl}
      </button>
    ) : (
      workflowStepEl
    );

  return (
    <DocFormHeader
      title={purchaseRequest?.pr_no ?? t("title")}
      subtitle={
        workflowStep || docMeta ? (
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
      ribbon={ribbon}
    />
  );
}
