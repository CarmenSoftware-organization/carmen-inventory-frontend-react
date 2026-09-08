import { useParams } from "react-router";
import { CnEditContent } from "./cn-edit-content";

/** หน้าแก้ไข Credit Note — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <CnEditContent id={id} />;
}
