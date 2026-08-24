import { useLocation, useSearchParams } from "react-router";
import { useTranslations } from "use-intl";
import { StoreRequisitionForm } from "./sr-form";
import type { SrPrefillDraft } from "./sr-form-helpers";
import { useStoreRequisitionById } from "@/hooks/use-store-requisition";
import { CreateWorkflowGate } from "@/components/share/create-workflow-gate";
import { FormSkeleton } from "@/components/loader/form-skeleton";
import { WORKFLOW_TYPE } from "@/types/workflows";

export function Component() {
  const t = useTranslations("storeOperation.storeRequisition");
  const [searchParams] = useSearchParams();
  const routerLocation = useLocation();
  // ?duplicate_id= — สร้างสำเนาจากใบเดิม (ปุ่ม Duplicate ในหน้า detail)
  const duplicateId = searchParams.get("duplicate_id");
  // router state — wizard ของหน้า Stock Replenishment ส่งรายการของมาให้กรอกต่อ
  // (ไม่ใช่ query string เพราะอาจมีหลายสิบแถว) refresh แล้ว state หายกลายเป็น
  // ฟอร์มเปล่า ซึ่งถูกแล้ว: ของที่เติมมายังไม่ถูก save จะกู้คืนเองไม่ได้
  const prefill = (routerLocation.state as { srPrefill?: SrPrefillDraft })
    ?.srPrefill;
  const { data: duplicateFrom, isError: duplicateError } =
    useStoreRequisitionById(duplicateId ?? undefined);

  return (
    <CreateWorkflowGate
      workflowType={WORKFLOW_TYPE.SR}
      description={t("noCreatableWorkflow")}
    >
      {/* duplicate ต้องรอ "ข้อมูลมาแล้ว" ไม่ใช่ isLoading — ช่วง query ยัง disabled
          (รอ buCode) isLoading เป็น false ฟอร์มจะ mount เปล่าแล้ว defaultValues
          โดนแช่ (บทเรียนจาก PR) ดึงพลาด → ตกไปฟอร์มเปล่าแทนค้าง skeleton */}
      {duplicateId && !duplicateFrom && !duplicateError ? (
        <FormSkeleton />
      ) : (
        <StoreRequisitionForm duplicateFrom={duplicateFrom} prefill={prefill} />
      )}
    </CreateWorkflowGate>
  );
}
