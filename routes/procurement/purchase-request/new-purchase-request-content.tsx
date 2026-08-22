import { Suspense } from "react";
import { useSearchParams } from "react-router";
import { useTranslations } from "use-intl";
import { PurchaseRequestForm } from "./pr-form";
import {
  usePurchaseRequestById,
  usePurchaseRequestTemplates,
} from "@/hooks/use-purchase-request";
import { CreateWorkflowGate } from "@/components/share/create-workflow-gate";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { FormSkeleton } from "@/components/loader/form-skeleton";

const NewPurchaseRequestInner = () => {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("template_id");
  // ?duplicate_id= — สร้างสำเนาจากใบเดิม (ปุ่ม Duplicate ในหน้า detail/เมนูแถว)
  const duplicateId = searchParams.get("duplicate_id");

  // ดึง templates เฉพาะตอนเข้ามาแบบ ?template_id= — blank PR ไม่ต้องใช้
  const { data: templates, isLoading } = usePurchaseRequestTemplates(
    !!templateId,
  );
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
    <PurchaseRequestForm template={template} duplicateFrom={duplicateFrom} />
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
