import { EquipmentForm } from "../_components/eq-form";

/**
 * หน้าสำหรับสร้างอุปกรณ์ใหม่
 * @returns React element ของหน้าสร้างอุปกรณ์
 * @example
 * // route: /operation-plan/equipment/new
 * <NewEquipmentPage />
 */
export default function NewEquipmentPage() {
  return <EquipmentForm />;
}

export const Component = NewEquipmentPage;
