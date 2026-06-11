import EquipmentCategoryComponent from "./_components/equipment-category-component";

/**
 * หน้ารายการหมวดหมู่อุปกรณ์
 * @returns React element ของหน้ารายการหมวดหมู่อุปกรณ์
 * @example
 * // route: /operation-plan/equipment-category
 * <EquipmentCategoryPage />
 */
export default function EquipmentCategoryPage() {
  return <EquipmentCategoryComponent />;
}

export const Component = EquipmentCategoryPage;
