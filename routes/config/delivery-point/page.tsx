import DeliveryPointComponent from "./_components/delivery-point-component";

/**
 * หน้ารายการ Delivery Point ของโมดูล Configuration ใช้เป็น route entry point
 * @returns React element ของหน้ารายการ Delivery Point
 * @example
 * // route: /config/delivery-point
 * export default function DeliveryPointPage()
 */
export default function DeliveryPointPage() {
  return <DeliveryPointComponent />;
}

export const Component = DeliveryPointPage;
