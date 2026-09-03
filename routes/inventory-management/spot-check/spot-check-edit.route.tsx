import { useParams } from "react-router";
import { ScEditContent } from "./sc-edit-content";

/** หน้าแก้ไข Spot Check — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <ScEditContent id={id} />;
}
