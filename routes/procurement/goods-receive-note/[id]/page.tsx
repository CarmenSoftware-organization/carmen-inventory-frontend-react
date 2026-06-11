import { useParams } from "react-router";
import { EditGoodsReceiveNoteContent } from "./_content";

/** หน้าแก้ไข Goods Receive Note — id มาจาก route param (เดิม: Next params Promise) */
export default function EditGoodsReceiveNotePage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditGoodsReceiveNoteContent id={id} />;
}

export const Component = EditGoodsReceiveNotePage;
