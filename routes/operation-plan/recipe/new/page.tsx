import { RecipeForm } from "../_components/recipe-form";

/**
 * หน้าสำหรับสร้างสูตรอาหารใหม่
 * @returns React element ของหน้าสร้างสูตรอาหาร
 * @example
 * // route: /operation-plan/recipe/new
 * <NewRecipePage />
 */
export default function NewRecipePage() {
  return <RecipeForm />;
}

export const Component = NewRecipePage;
