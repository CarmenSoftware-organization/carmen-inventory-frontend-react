import { useTranslations } from "use-intl";
import { useEquipmentById } from "./use-eq";
import { EquipmentForm } from "./eq-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormPageSkeleton } from "@/components/loader/form-page-skeleton";

export function EqEditContent({ id }: { id: string }) {
  const tErr = useTranslations("operationPlan.equipment");
  const { data: equipment, isLoading, error, refetch } = useEquipmentById(id);

  if (isLoading) return <FormPageSkeleton />;
  if (error || !equipment)
    return (
      <ErrorState
        error={error}
        notFoundMessage={tErr("notFound")}
        onRetry={() => refetch()}
        backTo="/operation-plan/equipment"
      />
    );

  return <EquipmentForm equipment={equipment} />;
}
