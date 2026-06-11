import LocationComponent from "./_components/location-component";

/**
 * หน้ารายการ Location ของโมดูล Configuration
 *
 * Server Component ตั้ง metadata title แล้ว render `LocationComponent`
 * (client component) ที่ใช้ `ConfigListTemplate` แบบ page-based
 *
 * @returns React element ของหน้ารายการ Location
 * @example
 * ```tsx
 * // route: /config/location
 * <LocationPage />
 * ```
 */
export default function LocationPage() {
  return <LocationComponent />;
}

export const Component = LocationPage;
