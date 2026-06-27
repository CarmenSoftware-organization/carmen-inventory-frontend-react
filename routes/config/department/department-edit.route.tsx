import { useParams } from "react-router";
import { EditDepartmentContent } from "./edit-department-content";

/** หน้าแก้ไข Department — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditDepartmentContent id={id} />;
}
