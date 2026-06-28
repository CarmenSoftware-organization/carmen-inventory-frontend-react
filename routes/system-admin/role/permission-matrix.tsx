import { useTranslations } from "use-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { usePermission } from "@/hooks/use-permission";
import EmptyComponent from "@/components/empty-component";

/**
 * แปลงสถานะ all/some ให้เป็นค่าของ Checkbox (true, false, indeterminate)
 * @param all - true ถ้าเลือกทั้งหมด
 * @param some - true ถ้าเลือกบางส่วน
 * @returns สถานะของ Checkbox (true, false หรือ "indeterminate")
 * @example
 * getCheckedState(false, true); // "indeterminate"
 */
const getCheckedState = (
  all: boolean,
  some: boolean,
): boolean | "indeterminate" => {
  if (all) return true;
  if (some) return "indeterminate";
  return false;
};

const ALL_ACTIONS = [
  "view",
  "view_department",
  "view_all",
  "create",
  "update",
  "delete",
  "execute",
] as const;

const ACTION_LABELS: Record<string, string> = {
  view: "View",
  view_department: "View Dept",
  view_all: "View All",
  create: "Create",
  update: "Update",
  delete: "Delete",
  execute: "Execute",
};

const CATEGORY_LABELS: Record<string, string> = {
  configuration: "Configuration",
  product_management: "Product Management",
  vendor_management: "Vendor Management",
  procurement: "Procurement",
  inventory_management: "Inventory Management",
};

interface GroupedResource {
  resource: string;
  resourceLabel: string;
  actions: Map<string, string>;
}

interface PermissionGroup {
  category: string;
  categoryLabel: string;
  resources: GroupedResource[];
}

interface PermissionMatrixProps {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

/**
 * ตาราง Matrix สำหรับเลือกสิทธิ์ (permissions) ของ Role แบ่งตาม category และ action
 * @param props - อาร์เรย์ value ของ permission id ที่เลือก, callback onChange และ disabled
 * @returns JSX element ของตาราง Permission Matrix
 * @example
 * <PermissionMatrix value={selected} onChange={setSelected} disabled={isView} />
 */
export function PermissionMatrix({
  value,
  onChange,
  disabled,
}: PermissionMatrixProps) {
  const t = useTranslations("systemAdmin.role");
  const { data: permData } = usePermission({ perpage: -1 });
  const permissions = permData?.data ?? [];

  const categoryMap = new Map<string, Map<string, Map<string, string>>>();

  for (const perm of permissions) {
    const dotIndex = perm.resource.indexOf(".");
    if (dotIndex === -1) continue;
    const category = perm.resource.substring(0, dotIndex);
    const resourceName = perm.resource.substring(dotIndex + 1);

    if (!categoryMap.has(category)) categoryMap.set(category, new Map());
    const resMap = categoryMap.get(category)!;
    if (!resMap.has(resourceName)) resMap.set(resourceName, new Map());
    resMap.get(resourceName)!.set(perm.action, perm.id);
  }

  const grouped: PermissionGroup[] = [];
  const allPermissionIds: string[] = [];
  for (const [category, resources] of categoryMap) {
    const group: PermissionGroup = {
      category,
      categoryLabel: CATEGORY_LABELS[category] ?? category,
      resources: [],
    };
    for (const [resource, actions] of resources) {
      group.resources.push({
        resource: `${category}.${resource}`,
        resourceLabel: resource
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        actions,
      });
      for (const id of actions.values()) allPermissionIds.push(id);
    }
    grouped.push(group);
  }

  const selectedSet = new Set(value);

  const allChecked =
    allPermissionIds.length > 0 &&
    allPermissionIds.every((id) => selectedSet.has(id));
  const someChecked = allPermissionIds.some((id) => selectedSet.has(id));

  const getActionPermissionIds = (action: string): string[] => {
    const ids: string[] = [];
    for (const g of grouped) {
      for (const resource of g.resources) {
        const id = resource.actions.get(action);
        if (id) ids.push(id);
      }
    }
    return ids;
  };

  const getCategoryPermissionIds = (g: PermissionGroup): string[] => {
    const ids: string[] = [];
    for (const resource of g.resources) {
      for (const [, id] of resource.actions) {
        ids.push(id);
      }
    }
    return ids;
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      const newIds = new Set(value);
      for (const id of allPermissionIds) newIds.add(id);
      onChange(Array.from(newIds));
    } else {
      const removeSet = new Set(allPermissionIds);
      onChange(value.filter((id) => !removeSet.has(id)));
    }
  };

