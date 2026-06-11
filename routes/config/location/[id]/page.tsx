import { useParams } from "react-router";
import { EditLocationContent } from "./_content";

/** หน้าแก้ไข Location — id มาจาก route param (เดิม: Next params Promise) */
export default function EditLocationPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditLocationContent id={id} />;
}

export const Component = EditLocationPage;
