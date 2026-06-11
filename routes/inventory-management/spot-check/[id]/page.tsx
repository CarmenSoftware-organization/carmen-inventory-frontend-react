import { useParams } from "react-router";
import { EditSpotCheckContent } from "./_content";

/** หน้าแก้ไข Spot Check — id มาจาก route param (เดิม: Next params Promise) */
export default function EditSpotCheckPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditSpotCheckContent id={id} />;
}

export const Component = EditSpotCheckPage;
