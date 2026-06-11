import { useParams } from "react-router";
import { EditCuisineContent } from "./_content";

/** หน้าแก้ไข Cuisine — id มาจาก route param (เดิม: Next params Promise) */
export default function EditCuisinePage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditCuisineContent id={id} />;
}

export const Component = EditCuisinePage;
