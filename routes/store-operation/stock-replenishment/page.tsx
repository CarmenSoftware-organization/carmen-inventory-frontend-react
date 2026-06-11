import StockReplComponent from "./_components/stock-repl-component";

/**
 * หน้า Stock Replenishment (เติมสต็อก) แสดงคอมโพเนนต์หลัก
 * Route entry ของ /store-operation/stock-replenishment render StockReplComponent
 *
 * @returns คอมโพเนนต์หน้า stock replenishment
 * @example
 * // เข้าถึงผ่าน URL: /store-operation/stock-replenishment
 * export default StockReplenishmentPage;
 */
export default function StockReplenishmentPage() {
  return <StockReplComponent />;
}

export const Component = StockReplenishmentPage;
