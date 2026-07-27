import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "use-intl";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LookupWorkflow } from "@/components/lookup/lookup-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { PR_STATUS_CONFIG } from "@/constant/purchase-request";
import type { PurchaseRequest } from "@/types/purchase-request";
import type { PrFormValues } from "../pr-form-schema";

/** ป้าย–ค่า หนึ่งคู่ อ่านเป็นประโยคได้ ไม่ใช่ป้ายตัวใหญ่ลอยเหนือค่า */
function Pair({
  label,
  value,
}: {
  readonly label: string;
  readonly value: ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

interface Pr2DocStripProps {
  readonly purchaseRequest?: PurchaseRequest;
  readonly requesterName: string;
  readonly departmentName: string;
  readonly prDateDisplay: string;
  readonly description?: string;
  readonly form: UseFormReturn<PrFormValues>;
  /** draft + ผู้สร้าง เท่านั้นที่เลือกสายอนุมัติได้ (กติกาเดียวกับหน้าเดิม) */
  readonly canEditWorkflow: boolean;
  /** ผู้สร้างเท่านั้นที่แก้หมายเหตุได้ */
  readonly canEditDescription: boolean;
  readonly isPending: boolean;
  readonly onBack: () => void;
  readonly actions: ReactNode;
}

/**
 * โซน 1+2 ของหน้า — ตัวตนของใบ + ข้อมูลใบ
 *
 * หน้าเดิมใช้ ~230px แสดง 5 ค่าสั้นๆ ด้วยการจัดหน้าแบบใบปลิว (ป้ายตัวใหญ่เว้นวรรค
 * เยอะ) ขณะที่ตารางข้างล่างขาดที่จนต้องซ่อนคอลัมน์ v2 บีบเหลือสองบรรทัด ข้อมูล
 * เท่าเดิมทุกตัว แล้วคืนความสูงให้ตารางซึ่งเป็นที่ที่คนทำงานจริง
 */
export function Pr2DocStrip({
  purchaseRequest,
  requesterName,
  departmentName,
  prDateDisplay,
  description,
  form,
  canEditWorkflow,
  canEditDescription,
  isPending,
  onBack,
  actions,
}: Pr2DocStripProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const tv2 = useTranslations("procurement.purchaseRequest.v2");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  const statusCfg = purchaseRequest
    ? (PR_STATUS_CONFIG[purchaseRequest.pr_status] ?? PR_STATUS_CONFIG.draft)
    : null;

  return (
    <div className="bg-background border-border sticky top-0 z-30 border-b">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-3 pb-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label={tc("goBack")}
        >
          <ArrowLeft />
        </Button>
        <span className="text-muted-foreground text-sm">{t("entity")}</span>
        <h1 className="text-xl font-semibold tracking-tight">
          {purchaseRequest?.pr_no ?? t("title")}
        </h1>
        {statusCfg && (
          <Badge className={statusCfg.className} size="sm">
            {statusCfg.label ?? purchaseRequest?.pr_status}
          </Badge>
        )}
        {purchaseRequest?.doc_version != null && (
          <span className="text-muted-foreground text-xs">
            {tv2("edition", { n: purchaseRequest.doc_version })}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>

      {/* grid ที่ track กว้างเท่าเนื้อหา (auto) + justify-start — บรรทัดล่าง
          `col-span-full` จึงยาวพอดีสุดขอบของช่อง Workflow ไม่ใช่สุดขอบจอ
          (ถ้าใช้ flex ธรรมดาจะบังคับให้สองบรรทัดจบตรงกันไม่ได้) */}
      <div className="grid grid-cols-[auto_auto_auto_auto] items-center justify-start gap-x-6 gap-y-1.5 px-4 pb-3">
        <Pair label={tfl("requester")} value={requesterName} />
        <Pair label={tfl("department")} value={departmentName} />
        <Pair label={tv2("requestedOn")} value={prDateDisplay} />

        {canEditWorkflow ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="text-muted-foreground shrink-0 text-xs">
              {tfl("workflow")}
            </span>
            <Controller
              control={form.control}
              name="workflow_id"
              render={({ field }) => (
                <LookupWorkflow
                  value={field.value}
                  onValueChange={field.onChange}
                  workflowType={WORKFLOW_TYPE.PR}
                  disabled={isPending}
                  error={form.formState.errors.workflow_id?.message}
                  className="h-7 w-44 text-xs"
                />
              )}
            />
          </div>
        ) : (
          <Pair
            label={tfl("workflow")}
            value={purchaseRequest?.workflow_name}
          />
        )}

        {canEditDescription ? (
          <div className="col-span-full flex min-w-0 items-center gap-1.5">
            <span className="text-muted-foreground shrink-0 text-xs">
              {tfl("description")}
            </span>
            {/* Input/Textarea ที่มี maxLength ถูกห่อด้วย div ตัวนับตัวอักษร
                → ต้องใส่ flex-1 ที่ตัวห่อ ไม่ใช่ที่ input ไม่งั้นมันหดตามเนื้อหา
                (กับดักเดิมกับตอนที่ยังเป็น Textarea) */}
            <div className="min-w-0 flex-1">
              <Input
                maxLength={256}
                disabled={isPending}
                placeholder={t("descPlaceholder")}
                className="h-7 w-full text-xs"
                {...form.register("description")}
              />
            </div>
          </div>
        ) : (
          description && (
            <div className="col-span-full">
              <Pair label={tfl("description")} value={description} />
            </div>
          )
        )}
      </div>
    </div>
  );
}
