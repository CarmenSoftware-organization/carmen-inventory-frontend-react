import { useParams } from "react-router";
import { EditPriceListContent } from "./_content";

/** หน้าแก้ไข Price List — id มาจาก route param (เดิม: Next params Promise) */
export default function EditPriceListPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditPriceListContent id={id} />;
}

export const Component = EditPriceListPage;
