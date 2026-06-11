import { useParams } from "react-router";
import { EditPurchaseOrderContent } from "./_content";

/** หน้าแก้ไข Purchase Order — id มาจาก route param (เดิม: Next params Promise) */
export default function EditPurchaseOrderPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditPurchaseOrderContent id={id} />;
}

export const Component = EditPurchaseOrderPage;
