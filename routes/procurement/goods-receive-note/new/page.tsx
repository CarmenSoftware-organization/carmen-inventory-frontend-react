import { GrnForm } from "../_components/grn-form";

/**
 * หน้าสร้างใบรับสินค้าใหม่
 * route: /procurement/goods-receive-note/new
 * render GrnForm ในโหมด add (ไม่ส่ง goodsReceiveNote)
 *
 * @returns React element ของหน้าสร้าง GRN
 * @example
 * // Accessed via URL: /procurement/goods-receive-note/new
 */
export default function NewGoodsReceiveNotePage() {
  return <GrnForm />;
}

export const Component = NewGoodsReceiveNotePage;
