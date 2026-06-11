import { useParams } from "react-router";
import { EditCreditNoteContent } from "./_content";

/** หน้าแก้ไข Credit Note — id มาจาก route param (เดิม: Next params Promise) */
export default function EditCreditNotePage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditCreditNoteContent id={id} />;
}

export const Component = EditCreditNotePage;
