import { RecipeCategoryForm } from "../_components/recipe-category-form";

/**
 * หน้าสำหรับสร้างหมวดหมู่สูตรอาหารใหม่
 * @returns React element ของหน้าสร้างหมวดหมู่สูตรอาหาร
 * @example
 * // route: /operation-plan/category/new
 * <NewRecipeCategoryPage />
 */
export default function NewRecipeCategoryPage() {
  return <RecipeCategoryForm />;
}

export const Component = NewRecipeCategoryPage;
