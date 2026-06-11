import WorkflowComponent from "./_components/wf-component";

/**
 * หน้ารายการ Workflow สำหรับผู้ดูแลระบบ
 * @returns JSX element ของหน้า Workflow list
 * @example
 * // ใช้เป็น Next.js route: /system-admin/workflow
 * <WorkflowPage />
 */
export default function WorkflowPage() {
  return <WorkflowComponent />;
}

export const Component = WorkflowPage;
