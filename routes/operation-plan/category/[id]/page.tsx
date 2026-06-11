import { useParams } from "react-router";
import { EditRecipeCategoryContent } from "./_content";

/** หน้าแก้ไข Recipe Category — id มาจาก route param (เดิม: Next params Promise) */
export default function EditRecipeCategoryPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditRecipeCategoryContent id={id} />;
}

export const Component = EditRecipeCategoryPage;
