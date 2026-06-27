import { useParams } from "react-router";
import { EditPurchaseOrderContent } from "./edit-purchase-order-content";

/** หน้าแก้ไข Purchase Order — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditPurchaseOrderContent id={id} />;
}
