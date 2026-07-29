import type { ReactNode } from "react";
import { AccessDeniedBlock } from "@/components/route-guard";
import { FormSkeleton } from "@/components/loader/form-skeleton";
import { useCreatableWorkflows } from "@/hooks/use-workflow";
import type { WORKFLOW_TYPE } from "@/types/workflows";

interface CreateWorkflowGateProps {
  readonly workflowType: WORKFLOW_TYPE;
  /** เหตุผลที่สร้างไม่ได้ ในภาษาของโมดูลนั้น */
  readonly description: string;
  readonly children: ReactNode;
}

/**
 * บล็อกหน้าสร้างเอกสารเมื่อผู้ใช้ไม่มี workflow ให้เริ่มสักตัว
 *
 * backend ส่ง `can_create` มากับ workflow แต่ละตัว ถ้า false หมดแปลว่าคนนี้เปิด
 * เอกสารประเภทนี้ไม่ได้เลย — กรอกไปก็ส่งไม่ได้ จึงบอกตั้งแต่เข้าหน้า ไม่ปล่อยให้
 * กรอกจนจบแล้วค่อยเด้ง error (ยังเข้าถึงหน้าได้จาก deep link / bookmark / back)
 *
 * ระหว่างรอ workflow list ยังโชว์ skeleton — ไม่งั้นหน้าจะกระพริบทุกครั้งที่เข้า
 *
 * @example
 * <CreateWorkflowGate workflowType={WORKFLOW_TYPE.PO} description={t("noCreatableWorkflow")}>
 *   <PoForm />
 * </CreateWorkflowGate>
 */
export function CreateWorkflowGate({
  workflowType,
  description,
  children,
}: CreateWorkflowGateProps) {
  const { canCreate, isLoading } = useCreatableWorkflows(workflowType);

  if (isLoading) return <FormSkeleton />;
  if (!canCreate) return <AccessDeniedBlock description={description} />;
  return <>{children}</>;
}
