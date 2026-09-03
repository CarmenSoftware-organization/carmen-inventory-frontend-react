import { useParams } from "react-router";
import { IaEditContent } from "./ia-edit-content";

/** หน้าแก้ไข Inventory Adjustment — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <IaEditContent id={id} />;
}
