import { useParams } from "react-router";
import { EditCreditNoteContent } from "./edit-credit-note-content";

/** หน้าแก้ไข Credit Note — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditCreditNoteContent id={id} />;
}
