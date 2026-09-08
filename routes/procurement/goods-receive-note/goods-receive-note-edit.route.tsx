import { useParams } from "react-router";
import { GrnEditContent } from "./grn-edit-content";

/** หน้าแก้ไข Goods Receive Note — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <GrnEditContent id={id} />;
}
