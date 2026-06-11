import { useParams } from "react-router";
import { EditRecipeContent } from "./_content";

/** หน้าแก้ไข Recipe — id มาจาก route param (เดิม: Next params Promise) */
export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditRecipeContent id={id} />;
}

export const Component = EditRecipePage;
