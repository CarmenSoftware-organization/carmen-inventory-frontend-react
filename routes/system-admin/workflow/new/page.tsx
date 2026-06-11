import WorkflowNewForm from "../_components/wf-new-form";

/**
 * หน้าสร้าง Workflow ใหม่
 * @returns JSX element ของหน้าสร้าง Workflow
 * @example
 * // ใช้เป็น Next.js route: /system-admin/workflow/new
 * <NewWorkflowPage />
 */
export default function NewWorkflowPage() {
  return <WorkflowNewForm />;
}

export const Component = NewWorkflowPage;
