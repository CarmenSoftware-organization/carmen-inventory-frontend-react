import BusinessTypeComponent from "./_components/business-type-component";

/**
 * หน้ารายการ Business Type ของโมดูล Configuration ใช้เป็น route entry point
 * @returns React element ของหน้ารายการ Business Type
 * @example
 * // route: /config/business-type
 * export default function BusinessTypePage()
 */
export default function BusinessTypePage() {
  return <BusinessTypeComponent />;
}

export const Component = BusinessTypePage;
