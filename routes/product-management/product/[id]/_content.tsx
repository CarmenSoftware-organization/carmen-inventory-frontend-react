
import { Suspense } from "react";
import { useTranslations } from "use-intl";
import { useProductById } from "@/hooks/use-product";
import { ProductForm } from "../_components/pd-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * เนื้อหาหน้าแก้ไขสินค้า
 *
 * โหลดข้อมูลสินค้าด้วย `useProductById(id)` แล้วจัดการสถานะ loading (FormSkeleton),
 * error (ErrorState + refetch), not-found (ErrorState) และ success (ProductForm)
 *
 * @param props - object ที่มี id ของสินค้าที่ต้องการโหลด
 * @returns JSX ของเนื้อหาหน้าแก้ไขสินค้า
 * @example
 * ```tsx
 * <EditProductContent id="prod-123" />
 * ```
 */
const EditProductInner = ({ id }: { id: string }) => {
  const t = useTranslations("productManagement.product");
  const { data: product, isLoading, error, refetch } = useProductById(id);

  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!product) return <ErrorState message={t("notFound")} />;

  return <ProductForm product={product} />;
};

/**
 * หน้าแก้ไขสินค้าตาม id
 *
 * Route `/product-management/product/[id]` — unwrap `params` (Next.js 16 Promise) ด้วย `use()`
 * แล้วส่ง id ให้ `EditProductContent` ภายใต้ Suspense + FormSkeleton fallback
 *
 * @param props - props ของ Next.js page ที่มี `params` เป็น Promise ของ `{ id }`
 * @returns JSX ของหน้าแก้ไขสินค้า
 * @example
 * ```tsx
 * // Route: /product-management/product/prod-123
 * <EditProductPage params={Promise.resolve({ id: "prod-123" })} />
 * ```
 */
export function EditProductContent({ id }: { id: string }) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EditProductInner id={id} />
    </Suspense>
  );
}
