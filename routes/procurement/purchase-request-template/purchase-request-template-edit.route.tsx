import { useParams } from "react-router";
import { PrtEditContent } from "./prt-edit-content";

/** หน้าแก้ไข Purchase Request Template — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PrtEditContent id={id} />;
}
