import { useTranslations } from "use-intl";
import { usePhysicalCountById } from "../shared/use-physical-count";
import { PcForm } from "./pc-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";
import type { PhysicalCount } from "@/types/physical-count";

export function PcEditContent({ id }: Readonly<{ id: string }>) {
  const t = useTranslations("inventoryManagement.physicalCount");
  const {
    data: physicalCount,
    isLoading,
    error,
    refetch,
  } = usePhysicalCountById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !physicalCount)
    return (
      <ErrorState
        error={error}
        notFoundMessage={t("notFound")}
        onRetry={() => refetch()}
        backTo="/inventory-management/physical-count"
      />
    );

  return <PcForm physicalCount={physicalCount as unknown as PhysicalCount} />;
}
