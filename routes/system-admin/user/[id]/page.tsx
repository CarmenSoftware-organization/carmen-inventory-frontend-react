import { useParams } from "react-router";
import { UserDetailContent } from "./_content";

/** หน้ารายละเอียด User — id มาจาก route param (เดิม: Next params Promise) */
export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <UserDetailContent id={id} />;
}

export const Component = UserDetailPage;
