import { Suspense } from "react";
import { useTranslations } from "use-intl";
import { useProductById } from "@/hooks/use-product";
import { ProductForm } from "./pd-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * เนื้อหาจริงของหน้าแก้ไขสินค้า — โหลดด้วย `useProductById(id)`
 *
 * @param props.id - รหัสสินค้าที่ต้องการโหลด
 * @returns `FormSkeleton` ระหว่างโหลด · `ErrorState` เมื่อล้มเหลวหรือไม่พบ · `ProductForm` เมื่อได้ข้อมูล
 */
const PdEditInner = ({ id }: { id: string }) => {
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
 * หน้าแก้ไขสินค้าตาม id — ห่อ `PdEditInner` ไว้ใน Suspense พร้อม
 * `FormSkeleton` เป็น fallback (ฟอร์มสินค้า lazy-load ของหนักหลายก้อน)
 *
 * @param props.id - รหัสสินค้าที่ route อ่านมาจาก URL segment (`useParams`)
 * @returns JSX ของหน้าแก้ไขสินค้า
 */
export function PdEditContent({ id }: { id: string }) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <PdEditInner id={id} />
    </Suspense>
  );
}
