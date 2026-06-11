import { Suspense } from "react";
import { ProductForm } from "../_components/pd-form";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าสร้างสินค้าใหม่
 *
 * Route `/product-management/product/new` — แสดง `ProductForm` (โหมด add) ภายใต้
 * Suspense boundary พร้อม FormSkeleton fallback ระหว่างรอโหลด data deps
 *
 * @returns JSX ของหน้าสร้างสินค้าใหม่
 * @example
 * ```tsx
 * // Route: /product-management/product/new
 * <NewProductPage />
 * ```
 */
export default function NewProductPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <ProductForm />
    </Suspense>
  );
}

export const Component = NewProductPage;
