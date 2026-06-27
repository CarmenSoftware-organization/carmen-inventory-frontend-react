import { useParams } from "react-router";
import { EditPhysicalCountContent } from "./edit-physical-count-content";

/** หน้าแก้ไข Physical Count — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditPhysicalCountContent id={id} />;
}
