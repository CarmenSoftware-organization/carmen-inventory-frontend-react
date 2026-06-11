import GrnComponent from "./_components/grn-component";

/**
 * หน้ารายการใบรับสินค้า (Goods Receive Note)
 * route: /procurement/goods-receive-note
 * render GrnComponent ที่จัดการ list/filter/pagination ทั้งหมด
 *
 * @returns React element ของหน้ารายการ GRN
 * @example
 * // Next.js App Router auto-registers this file
 * // Accessed via URL: /procurement/goods-receive-note
 */
export default function GoodsReceiveNotePage() {
  return <GrnComponent />;
}

export const Component = GoodsReceiveNotePage;
