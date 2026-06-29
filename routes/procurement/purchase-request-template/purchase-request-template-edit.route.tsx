import { useParams } from "react-router";
import { EditPurchaseRequestTemplateContent } from "./edit-purchase-request-template-content";

/** หน้าแก้ไข Purchase Request Template — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditPurchaseRequestTemplateContent id={id} />;
}
