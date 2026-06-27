import { useParams } from "react-router";
import { EditGoodsReceiveNoteContent } from "./edit-goods-receive-note-content";

/** หน้าแก้ไข Goods Receive Note — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditGoodsReceiveNoteContent id={id} />;
}
