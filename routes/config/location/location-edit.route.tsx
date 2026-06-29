import { useParams } from "react-router";
import { EditLocationContent } from "./edit-location-content";

/** หน้าแก้ไข Location — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditLocationContent id={id} />;
}
