import { useParams } from "react-router";
import { PrEditContent } from "./pr-edit-content";

/** หน้าแก้ไข Purchase Request — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PrEditContent id={id} />;
}
