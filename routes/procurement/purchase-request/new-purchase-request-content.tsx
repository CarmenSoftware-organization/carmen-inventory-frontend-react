import { Suspense } from "react";
import { useSearchParams } from "react-router";
import { useTranslations } from "use-intl";
import { PurchaseRequestForm } from "./pr-form";
import { usePurchaseRequestTemplates } from "@/hooks/use-purchase-request";
import { useCreatableWorkflows } from "@/hooks/use-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { AccessDeniedBlock } from "@/components/route-guard";
import { FormSkeleton } from "@/components/loader/form-skeleton";

const NewPurchaseRequestInner = () => {
  const t = useTranslations("procurement.purchaseRequest");
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("template_id");

  const { data: templates, isLoading } = usePurchaseRequestTemplates();
  const { canCreate, isLoading: workflowsLoading } = useCreatableWorkflows(
    WORKFLOW_TYPE.PR,
  );

  if ((templateId && isLoading) || workflowsLoading) {
    return <FormSkeleton />;
  }

  // ไม่มี workflow ให้เริ่มใบเลย = กรอกไปก็ส่งไม่ได้ บอกตั้งแต่ตรงนี้ดีกว่า
  // (ยังเข้าหน้านี้ได้จาก deep link / bookmark / ปุ่ม back)
  if (!canCreate) {
    return <AccessDeniedBlock description={t("noCreatableWorkflow")} />;
  }

  const template = templateId
    ? templates?.find((item) => item.id === templateId)
    : undefined;

  return <PurchaseRequestForm template={template} />;
};

export function NewPurchaseRequestContent() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <NewPurchaseRequestInner />
    </Suspense>
  );
}
