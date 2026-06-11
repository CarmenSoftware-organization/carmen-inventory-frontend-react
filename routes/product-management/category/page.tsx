import CategoryComponent from "./_components/category-component";

/**
 * หน้าจัดการหมวดหมู่สินค้า
 *
 * Route `/product-management/category` แสดง `CategoryComponent` ที่เป็น tree view
 * ของหมวดหมู่สินค้า พร้อมการสร้าง/แก้ไข/ลบ และจัดลำดับแบบ hierarchical
 *
 * @returns JSX ของหน้า category
 * @example
 * ```tsx
 * // Route: /product-management/category
 * <CategoryPage />
 * ```
 */
export default function CategoryPage() {
  return <CategoryComponent />;
}

export const Component = CategoryPage;
