import { useParams } from "react-router";
import { EditDepartmentContent } from "./_content";

/** หน้าแก้ไข Department — id มาจาก route param (เดิม: Next params Promise) */
export default function EditDepartmentPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditDepartmentContent id={id} />;
}

export const Component = EditDepartmentPage;
