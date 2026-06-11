import { useParams } from "react-router";
import { EditWastageReportContent } from "./_content";

/** หน้าแก้ไข Wastage Report — id มาจาก route param (เดิม: Next params Promise) */
export default function EditWastageReportPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditWastageReportContent id={id} />;
}

export const Component = EditWastageReportPage;
