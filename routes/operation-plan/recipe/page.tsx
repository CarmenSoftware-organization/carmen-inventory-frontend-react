import RecipeComponent from "./_components/recipe-component";

/**
 * หน้ารายการสูตรอาหาร
 * @returns React element ของหน้ารายการสูตรอาหาร
 * @example
 * // ใช้เป็น route component ที่ app/(root)/operation-plan/recipe/page.tsx
 * <RecipePage />
 */
export default function RecipePage() {
  return <RecipeComponent />;
}

export const Component = RecipePage;
