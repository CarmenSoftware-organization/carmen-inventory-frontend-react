import { useParams } from "react-router";
import { EditInventoryAdjustmentContent } from "./_content";

/** หน้าแก้ไข Inventory Adjustment — id มาจาก route param (เดิม: Next params Promise) */
export default function EditInventoryAdjustmentPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditInventoryAdjustmentContent id={id} />;
}

export const Component = EditInventoryAdjustmentPage;
