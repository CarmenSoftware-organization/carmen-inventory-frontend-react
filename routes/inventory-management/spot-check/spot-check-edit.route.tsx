import { useParams } from "react-router";
import { EditSpotCheckContent } from "./edit-spot-check-content";

/** หน้าแก้ไข Spot Check — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditSpotCheckContent id={id} />;
}
