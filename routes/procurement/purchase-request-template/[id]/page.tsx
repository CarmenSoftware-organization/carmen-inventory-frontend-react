import { useParams } from "react-router";
import { EditPurchaseRequestTemplateContent } from "./_content";

/** หน้าแก้ไข Purchase Request Template — id มาจาก route param (เดิม: Next params Promise) */
export default function EditPurchaseRequestTemplatePage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditPurchaseRequestTemplateContent id={id} />;
}

export const Component = EditPurchaseRequestTemplatePage;
