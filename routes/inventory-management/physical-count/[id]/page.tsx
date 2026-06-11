import { useParams } from "react-router";
import { EditPhysicalCountContent } from "./_content";

/** หน้าแก้ไข Physical Count — id มาจาก route param (เดิม: Next params Promise) */
export default function EditPhysicalCountPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditPhysicalCountContent id={id} />;
}

export const Component = EditPhysicalCountPage;
