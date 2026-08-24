import { Suspense } from "react";
import { useLocation, useSearchParams } from "react-router";
import { useTranslations } from "use-intl";
import { PurchaseRequestForm } from "./pr-form";
import { getPrefilledValues, type PrPrefillDraft } from "./pr-form-schema";
import {
  usePurchaseRequestById,
  usePurchaseRequestTemplates,
} from "@/hooks/use-purchase-request";
import { CreateWorkflowGate } from "@/components/share/create-workflow-gate";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { FormSkeleton } from "@/components/loader/form-skeleton";

const NewPurchaseRequestInner = () => {
  const [searchParams] = useSearchParams();
  const routerLocation = useLocation();
  const templateId = searchParams.get("template_id");
  // ?duplicate_id= — สร้างสำเนาจากใบเดิม (ปุ่ม Duplicate ในหน้า detail/เมนูแถว)
  const duplicateId = searchParams.get("duplicate_id");
  // router state — wizard ของหน้า Stock Replenishment ส่งรายการของมาให้กรอกต่อ
  // (ไม่ใช่ query string เพราะอาจมีหลายสิบแถว) refresh แล้ว state หายกลายเป็น
  // ฟอร์มเปล่า ซึ่งถูกแล้ว: ของที่เติมมายังไม่ถูก save จะกู้คืนเองไม่ได้
  const prefillDraft = (routerLocation.state as { prPrefill?: PrPrefillDraft })
    ?.prPrefill;

  // ดึง templates เฉพาะตอนเข้ามาแบบ ?template_id= — blank PR ไม่ต้องใช้
  const { data: templates, isLoading } =
    usePurchaseRequestTemplates(!!templateId);
  const { data: duplicateFrom, isError: duplicateError } =
    usePurchaseRequestById(duplicateId ?? undefined);

  // duplicate ต้องรอ "ข้อมูลมาแล้ว" ไม่ใช่แค่ isLoading — ช่วงแรก query ยัง
  // disabled (รอ buCode) isLoading เป็น false ทั้งที่ยังไม่มีของ ถ้าปล่อยผ่าน
  // ฟอร์มจะ mount เปล่า ๆ แล้ว defaultValues ถูกแช่ไปตลอด (useForm อ่านครั้งเดียว)
  // ดึงใบเดิมพลาด → ตกไปฟอร์มเปล่าแทนที่จะค้าง skeleton
  if (
    (templateId && isLoading) ||
    (duplicateId && !duplicateFrom && !duplicateError)
  ) {
    return <FormSkeleton />;
  }

  const template = templateId
    ? templates?.find((item) => item.id === templateId)
    : undefined;

  return (
    <PurchaseRequestForm
      template={template}
      duplicateFrom={duplicateFrom}
      prefill={prefillDraft ? getPrefilledValues(prefillDraft) : undefined}
    />
  );
};

export function NewPurchaseRequestContent() {
  const t = useTranslations("procurement.purchaseRequest");

  return (
    <CreateWorkflowGate
      workflowType={WORKFLOW_TYPE.PR}
      description={t("noCreatableWorkflow")}
    >
      <Suspense fallback={<FormSkeleton />}>
        <NewPurchaseRequestInner />
      </Suspense>
    </CreateWorkflowGate>
  );
}
