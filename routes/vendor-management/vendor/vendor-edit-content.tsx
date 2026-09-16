import { useTranslations } from "use-intl";
import { useVendorById } from "@/hooks/use-vendor";
import { VendorForm } from "./vendor-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

export function VendorEditContent({ id }: { id: string }) {
  const tErr = useTranslations("vendorManagement.vendor");
  const { data: vendor, isLoading, error, refetch } = useVendorById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !vendor)
    return (
      <ErrorState
        error={error}
        notFoundMessage={tErr("notFound")}
        onRetry={() => refetch()}
        backTo="/vendor-management/vendor"
      />
    );

  return <VendorForm vendor={vendor} />;
}
