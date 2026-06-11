import { useParams } from "react-router";
import { EditRequestPriceListContent } from "./_content";

/**
 * หน้าแก้ไข request price list (RFP) ตาม id ใน URL
 * id มาจาก route param (เดิม: Next params Promise) แล้วส่งให้ EditRequestPriceListContent
 * ซึ่งดึงข้อมูล RFP และ render RequestPriceListForm ในโหมด view/edit
 */
export default function EditRequestPriceListPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditRequestPriceListContent id={id} />;
}

export const Component = EditRequestPriceListPage;
