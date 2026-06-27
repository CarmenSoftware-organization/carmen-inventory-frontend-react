import { useTranslations } from "use-intl";
import { useAllUsers } from "@/hooks/use-all-users";
import { useDepartment } from "@/hooks/use-department";
import { useWorkflowTypeQuery } from "@/hooks/use-workflow";
import { useProfile } from "@/hooks/use-profile";
import { getUserFullName } from "@/components/lookup/lookup-user";
import { formatDate } from "@/lib/date-utils";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { PURCHASE_REQUEST_STATUS_OPTIONS } from "@/constant/purchase-request";
import type { ActiveFilter } from "@/components/ui/active-filter-bar";

interface UsePrActiveFiltersArgs {
  filter: string;
  setFilter: (value: string) => void;
  stage: string;
  setStage: (value: string) => void;
  userId: string;
  setUserId: (value: string) => void;
  departmentId: string;
  setDepartmentId: (value: string) => void;
  workflowId: string;
  setWorkflowId: (value: string) => void;
  prDate: string;
  setPrDate: (value: string) => void;
}

/**
 * แปลง URL filter strings (status / stage / requester / department / workflow /
 * prDate) เป็น ActiveFilter badges พร้อม `onRemove` รายตัว และ `clearAllFilters`
 *
 * ดึงออกจาก `PurchaseRequestComponent` เพื่อลดขนาด component และแยก logic การ
 * parse filter ออกมาให้ทดสอบ/ดูแลแยกได้ — fetch lookup (users/departments/
 * workflows) ที่ใช้เฉพาะตรงนี้ไว้ภายใน hook เอง
 *
 * @param args - ค่า filter ปัจจุบันแต่ละช่อง พร้อม setter สำหรับลบทีละตัว
 * @returns `activeFilters` (badge list) และ `clearAllFilters`
 */
export function usePrActiveFilters({
  filter,
  setFilter,
  stage,
  setStage,
  userId,
  setUserId,
  departmentId,
  setDepartmentId,
  workflowId,
  setWorkflowId,
  prDate,
  setPrDate,
}: UsePrActiveFiltersArgs): {
  activeFilters: ActiveFilter[];
  clearAllFilters: () => void;
} {
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();
  const { data: allUsers = [] } = useAllUsers();
  const { data: departmentsData } = useDepartment({ perpage: -1 });
  const { data: workflows = [] } = useWorkflowTypeQuery(WORKFLOW_TYPE.PR);
  const departments = departmentsData?.data ?? [];

  // Parse active filters
  const selectedUserIds = userId?.includes("requester_id|string:")
    ? (userId.split("requester_id|string:")[1] || "").split(",").filter(Boolean)
    : [];

  const selectedUserNames = selectedUserIds
    .map((id) => {
      const user = allUsers.find((u) => u.user_id === id);
      return user ? getUserFullName(user) : null;
    })
    .filter(Boolean);

  const selectedDepartmentIds = departmentId?.includes("department_id|string:")
    ? (departmentId.split("department_id|string:")[1] || "")
        .split(",")
        .filter(Boolean)
    : [];

  const selectedDepartmentNames = selectedDepartmentIds
    .map((id) => {
      const dept = departments.find((d) => d.id === id);
      return dept ? dept.name : null;
    })
    .filter(Boolean);

  const selectedStages = stage?.includes("workflow_current_stage|string:")
    ? (stage.split("workflow_current_stage|string:")[1] || "")
        .split(",")
        .filter(Boolean)
    : [];

  const selectedWorkflowIds = workflowId?.includes("workflow_id|string:")
    ? (workflowId.split("workflow_id|string:")[1] || "")
        .split(",")
        .filter(Boolean)
    : [];

  const selectedWorkflowNames = selectedWorkflowIds
    .map((id) => {
      const wf = workflows.find((w) => w.id === id);
      return wf ? wf.name : null;
    })
    .filter(Boolean);

  const selectedStatuses = filter?.startsWith("pr_status|string:")
    ? filter.slice("pr_status|string:".length).split(",").filter(Boolean)
    : [];

  const selectedStatusLabels = selectedStatuses
    .map((key) => {
      const opt = PURCHASE_REQUEST_STATUS_OPTIONS.find(
        (o) => o.value === `pr_status|string:${key}`,
      );
      return opt?.label ?? null;
    })
    .filter(Boolean);

  const dateFilterLabel = (() => {
    if (!prDate) return null;
    const rangeMatch = /pr_date\|date_range:(.+),(.+)/.exec(prDate);
    if (rangeMatch) {
      return `${tfl("prDate")}: ${formatDate(rangeMatch[1], dateFormat)} - ${formatDate(rangeMatch[2], dateFormat)}`;
    }
    return null;
  })();

  const clearAllFilters = () => {
    setFilter("");
    setStage("");
    setUserId("");
    setDepartmentId("");
    setWorkflowId("");
    setPrDate("");
  };

  const buildMultiBadges = (
    keys: string[],
    labels: (string | null)[],
    prefix: string,
    fieldPrefix: string,
    setter: (v: string) => void,
  ): ActiveFilter[] =>
    labels
      .map((label, i) =>
        label
          ? {
              key: `${prefix}-${keys[i]}`,
              label,
              onRemove: () => {
                const next = keys.filter((_, j) => j !== i);
                setter(
                  next.length > 0 ? `${fieldPrefix}${next.join(",")}` : "",
                );
              },
            }
          : null,
      )
      .filter(Boolean) as ActiveFilter[];

  const activeFilters: ActiveFilter[] = [
    ...buildMultiBadges(
      selectedStatuses,
      selectedStatusLabels,
      "status",
      "pr_status|string:",
      setFilter,
    ),
    ...buildMultiBadges(
      selectedStages,
      selectedStages,
      "stage",
      "workflow_current_stage|string:",
      setStage,
    ),
    ...buildMultiBadges(
      selectedUserIds,
      selectedUserNames,
      "user",
      "requester_id|string:",
      setUserId,
    ),
    ...buildMultiBadges(
      selectedDepartmentIds,
      selectedDepartmentNames,
      "dept",
      "department_id|string:",
      setDepartmentId,
    ),
    ...buildMultiBadges(
      selectedWorkflowIds,
      selectedWorkflowNames,
      "workflow",
      "workflow_id|string:",
      setWorkflowId,
    ),
    ...(dateFilterLabel
      ? [
          {
            key: "prDate",
            label: dateFilterLabel,
            onRemove: () => setPrDate(""),
          },
        ]
      : []),
  ];

  return { activeFilters, clearAllFilters };
}
