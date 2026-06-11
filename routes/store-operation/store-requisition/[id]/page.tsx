import { useParams } from "react-router";
import { EditStoreRequisitionContent } from "./_content";

/** หน้าแก้ไข Store Requisition — id มาจาก route param (เดิม: Next params Promise) */
export default function EditStoreRequisitionPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditStoreRequisitionContent id={id} />;
}

export const Component = EditStoreRequisitionPage;
