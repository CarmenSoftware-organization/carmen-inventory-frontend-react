import { useParams } from "react-router";
import { PcEditContent } from "./pc-edit-content";

/** หน้าแก้ไข Physical Count — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PcEditContent id={id} />;
}
