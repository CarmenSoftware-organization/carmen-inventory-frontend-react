import { useParams } from "react-router";
import { EditWorkflowContent } from "./_content";

/** หน้าแก้ไข Workflow — id มาจาก route param (เดิม: Next params Promise) */
export default function EditWorkflowPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditWorkflowContent id={id} />;
}

export const Component = EditWorkflowPage;
