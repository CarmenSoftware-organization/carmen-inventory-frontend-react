import { useParams } from "react-router";
import { NotiTmplDetailContent } from "./_content";

/** หน้ารายละเอียด Notification Template — id มาจาก route param (เดิม: Next params Promise) */
export default function NotificationTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <NotiTmplDetailContent id={id} />;
}

export const Component = NotificationTemplateDetailPage;
