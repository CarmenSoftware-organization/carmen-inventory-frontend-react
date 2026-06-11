import { useParams } from "react-router";
import { EditPriceListTemplateContent } from "./_content";

/** หน้าแก้ไข Price List Template — id มาจาก route param (เดิม: Next params Promise) */
export default function EditPriceListTemplatePage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditPriceListTemplateContent id={id} />;
}

export const Component = EditPriceListTemplatePage;
