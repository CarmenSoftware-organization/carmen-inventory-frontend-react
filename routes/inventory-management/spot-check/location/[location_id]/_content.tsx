
import { useTranslations } from "use-intl";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";
import { useLocationById } from "@/hooks/use-location";
import { ScForm } from "../../_components/sc-form";

interface ScByLocationContentProps {
  readonly locationId: string;
}

export function ScByLocationContent({ locationId }: ScByLocationContentProps) {
  const t = useTranslations("inventoryManagement.spotCheck");
  const {
    data: location,
    isLoading,
    error,
    refetch,
  } = useLocationById(locationId);

  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!location) return <ErrorState message={t("notFound")} />;

  return (
    <ScForm
      defaultLocationId={locationId}
      defaultLocationName={location.name}
      availableProducts={location.product_location}
    />
  );
}
