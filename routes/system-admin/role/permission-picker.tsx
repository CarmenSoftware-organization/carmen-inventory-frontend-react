import { useState } from "react";
import { useTranslations } from "use-intl";
import {
  ChefHat,
  Files,
  Handshake,
  KeySquare,
  LayoutDashboard,
  LayoutGrid,
  Package,
  Search,
  Settings2,
  Shield,
  ShoppingCart,
  Store,
  Warehouse,
  X,
  type LucideIcon,
} from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Toggle } from "@/components/ui/toggle";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/use-permission";
import { cn } from "@/lib/utils";
import { EmptyState } from "../shared/admin-ui";

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

const STANDARD_ACTIONS = ["view", "create", "update", "delete"] as const;
const EXTENDED_ACTIONS = [
  "view_department",
  "view_all",
  "execute",
  "commit",
  "manage_bu",
] as const;
/** ลำดับการเรียง action ในแต่ละแถว — CRUD ก่อน แล้วค่อย scope/workflow */
export const MAIN_ACTIONS = [...STANDARD_ACTIONS, ...EXTENDED_ACTIONS] as const;

export const ACTION_TKEY: Record<string, string> = {
  view: "actionView",
  view_department: "actionViewDept",
  view_all: "actionViewAll",
  create: "actionCreate",
  update: "actionUpdate",
  delete: "actionDelete",
  execute: "actionExecute",
  manage_bu: "actionManageBu",
  commit: "actionCommit",
};

interface CategoryMeta {
  readonly tkey: string;
  readonly icon: LucideIcon;
}

// ชื่อ/ไอคอนต้องตรงกับ sidebar (constant/module-list.ts) — wayfinding เดียวกันทั้งแอป
export const CATEGORY_META: Record<string, CategoryMeta> = {
  dashboard: { tkey: "catDashboard", icon: LayoutDashboard },
  configuration: { tkey: "catConfig", icon: Settings2 },
  product_management: { tkey: "catProduct", icon: Package },
  vendor_management: { tkey: "catVendor", icon: Handshake },
  procurement: { tkey: "catProcurement", icon: ShoppingCart },
  store_operations: { tkey: "catStoreOperations", icon: Store },
  inventory_management: { tkey: "catInventory", icon: Warehouse },
  operation_plan: { tkey: "catOperationPlan", icon: ChefHat },
  report: { tkey: "catReport", icon: Files },
  system_admin: { tkey: "catSystemAdmin", icon: Shield },
  widget: { tkey: "catWidget", icon: LayoutGrid },
};

const DEFAULT_CATEGORY_META: CategoryMeta = CATEGORY_META.configuration;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface GroupedResource {
  resource: string;
  resourceKey: string;
  resourceLabel: string;
  actions: Map<string, string>;
}

interface PermissionGroup {
  category: string;
  resources: GroupedResource[];
}

type FilterMode = "all" | "granted" | "missing";

