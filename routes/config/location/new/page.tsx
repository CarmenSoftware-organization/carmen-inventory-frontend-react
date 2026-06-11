import { LocationForm } from "../_components/location-form";

/**
 * หน้าสร้าง Location ใหม่
 *
 * Server Component ตั้ง metadata title แล้ว render `LocationForm`
 * ในโหมด add (ไม่ส่ง prop `location`)
 *
 * @returns React element ของฟอร์มสร้าง Location
 * @example
 * ```tsx
 * // route: /config/location/new
 * <NewLocationPage />
 * ```
 */
export default function NewLocationPage() {
  return <LocationForm />;
}

export const Component = NewLocationPage;
