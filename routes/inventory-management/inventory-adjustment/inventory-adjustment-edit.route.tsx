import { useParams } from "react-router";
import { EditInventoryAdjustmentContent } from "./edit-inventory-adjustment-content";

/** หน้าแก้ไข Inventory Adjustment — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditInventoryAdjustmentContent id={id} />;
}
