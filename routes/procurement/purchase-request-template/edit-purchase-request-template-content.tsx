import { useTranslations } from "use-intl";
import { usePrtById } from "./use-prt";
import { PrtForm } from "./prt-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าดู/แก้ไขเทมเพลต PR ตาม id ที่ระบุใน URL
 * @param props - object ที่มี params Promise สำหรับรับ id
 * @returns React element ของฟอร์ม PRT
 */
export function EditPurchaseRequestTemplateContent({ id }: { id: string }) {
  const t = useTranslations("procurement.purchaseRequestTemplate");
  const { data: template, isLoading, error, refetch } = usePrtById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !template)
    return (
      <ErrorState
        error={error}
        notFoundMessage={t("notFound")}
        onRetry={() => refetch()}
        backTo="/procurement/purchase-request-template"
      />
    );

  return <PrtForm template={template} />;
}
