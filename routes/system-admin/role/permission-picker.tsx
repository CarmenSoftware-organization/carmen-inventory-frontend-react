
import { useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import {
  Activity,
  CircleDot,
  KeySquare,
  LayoutDashboard,
  Package,
  Search,
  Settings2,
  ShoppingCart,
  Users,
  Warehouse,
  X,
  type LucideIcon,
} from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
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
/** ทุก action ที่แสดงเป็น Checkbox column — รวม CRUD + scope + workflow actions */
const MAIN_ACTIONS = [...STANDARD_ACTIONS, ...EXTENDED_ACTIONS] as const;
type MainAction = (typeof MAIN_ACTIONS)[number];

const ACTION_TKEY: Record<string, string> = {
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
  readonly labelEn: string;
  readonly labelTh: string;
  readonly icon: LucideIcon;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  configuration: {
    tkey: "catConfig",
    labelEn: "Configuration",
    labelTh: "การตั้งค่า",
    icon: Settings2,
  },
  product_management: {
    tkey: "catProduct",
    labelEn: "Product Management",
    labelTh: "การจัดการสินค้า",
    icon: Package,
  },
  vendor_management: {
    tkey: "catVendor",
    labelEn: "Vendor Management",
    labelTh: "การจัดการผู้ขาย",
    icon: Users,
  },
  procurement: {
    tkey: "catProcurement",
    labelEn: "Procurement",
    labelTh: "จัดซื้อ",
    icon: ShoppingCart,
  },
  inventory_management: {
    tkey: "catInventory",
    labelEn: "Inventory Management",
    labelTh: "การจัดการคลัง",
    icon: Warehouse,
  },
  widget: {
    tkey: "catWidget",
    labelEn: "Widgets",
    labelTh: "วิดเจ็ต",
    icon: LayoutDashboard,
  },
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
  readonly originalIds?: Set<string>;
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
  originalIds,
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

  const pendingCount = (() => {
    if (!originalIds) return 0;
    let added = 0;
    let removed = 0;
    for (const id of value) if (!originalIds.has(id)) added++;
    for (const id of originalIds) if (!selectedSet.has(id)) removed++;
    return added + removed;
  })();

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
  const handleToggleColumn = (g: PermissionGroup, action: MainAction) => {
    const colIds: string[] = [];
    for (const r of g.resources) {
      const id = r.actions.get(action);
      if (id) colIds.push(id);
    }
    if (colIds.length === 0) return;
    const allOn = colIds.every((id) => selectedSet.has(id));
    if (allOn) removeIds(colIds);
    else addIds(colIds);
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
          aria-label={t("statusActive")}
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
                  "rounded-full px-2 py-1 text-[0.6875rem] font-semibold transition-colors",
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

      {/* Legend */}
      <div className="border-border/60 bg-muted/30 hidden items-center gap-3 rounded-md border px-3 py-1.5 text-[0.625rem] font-semibold md:flex">
        <span className="text-muted-foreground tracking-widest uppercase">
          {t("legendLabel")}
        </span>
        {STANDARD_ACTIONS.map((a) => (
          <span
            key={a}
            className="text-foreground/70 inline-flex items-center gap-1.5"
          >
            <Checkbox
              checked
              disabled
              className="cursor-default opacity-90"
              aria-hidden="true"
            />
            {t(ACTION_TKEY[a])}
          </span>
        ))}
        <span className="bg-border h-3 w-px" aria-hidden="true" />
        <span className="text-foreground/70 inline-flex items-center gap-1.5">
          <span className="border-border/60 bg-card text-foreground/70 inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
            <span className="bg-info size-1 rounded-full" aria-hidden="true" />
            {t("actionViewAll")}
          </span>
          <span className="text-muted-foreground">{t("legendScopedHint")}</span>
        </span>
        <span className="flex-1" />
        {originalIds && (
          <span className="text-muted-foreground tracking-wider uppercase">
            {pendingCount === 0 ? "—" : `${pendingCount} pending`}
          </span>
        )}
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
            onToggleColumn={(a) => handleToggleColumn(group, a)}
          />
        ))
      )}

      {/* Change preview */}
      {originalIds && filteredGroups.length > 0 && (
        <div className="border-border/60 bg-card flex items-center gap-3 rounded-xl border p-3">
          <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Activity className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-xs font-semibold">
              {t("changePreviewTitle")}
            </p>
            <p className="text-muted-foreground text-[0.6875rem]">
              {t("changePreviewDesc", { count: pendingCount })}
            </p>
          </div>
          <span className="text-muted-foreground/70 hidden text-[0.625rem] tracking-wider sm:inline">
            {t("rbacFootprint")}
          </span>
        </div>
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
  readonly onToggleColumn: (action: MainAction) => void;
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
  onToggleColumn,
}: ModuleMatrixProps) {
  const t = useTranslations("systemAdmin.role");
  const locale = useLocale();
  const Icon = categoryMeta.icon;
  const secondaryLabel =
    locale === "th" ? categoryMeta.labelEn : categoryMeta.labelTh;
  const allIds = getCategoryIds(group);
  const total = allIds.length;
  const selected = allIds.filter((id) => selectedSet.has(id)).length;
  const allChecked = total > 0 && selected === total;
  const someChecked = selected > 0 && selected < total;

  // Per-column counts (granted / applicable) for header subtitles
  const colCounts = MAIN_ACTIONS.map((a) => {
    let on = 0;
    let applicable = 0;
    for (const r of group.resources) {
      const id = r.actions.get(a);
      if (id) {
        applicable++;
        if (selectedSet.has(id)) on++;
      }
    }
    return { on, applicable };
  });

  return (
    <section className="bg-card overflow-hidden rounded-xl border">
      {/* Module header — neutral chrome; wayfinding by icon shape + name (single
          accent reserved for interactive/selected state, per DESIGN.md) */}
      <header className="bg-muted/30 flex items-center gap-3 border-b px-4 py-3">
        <Icon
          className="text-muted-foreground size-5 shrink-0"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="text-foreground truncate text-sm font-semibold tracking-tight">
              {categoryLabel}
            </h3>
            <span
              className="text-muted-foreground truncate text-xs"
              aria-hidden="true"
            >
              {secondaryLabel}
            </span>
          </div>
          <p className="text-muted-foreground/90 mt-0.5 text-[0.6875rem] tracking-wide tabular-nums">
            {t("moduleStats", {
              resources: group.resources.length,
              granted: selected,
              total,
            })}
          </p>
        </div>
        <label
          className={cn(
            "bg-card text-foreground border-border/60 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[0.6875rem] font-semibold transition-colors",
            disabled
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:border-primary/40",
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
        <Settings2
          className="text-muted-foreground/60 size-3.5 shrink-0"
          aria-hidden="true"
        />
      </header>

      {/* Desktop matrix table */}
      <div className="hidden md:block">
        {/* Column header row */}
        <div className="bg-muted/30 text-muted-foreground border-border/60 grid grid-cols-[minmax(12rem,1fr)_repeat(9,minmax(3.5rem,1fr))] items-center border-b px-4 py-2 text-[0.625rem] font-semibold tracking-widest uppercase">
          <span>{t("matrixHeaderResource")}</span>
          {MAIN_ACTIONS.map((a, i) => {
            const cc = colCounts[i];
            const allCol = cc.applicable > 0 && cc.on === cc.applicable;
            const someCol = cc.on > 0 && cc.on < cc.applicable;
            return (
              <button
                key={a}
                type="button"
                onClick={() => !disabled && onToggleColumn(a)}
                disabled={disabled || cc.applicable === 0}
                className={cn(
                  "group flex flex-col items-center gap-0.5 rounded-md py-1 transition-colors",
                  cc.applicable > 0 &&
                    !disabled &&
                    "hover:bg-muted/60 cursor-pointer",
                  cc.applicable === 0 && "opacity-40",
                )}
                aria-label={t("selectAllAction", { action: t(ACTION_TKEY[a]) })}
              >
                <span
                  className={cn(
                    "font-semibold",
                    allCol && "text-foreground",
                    someCol && "text-foreground/80",
                  )}
                >
                  {t(ACTION_TKEY[a])}
                </span>
                <span className="text-muted-foreground/70 text-[0.5625rem] tabular-nums">
                  {cc.on}/{cc.applicable}
                </span>
              </button>
            );
          })}
        </div>

        {/* Resource rows */}
        {group.resources.map((r, idx) => (
          <MatrixRow
            key={r.resource}
            resource={r}
            label={getResourceLabel(r)}
            selectedSet={selectedSet}
            disabled={disabled}
            isLast={idx === group.resources.length - 1}
            onToggleResource={(c) => onToggleResource(r, c)}
            onTogglePermission={onTogglePermission}
          />
        ))}
      </div>

      {/* Mobile / tablet: card per resource */}
      <div className="divide-border/50 divide-y md:hidden">
        {group.resources.map((r) => (
          <MobileResourceRow
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
/* MatrixRow — single resource in desktop matrix                       */
/* ------------------------------------------------------------------ */

interface MatrixRowProps {
  readonly resource: GroupedResource;
  readonly label: string;
  readonly selectedSet: Set<string>;
  readonly disabled?: boolean;
  readonly isLast: boolean;
  readonly onToggleResource: (checked: boolean) => void;
  readonly onTogglePermission: (id: string, checked: boolean) => void;
}

function MatrixRow({
  resource,
  label,
  selectedSet,
  disabled,
  isLast,
  onToggleResource,
  onTogglePermission,
}: MatrixRowProps) {
  const t = useTranslations("systemAdmin.role");
  const ids = getResourceIds(resource);
  const rowSelected = ids.filter((id) => selectedSet.has(id)).length;
  const allOn = rowSelected === ids.length;
  const someOn = rowSelected > 0 && !allOn;

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(12rem,1fr)_repeat(9,minmax(3.5rem,1fr))] items-center px-4 py-2",
        !isLast && "border-b",
        allOn ? "bg-muted/40" : "bg-card",
      )}
    >
      {/* Resource label cell */}
      <div className="flex min-w-0 items-center gap-3">
        <Checkbox
          checked={getCheckedState(allOn, someOn)}
          onCheckedChange={(c) => onToggleResource(!!c)}
          disabled={disabled}
          className="size-3.5"
          aria-label={t("selectAllResource", { resource: label })}
        />
        <CircleDot
          className="text-muted-foreground/40 size-3 shrink-0"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-foreground truncate text-xs font-semibold">
            {label}
          </p>
          <p className="text-muted-foreground/80 truncate text-[0.625rem]">
            {resource.resource}
          </p>
        </div>
      </div>

      {/* Action checkbox cells — CRUD + scope (view_department/view_all) + workflow (execute/commit/manage_bu) */}
      {MAIN_ACTIONS.map((a) => {
        const id = resource.actions.get(a);
        if (!id) {
          return (
            <div key={a} className="flex justify-center">
              <span
                className="text-muted-foreground/40 text-xs"
                title={t("notAvailable")}
                aria-label={t("notAvailable")}
              >
                —
              </span>
            </div>
          );
        }
        const on = selectedSet.has(id);
        return (
          <div key={a} className="flex justify-center">
            <Checkbox
              checked={on}
              onCheckedChange={(c) => onTogglePermission(id, !!c)}
              disabled={disabled}
              className="size-4"
              aria-label={`${t(ACTION_TKEY[a])} · ${label}`}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MobileResourceRow — card per resource on small screens              */
/* ------------------------------------------------------------------ */

interface MobileResourceRowProps {
  readonly resource: GroupedResource;
  readonly label: string;
  readonly selectedSet: Set<string>;
  readonly disabled?: boolean;
  readonly onToggleResource: (checked: boolean) => void;
  readonly onTogglePermission: (id: string, checked: boolean) => void;
}

function MobileResourceRow({
  resource,
  label,
  selectedSet,
  disabled,
  onToggleResource,
  onTogglePermission,
}: MobileResourceRowProps) {
  const t = useTranslations("systemAdmin.role");
  const ids = getResourceIds(resource);
  const rowSelected = ids.filter((id) => selectedSet.has(id)).length;
  const allOn = rowSelected === ids.length;
  const someOn = rowSelected > 0 && !allOn;

  return (
    <div className={cn("p-3", allOn && "bg-muted/40")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Checkbox
            checked={getCheckedState(allOn, someOn)}
            onCheckedChange={(c) => onToggleResource(!!c)}
            disabled={disabled}
            className="size-4"
            aria-label={t("selectAllResource", { resource: label })}
          />
          <div className="min-w-0">
            <p className="text-foreground truncate text-xs font-semibold">
              {label}
            </p>
            <p className="text-muted-foreground/80 truncate text-[0.625rem]">
              {resource.resource}
            </p>
          </div>
        </div>
        <span className="text-muted-foreground text-[0.625rem] tabular-nums">
          {rowSelected}/{ids.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MAIN_ACTIONS.map((a) => {
          const id = resource.actions.get(a);
          if (!id) return null;
          const on = selectedSet.has(id);
          return (
            <button
              key={a}
              type="button"
              onClick={() => onTogglePermission(id, !on)}
              disabled={disabled}
              aria-pressed={on}
              className={cn(
                "rounded-full border px-2 py-1 text-[0.6875rem] font-semibold transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              {t(ACTION_TKEY[a])}
            </button>
          );
        })}
      </div>
    </div>
  );
}
