import { Suspense } from "react";
import { useSearchParams } from "react-router";
import { useTranslations } from "use-intl";
import { PurchaseRequestForm } from "./pr-form";
import { usePurchaseRequestTemplates } from "@/hooks/use-purchase-request";
import { CreateWorkflowGate } from "@/components/share/create-workflow-gate";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { FormSkeleton } from "@/components/loader/form-skeleton";

const NewPurchaseRequestInner = () => {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("template_id");

  const { data: templates, isLoading } = usePurchaseRequestTemplates();

  if (templateId && isLoading) {
    return <FormSkeleton />;
  }

  const template = templateId
    ? templates?.find((item) => item.id === templateId)
    : undefined;

  return <PurchaseRequestForm template={template} />;
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
