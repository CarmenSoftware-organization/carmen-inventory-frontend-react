import { useParams } from "react-router";
import { EditPurchaseRequestContent } from "./edit-purchase-request-content";

/** หน้าแก้ไข Purchase Request — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditPurchaseRequestContent id={id} />;
}
