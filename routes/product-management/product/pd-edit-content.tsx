import { Suspense } from "react";
import { useTranslations } from "use-intl";
import { useProductById } from "@/hooks/use-product";
import { ProductForm } from "./pd-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormPageSkeleton } from "@/components/loader/form-page-skeleton";

const PdEditInner = ({ id }: { id: string }) => {
  const t = useTranslations("productManagement.product");
  const { data: product, isLoading, error, refetch } = useProductById(id);

  if (isLoading) return <FormPageSkeleton width="wide" />;
  if (error || !product)
    return (
      <ErrorState
        error={error}
        notFoundMessage={t("notFound")}
        onRetry={() => refetch()}
        backTo="/product-management/product"
      />
    );

  return <ProductForm product={product} />;
};

export function PdEditContent({ id }: { id: string }) {
  return (
    <Suspense fallback={<FormPageSkeleton width="wide" />}>
      <PdEditInner id={id} />
    </Suspense>
  );
}
