import { useTranslations } from "use-intl";
import { useVendorById } from "@/hooks/use-vendor";
import { VendorForm } from "./vendor-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าแก้ไขข้อมูล vendor ตาม id — ดึงข้อมูลผ่าน `useVendorById`
 * เมื่อได้ข้อมูลส่งให้ `VendorForm` ซึ่งเปิดมาที่โหมด view แล้วกดแก้ต่อได้
 *
 * @param props.id - รหัส vendor ที่ route อ่านมาจาก URL segment (`useParams`)
 * @returns `FormSkeleton` ระหว่างโหลด · `ErrorState` พร้อม retry เมื่อล้มเหลวหรือไม่พบ · ฟอร์มเมื่อได้ข้อมูล
 */
export function EditVendorContent({ id }: { id: string }) {
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
