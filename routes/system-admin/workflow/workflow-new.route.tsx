import { Navigate, useSearchParams } from "react-router";
import WorkflowNewForm from "./wf-new-form";
import {
  WORKFLOW_DOC_TYPES,
  WORKFLOW_TYPE_BY_DOC_TYPE,
  type WorkflowDocType,
} from "@/hooks/use-workflow";

export function Component() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("type") as WorkflowDocType | null;
  const docType = WORKFLOW_DOC_TYPES.find((t) => t === slug);

  // มี type มาแต่สะกดไม่ตรงสักชนิด = URL ถูกแก้มือ ไม่ใช่ flow ของปุ่ม New —
  // ห้ามเดาให้ ไม่งั้นได้ฟอร์มที่ล็อกชนิดผิดหรือเลือกชนิดเองได้ทั้งที่ไม่ควร
  // (ไม่มี type เลย = ตั้งใจเข้ามาสร้างแบบเลือกชนิดเอง ปล่อยผ่าน)
  if (slug && !docType)
    return <Navigate to="/system-admin/workflow/purchase-request" replace />;

  return (
    <WorkflowNewForm
      lockedType={docType ? WORKFLOW_TYPE_BY_DOC_TYPE[docType] : undefined}
    />
  );
}
