import ExtraCostComponent from "./_components/extra-cost-component";

/**
 * หน้ารายการ Extra Cost ของโมดูล Configuration ใช้เป็น route entry point
 * @returns React element ของหน้ารายการ Extra Cost
 * @example
 * // route: /config/extra-cost
 * export default function ExtraCostPage()
 */
export default function ExtraCostPage() {
  return <ExtraCostComponent />;
}

export const Component = ExtraCostPage;
