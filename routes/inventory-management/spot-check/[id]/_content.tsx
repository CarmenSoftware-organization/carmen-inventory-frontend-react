
import { ScEntryComponent } from "../_components/sc-entry-component";

/**
 * หน้า detail ของ Spot Check ตาม id (entry mode)
 * UX/UI เลียน physical-count entry — header glass card + search/filter + items + sticky bar
 *
 * @param props - { id } จาก route param ที่ unwrap แล้ว
 */
export function EditSpotCheckContent({ id }: Readonly<{ id: string }>) {
  return <ScEntryComponent spotCheckId={id} />;
}
