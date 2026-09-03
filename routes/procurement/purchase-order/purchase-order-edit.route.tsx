import { useParams } from "react-router";
import { PoEditContent } from "./po-edit-content";

/** หน้าแก้ไข Purchase Order — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PoEditContent id={id} />;
}
