import { Suspense } from "react";
import { useTranslations } from "use-intl";
import { useProductById } from "@/hooks/use-product";
import { ProductForm } from "./pd-form";
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

/**
 * หน้าแก้ไขสินค้าตาม id — ห่อ `EditProductInner` ไว้ใน Suspense พร้อม
 * `FormSkeleton` เป็น fallback (ฟอร์มสินค้า lazy-load ของหนักหลายก้อน)
 *
 * @param props.id - รหัสสินค้าที่ route อ่านมาจาก URL segment (`useParams`)
 * @returns JSX ของหน้าแก้ไขสินค้า
 */
export function EditProductContent({ id }: { id: string }) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EditProductInner id={id} />
    </Suspense>
  );
}