  const handleToggleAction = (action: string, checked: boolean) => {
    const actionIds = getActionPermissionIds(action);
    if (checked) {
      const newIds = new Set(value);
      for (const id of actionIds) newIds.add(id);
      onChange(Array.from(newIds));
    } else {
      const removeSet = new Set(actionIds);
      onChange(value.filter((id) => !removeSet.has(id)));
    }
  };

  const handleToggleCategory = (g: PermissionGroup, checked: boolean) => {
    const categoryIds = getCategoryPermissionIds(g);
    if (checked) {
      const newIds = new Set(value);
      for (const id of categoryIds) newIds.add(id);
      onChange(Array.from(newIds));
    } else {
      const removeSet = new Set(categoryIds);
      onChange(value.filter((id) => !removeSet.has(id)));
    }
  };

  if (permissions.length === 0) {
    return (
      <EmptyComponent
        title={t("noPermissions")}
        description={t("noPermissionsDesc")}
      />
    );
  }

  return (
    <div className="max-h-[70vh] overflow-auto rounded-md border">
      <table className="w-full border-separate border-spacing-0 text-xs">
        <thead className="bg-muted sticky top-0 z-10">
          <tr className="bg-muted/60 text-foreground border-b">
            <th className="min-w-45 p-2 text-left font-semibold">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={getCheckedState(allChecked, someChecked)}
                  onCheckedChange={(val) => handleToggleAll(!!val)}
                  disabled={disabled}
                  aria-label="Select all permissions"
                />
                <span>Resource</span>
              </div>
            </th>
            {ALL_ACTIONS.map((action) => {
              const actionIds = getActionPermissionIds(action);
              const actionAllChecked =
                actionIds.length > 0 &&
                actionIds.every((id) => selectedSet.has(id));
              const actionSomeChecked = actionIds.some((id) =>
                selectedSet.has(id),
              );
              return (
                <th key={action} className="w-20 p-2 text-center font-semibold">
                  <div className="flex flex-col items-center gap-1">
                    <span>{ACTION_LABELS[action]}</span>
                    <Checkbox
                      checked={getCheckedState(
                        actionAllChecked,
                        actionSomeChecked,
                      )}
                      onCheckedChange={(val) =>
                        handleToggleAction(action, !!val)
                      }
                      disabled={disabled}
                      aria-label={`Select all ${ACTION_LABELS[action]}`}
                    />
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {grouped.map((group) => (
            <PermissionGroupRows
              key={group.category}
              group={group}
              selectedSet={selectedSet}
              disabled={disabled}
              onToggle={(permissionId, checked) => {
                if (checked) {
                  onChange([...value, permissionId]);
                } else {
                  onChange(value.filter((id) => id !== permissionId));
                }
              }}
              onToggleCategory={(checked) =>
                handleToggleCategory(group, checked)
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PermissionGroupRowsProps {
  group: PermissionGroup;
  selectedSet: Set<string>;
  disabled?: boolean;
  onToggle: (permissionId: string, checked: boolean) => void;
  onToggleCategory: (checked: boolean) => void;
}

const PermissionGroupRows = ({
  group,
  selectedSet,
  disabled,
  onToggle,
  onToggleCategory,
}: PermissionGroupRowsProps) => {
  const categoryIds: string[] = [];
  for (const resource of group.resources) {
    for (const [, id] of resource.actions) {
      categoryIds.push(id);
    }
  }
  const catAllChecked =
    categoryIds.length > 0 && categoryIds.every((id) => selectedSet.has(id));
  const catSomeChecked = categoryIds.some((id) => selectedSet.has(id));

  return (
    <>
      <tr className="bg-muted/50">
        <td
          colSpan={ALL_ACTIONS.length + 1}
          className="p-2 text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <Checkbox
              checked={getCheckedState(catAllChecked, catSomeChecked)}
              onCheckedChange={(val) => onToggleCategory(!!val)}
              disabled={disabled}
              aria-label={`Select all ${group.categoryLabel}`}
            />
            {group.categoryLabel}
          </div>
        </td>
      </tr>
      {group.resources.map((resource) => (
        <tr key={resource.resource} className="border-b">
          <td className="p-2 pl-4">{resource.resourceLabel}</td>
          {ALL_ACTIONS.map((action) => {
            const permissionId = resource.actions.get(action);
            if (!permissionId) {
              return (
                <td
                  key={action}
                  className="text-muted-foreground p-2 text-center"
                >
                  —
                </td>
              );
            }
            return (
              <td key={action} className="p-2 text-center">
                <Checkbox
                  checked={selectedSet.has(permissionId)}
                  onCheckedChange={(val) => onToggle(permissionId, !!val)}
                  disabled={disabled}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
};
