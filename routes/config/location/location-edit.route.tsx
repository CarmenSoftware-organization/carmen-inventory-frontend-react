import { useParams } from "react-router";
import { LocationEditContent } from "./location-edit-content";

/** หน้าแก้ไข Location — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <LocationEditContent id={id} />;
}
