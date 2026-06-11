import { CuisineForm } from "../_components/cuisine-form";

/**
 * หน้าสำหรับสร้าง cuisine ใหม่
 * @returns React element ของหน้าสร้าง cuisine
 * @example
 * // route: /operation-plan/cuisine/new
 * <NewCuisinePage />
 */
export default function NewCuisinePage() {
  return <CuisineForm />;
}

export const Component = NewCuisinePage;
