import { useParams } from "react-router";
import { EditEquipmentContent } from "./_content";

/** หน้าแก้ไข Equipment — id มาจาก route param (เดิม: Next params Promise) */
export default function EditEquipmentPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditEquipmentContent id={id} />;
}

export const Component = EditEquipmentPage;
