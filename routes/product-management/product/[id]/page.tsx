import { useParams } from "react-router";
import { EditProductContent } from "./_content";

/** หน้าแก้ไขสินค้า — id มาจาก route param (เดิม: Next params Promise) */
export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditProductContent id={id} />;
}

export const Component = EditProductPage;
