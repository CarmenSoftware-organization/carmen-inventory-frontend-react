import { useParams } from "react-router";
import { EditRoleContent } from "./_content";

/** หน้าแก้ไข Role — id มาจาก route param (เดิม: Next params Promise) */
export default function EditRolePage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditRoleContent id={id} />;
}

export const Component = EditRolePage;
