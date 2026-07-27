import { Suspense } from "react";
import { useSearchParams } from "react-router";
import { usePurchaseRequestTemplates } from "@/hooks/use-purchase-request";
import { FormSkeleton } from "@/components/loader/form-skeleton";
import { PurchaseRequestFormV2 } from "./pr2-form";

/**
 * สร้างใบขอซื้อใหม่ (v2) — รับ `?template_id=` แบบเดียวกับหน้าเดิม
 * เพื่อให้ dialog เลือกเทมเพลตของหน้า list ใช้ได้เหมือนกันถ้าจะสลับมาใช้ v2
 */
function NewPurchaseRequestV2Inner() {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("template_id");

  const { data: templates, isLoading } = usePurchaseRequestTemplates();

  if (templateId && isLoading) return <FormSkeleton />;

  const template = templateId
    ? templates?.find((t) => t.id === templateId)
    : undefined;

  return <PurchaseRequestFormV2 template={template} />;
}

export function Component() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <NewPurchaseRequestV2Inner />
    </Suspense>
  );
}
