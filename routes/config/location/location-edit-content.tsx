import { useTranslations } from "use-intl";
import { useLocationById } from "@/hooks/use-location";
import { LocationForm } from "./location-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าดู/แก้ไข Location ตาม id — ดึงข้อมูลผ่าน `useLocationById`
 *
 * @param props.id - รหัสคลังที่ route อ่านมาจาก URL segment (`useParams`)
 * @returns `FormSkeleton` ระหว่างโหลด · `ErrorState` เมื่อล้มเหลวหรือไม่พบ · `LocationForm` เมื่อได้ข้อมูล
 */
export function LocationEditContent({ id }: { id: string }) {
  const tErr = useTranslations("config.location");
  const { data: location, isLoading, error, refetch } = useLocationById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !location)
    return (
      <ErrorState
        error={error}
        notFoundMessage={tErr("notFound")}
        onRetry={() => refetch()}
        backTo="/config/location"
      />
    );

  return <LocationForm location={location} />;
}
