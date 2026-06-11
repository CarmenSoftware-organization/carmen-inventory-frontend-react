import { useParams } from "react-router";
import { EditPurchaseRequestContent } from "./_content";

/** หน้าแก้ไข Purchase Request — id มาจาก route param (เดิม: Next params Promise) */
export default function EditPurchaseRequestPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditPurchaseRequestContent id={id} />;
}

export const Component = EditPurchaseRequestPage;
