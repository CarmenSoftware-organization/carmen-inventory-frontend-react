import RecipeCategoryComponent from "./_components/recipe-category-component";

/**
 * หน้ารายการหมวดหมู่สูตรอาหาร
 * @returns React element ของหน้ารายการหมวดหมู่สูตรอาหาร
 * @example
 * // route: /operation-plan/category
 * <RecipeCategoryPage />
 */
export default function RecipeCategoryPage() {
  return <RecipeCategoryComponent />;
}

export const Component = RecipeCategoryPage;
