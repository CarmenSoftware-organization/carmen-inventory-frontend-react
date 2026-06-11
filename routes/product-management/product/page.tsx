import ProductComponent from "./_components/pd-component";

/**
 * หน้ารายการสินค้า (Product List)
 *
 * Route `/product-management/product` แสดง `ProductComponent` ที่เป็น list page
 * พร้อมระบบค้นหา กรอง และลิงก์ไปยังหน้าสร้าง/แก้ไขสินค้า
 *
 * @returns JSX ของหน้ารายการสินค้า
 * @example
 * ```tsx
 * // Route: /product-management/product
 * <ProductPage />
 * ```
 */
export default function ProductPage() {
  return <ProductComponent />;
}

export const Component = ProductPage;
