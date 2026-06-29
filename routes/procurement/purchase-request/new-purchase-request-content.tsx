
import { Suspense } from "react";
import { useSearchParams } from "react-router";
import { PurchaseRequestForm } from "./pr-form";
import { usePurchaseRequestTemplates } from "@/hooks/use-purchase-request";
import { FormSkeleton } from "@/components/loader/form-skeleton";

const NewPurchaseRequestInner = () => {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("template_id");

  const { data: templates, isLoading } = usePurchaseRequestTemplates();

  if (templateId && isLoading) {
    return <FormSkeleton />;
  }

  const template = templateId
    ? templates?.find((t) => t.id === templateId)
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
