import WrComponent from "./_components/wr-component";

/**
 * หน้ารายการรายงานของเสีย (Wastage Reporting)
 * Route entry ของ /store-operation/wastage-reporting render WrComponent
 *
 * @returns คอมโพเนนต์หน้ารายการ WR
 * @example
 * // เข้าถึงผ่าน URL: /store-operation/wastage-reporting
 * export default WastageReportingPage;
 */
export default function WastageReportingPage() {
  return <WrComponent />;
}

export const Component = WastageReportingPage;
