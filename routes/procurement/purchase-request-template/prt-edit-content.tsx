import { useTranslations } from "use-intl";
import { usePrtById } from "./use-prt";
import { PrtForm } from "./prt-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormPageSkeleton } from "@/components/loader/form-page-skeleton";

export function PrtEditContent({ id }: { id: string }) {
  const t = useTranslations("procurement.purchaseRequestTemplate");
  const { data: template, isLoading, error, refetch } = usePrtById(id);

  if (isLoading) return <FormPageSkeleton />;
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
