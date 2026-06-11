import { useParams } from "react-router";
import { EditVendorContent } from "./_content";

/** หน้าแก้ไข Vendor — id มาจาก route param (เดิม: Next params Promise) */
export default function EditVendorPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditVendorContent id={id} />;
}

export const Component = EditVendorPage;
