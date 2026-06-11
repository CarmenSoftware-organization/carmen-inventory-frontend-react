
import { useCuisineById } from "@/hooks/use-cuisine";
import { CuisineForm } from "../_components/cuisine-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าสำหรับแก้ไขข้อมูล cuisine ที่มีอยู่
 * @param props - params ที่มี id ของ cuisine
 * @returns React element ของหน้าแก้ไข cuisine
 * @example
 * // route: /operation-plan/cuisine/abc-123
 * <EditCuisinePage params={Promise.resolve({ id: "abc-123" })} />
 */
export function EditCuisineContent({ id }: { id: string }) {
  const { data: cuisine, isLoading, error, refetch } = useCuisineById(id);

  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!cuisine) return <ErrorState message="Cuisine not found" />;

  return <CuisineForm cuisine={cuisine} />;
}