interface PermissionPickerProps {
  readonly value: string[];
  readonly onChange: (ids: string[]) => void;
  readonly disabled?: boolean;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getCheckedState(
  all: boolean,
  some: boolean,
): boolean | "indeterminate" {
  if (all) return true;
  if (some) return "indeterminate";
  return false;
}

function getResourceIds(resource: GroupedResource): string[] {
  return Array.from(resource.actions.values());
}

function getCategoryIds(group: PermissionGroup): string[] {
  const ids: string[] = [];
  for (const r of group.resources) {
    for (const id of r.actions.values()) ids.push(id);
  }
  return ids;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export function PermissionPicker({
  value,
  onChange,
  disabled,
}: PermissionPickerProps) {
  const t = useTranslations("systemAdmin.role");
  const tc = useTranslations("common");
  const tRes = useTranslations("systemAdmin.role.resources");
  const { data: permData, isLoading } = usePermission({ perpage: -1 });
  const permissions = permData?.data ?? [];

  const permMap = new Map<string, Map<string, Map<string, string>>>();
  for (const perm of permissions) {
    const dot = perm.resource.indexOf(".");
    if (dot === -1) continue;
    const category = perm.resource.substring(0, dot);
    const resourceName = perm.resource.substring(dot + 1);
    if (!permMap.has(category)) permMap.set(category, new Map());
    const resMap = permMap.get(category)!;
    if (!resMap.has(resourceName)) resMap.set(resourceName, new Map());
    resMap.get(resourceName)!.set(perm.action, perm.id);
  }
  const grouped: PermissionGroup[] = [];
  for (const [category, resources] of permMap) {
    const group: PermissionGroup = { category, resources: [] };
    for (const [resource, actions] of resources) {
      group.resources.push({
        resource: `${category}.${resource}`,
        resourceKey: resource,
        resourceLabel: resource
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        actions,
      });
    }
    grouped.push(group);
  }

  const selectedSet = new Set(value);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const getCategoryMeta = (cat: string): CategoryMeta =>
    CATEGORY_META[cat] ?? DEFAULT_CATEGORY_META;
  const getCategoryLabel = (cat: string) => {
    const meta = CATEGORY_META[cat];
    return meta ? t(meta.tkey) : cat;
  };
  const getResourceLabel = (r: GroupedResource) =>
    tRes.has(r.resourceKey) ? tRes(r.resourceKey) : r.resourceLabel;

  const q = search.trim().toLowerCase();
  const filteredGroups = grouped
    .map((g) => {
      const catMatch = getCategoryLabel(g.category).toLowerCase().includes(q);
      const resources = g.resources.filter((r) => {
        const labelMatch =
          !q || catMatch || getResourceLabel(r).toLowerCase().includes(q);
        if (!labelMatch) return false;
        if (filterMode === "all") return true;
        const ids = getResourceIds(r);
        const selectedCount = ids.filter((id) => selectedSet.has(id)).length;
        if (filterMode === "granted") return selectedCount > 0;
        return selectedCount < ids.length;
      });
      return { ...g, resources };
    })
    .filter((g) => g.resources.length > 0);

  const addIds = (ids: string[]) => {
    const next = new Set(value);
    for (const id of ids) next.add(id);
    onChange(Array.from(next));
  };
  const removeIds = (ids: string[]) => {
    const set = new Set(ids);
    onChange(value.filter((id) => !set.has(id)));
  };
  const handleTogglePermission = (id: string, checked: boolean) => {
    if (checked) addIds([id]);
    else removeIds([id]);
  };
  const handleToggleResource = (r: GroupedResource, checked: boolean) => {
    const ids = getResourceIds(r);
    if (checked) addIds(ids);
    else removeIds(ids);
  };
  const handleToggleCategory = (g: PermissionGroup, checked: boolean) => {
    const ids = getCategoryIds(g);
    if (checked) addIds(ids);
    else removeIds(ids);
  };
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (permissions.length === 0) {
    return (
      <EmptyState
        icon={KeySquare}
        title={t("noPermissions")}
        desc={t("noPermissionsDesc")}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("filterResourcePlaceholder")}
            className="h-8 pr-9 pl-9 text-xs"
            aria-label={t("filterResourcePlaceholder")}
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={tc("clearSearch")}
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-1.5 -translate-y-1/2"
            >
              <X />
            </Button>
          )}
        </div>
        <div
          className="border-border/60 bg-muted/40 inline-flex items-center gap-0.5 rounded-full border p-0.5"
          role="tablist"
          aria-label={tc("filter")}
        >
          {(["all", "granted", "missing"] as FilterMode[]).map((m) => {
            const active = filterMode === m;
            const labelKey =
              m === "all"
                ? "showAll"
                : m === "granted"
                  ? "showGranted"
                  : "showMissing";
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilterMode(m)}
                className={cn(
                  "text-micro rounded-full px-2 py-1 font-semibold transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Matrices */}
      {filteredGroups.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("noMatch")}
          desc={t("noMatchDesc", { query: search })}
        />
      ) : (
        filteredGroups.map((group) => (
          <ModuleMatrix
            key={group.category}
            group={group}
            categoryLabel={getCategoryLabel(group.category)}
            categoryMeta={getCategoryMeta(group.category)}
            selectedSet={selectedSet}
            disabled={disabled}
            getResourceLabel={getResourceLabel}
            onToggleCategory={(c) => handleToggleCategory(group, c)}
            onToggleResource={handleToggleResource}
            onTogglePermission={handleTogglePermission}
          />
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ModuleMatrix — one matrix per category                              */
/* ------------------------------------------------------------------ */

interface ModuleMatrixProps {
  readonly group: PermissionGroup;
  readonly categoryLabel: string;
  readonly categoryMeta: CategoryMeta;
  readonly selectedSet: Set<string>;
  readonly disabled?: boolean;
  readonly getResourceLabel: (r: GroupedResource) => string;
  readonly onToggleCategory: (checked: boolean) => void;
  readonly onToggleResource: (r: GroupedResource, checked: boolean) => void;
  readonly onTogglePermission: (id: string, checked: boolean) => void;
}

function ModuleMatrix({
  group,
  categoryLabel,
  categoryMeta,
  selectedSet,
  disabled,
  getResourceLabel,
  onToggleCategory,
  onToggleResource,
  onTogglePermission,
}: ModuleMatrixProps) {
  const t = useTranslations("systemAdmin.role");
  const Icon = categoryMeta.icon;
  const allIds = getCategoryIds(group);
  const total = allIds.length;
  const selected = allIds.filter((id) => selectedSet.has(id)).length;
  const allChecked = total > 0 && selected === total;
  const someChecked = selected > 0 && selected < total;

  return (
    <section className="bg-card overflow-hidden rounded-xl border">
      {/* Module header — neutral chrome; wayfinding by icon shape + name (single
          accent reserved for interactive/selected state, per DESIGN.md) */}
      <header className="bg-muted/30 flex items-center gap-3 border-b px-4 py-3">
        <Icon
          className="text-muted-foreground size-5 shrink-0"
          aria-hidden="true"
        />
        <h3 className="text-foreground min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
          {categoryLabel}
        </h3>
        <span className="text-muted-foreground text-micro tabular-nums">
          {selected}/{total}
        </span>
        <label
          className={cn(
            "bg-card text-foreground border-border/60 text-micro inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-semibold transition-colors",
            disabled
              ? "cursor-not-allowed opacity-60"
              : "hover:border-primary/40 cursor-pointer",
          )}
        >
          <Checkbox
            checked={getCheckedState(allChecked, someChecked)}
            onCheckedChange={(c) => onToggleCategory(!!c)}
            disabled={disabled}
            aria-label={t("selectAllCategory", { category: categoryLabel })}
          />
          {t("grantAll")}
        </label>
      </header>

      {/* แถว resource — ไม่มี header row: แต่ละ checkbox พก label ของตัวเอง
          และโชว์เฉพาะ action ที่ resource นั้นมีจริง เลยไม่ต้องตรึงคอลัมน์
          (layout เดียวใช้ทุกขนาดจอ — แถวยาวเกินก็ wrap เอง) */}
      <div className="divide-border/50 divide-y">
        {group.resources.map((r) => (
          <ResourceRow
            key={r.resource}
            resource={r}
            label={getResourceLabel(r)}
            selectedSet={selectedSet}
            disabled={disabled}
            onToggleResource={(c) => onToggleResource(r, c)}
            onTogglePermission={onTogglePermission}
          />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* ResourceRow — one resource: labelled checkboxes, only real actions   */
/* ------------------------------------------------------------------ */

interface ResourceRowProps {
  readonly resource: GroupedResource;
  readonly label: string;
  readonly selectedSet: Set<string>;
  readonly disabled?: boolean;
  readonly onToggleResource: (checked: boolean) => void;
  readonly onTogglePermission: (id: string, checked: boolean) => void;
}

function ResourceRow({
  resource,
  label,
  selectedSet,
  disabled,
  onToggleResource,
  onTogglePermission,
}: ResourceRowProps) {
  const t = useTranslations("systemAdmin.role");
  const ids = getResourceIds(resource);
  const rowSelected = ids.filter((id) => selectedSet.has(id)).length;
  const allOn = rowSelected === ids.length;
  const someOn = rowSelected > 0 && !allOn;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-6 gap-y-1.5 px-4 py-2",
        allOn ? "bg-muted/40" : "bg-card",
      )}
    >
      <div className="flex min-w-0 flex-1 basis-48 items-center gap-3">
        <Checkbox
          checked={getCheckedState(allOn, someOn)}
          onCheckedChange={(c) => onToggleResource(!!c)}
          disabled={disabled}
          className="size-3.5"
          aria-label={t("selectAllResource", { resource: label })}
        />
        <p className="text-foreground min-w-0 truncate text-xs font-semibold">
          {label}
        </p>
      </div>

      {/* Toggle pill ต่อ action เรียงตามลำดับ MAIN_ACTIONS โชว์เฉพาะที่มีจริง —
          ติดแล้วเป็น primary (selected state คือที่เดียวที่ accent ใช้ได้) */}
      <div className="flex flex-wrap items-center gap-1.5">
        {MAIN_ACTIONS.filter((a) => resource.actions.has(a)).map((a) => {
          const id = resource.actions.get(a)!;
          return (
            <Toggle
              key={a}
              variant="pill"
              size="xs"
              pressed={selectedSet.has(id)}
              onPressedChange={(pressed) => onTogglePermission(id, pressed)}
              disabled={disabled}
            >
              {t(ACTION_TKEY[a])}
            </Toggle>
          );
        })}
      </div>
    </div>
  );
}
