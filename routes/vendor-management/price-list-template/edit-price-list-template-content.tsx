import { useTranslations } from "use-intl";
import { usePriceListTemplateById } from "@/hooks/use-price-list-template";
import { PriceListTemplateForm } from "./plt-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าแก้ไข price list template ตาม id — ดึงข้อมูลผ่าน `usePriceListTemplateById`
 * เมื่อได้ข้อมูลส่งให้ `PriceListTemplateForm` ซึ่งเปิดมาที่โหมด view แล้วกดแก้ต่อได้
 *
 * @param props.id - รหัส template ที่ route อ่านมาจาก URL segment (`useParams`)
 * @returns `FormSkeleton` ระหว่างโหลด · `ErrorState` พร้อม retry เมื่อล้มเหลวหรือไม่พบ · ฟอร์มเมื่อได้ข้อมูล
 */
export function EditPriceListTemplateContent({ id }: { id: string }) {
  const tErr = useTranslations("vendorManagement.priceListTemplate");
  const {
    data: priceListTemplate,
    isLoading,
    error,
    refetch,
  } = usePriceListTemplateById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !priceListTemplate)
    return (
      <ErrorState
        error={error}
        notFoundMessage={tErr("notFound")}
        onRetry={() => refetch()}
        backTo="/vendor-management/price-list-template"
      />
    );

  return <PriceListTemplateForm priceListTemplate={priceListTemplate} />;
}
