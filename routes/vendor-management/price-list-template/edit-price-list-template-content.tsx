
import { usePriceListTemplateById } from "@/hooks/use-price-list-template";
import { PriceListTemplateForm } from "./plt-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าแก้ไข price list template ตาม id ใน URL
 *
 * รายละเอียด: Client Component ที่ unwrap params ด้วย `use()`, ดึงข้อมูลผ่าน
 * `usePriceListTemplateById(id)`, แสดง `FormSkeleton` ระหว่างโหลด, `ErrorState`
 * พร้อม retry เมื่อ error, หรือ "Price list template not found" เมื่อไม่พบข้อมูล
 * เมื่อสำเร็จจะส่ง `priceListTemplate` ให้ `PriceListTemplateForm` ในโหมด view/edit
 *
 * @param props - properties ของหน้า
 * @param props.params - Promise ของ route params ที่มี `id` ของ template
 * @returns React element ของหน้าแก้ไข template
 * @example
 * ```tsx
 * // เข้าผ่าน Next.js App Router ที่ path /vendor-management/price-list-template/plt-01
 * <EditPriceListTemplatePage params={Promise.resolve({ id: "plt-01" })} />
 * ```
 */
export function EditPriceListTemplateContent({ id }: { id: string }) {
  const {
    data: priceListTemplate,
    isLoading,
    error,
    refetch,
  } = usePriceListTemplateById(id);

  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!priceListTemplate)
    return <ErrorState message="Price list template not found" />;

  return <PriceListTemplateForm priceListTemplate={priceListTemplate} />;
}
