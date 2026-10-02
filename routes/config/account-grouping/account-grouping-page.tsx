import { StatusBadge } from "@/components/ui/status-badge";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { AlertCircle, FolderTree, Plus } from "lucide-react";
import { toast } from "sonner";
import SearchInput from "@/components/search-input";
import EmptyComponent from "@/components/empty-component";
import DisplayTemplate from "@/components/display-template";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataGridRowActions } from "@/components/ui/data-grid/data-grid-row-actions";
import { CellAction } from "@/components/ui/cell-action";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldInput,
  FieldLabel,
  FieldSelect,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { StatusSwitch } from "@/components/ui/status-switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WarningDialog } from "@/components/ui/warning-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { useBuCode } from "@/hooks/use-bu-code";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { ApiError } from "@/lib/api-error";
import { httpClient } from "@/lib/http-client";
import type { AccountGroupMaster } from "@/types/accounting-master";
import { glAccountGroupsKey, useGlAccountGroups } from "../shared/use-gl-account-groups";
import type { AccountCategory } from "@/types/chart-of-accounts";
import { ACCOUNT_CATEGORIES } from "@/types/chart-of-accounts";

const CATEGORY_LABELS: Record<AccountCategory, string> = {
  asset: "Asset (สินทรัพย์)",
  liability: "Liability (หนี้สิน)",
  equity: "Equity (ส่วนของเจ้าของ)",
  revenue: "Revenue (รายได้)",
  expense: "Expense (ค่าใช้จ่าย)",
  statistic: "Statistic (สถิติ)",
};

function buildHierarchyOrder(groups: AccountGroupMaster[]): AccountGroupMaster[] {
  const result: AccountGroupMaster[] = [];
  const byParent = new Map<string | null, AccountGroupMaster[]>();
  for (const g of groups) {
    const p = g.parent_id ?? null;
    const list = byParent.get(p) ?? [];
    list.push(g);
    byParent.set(p, list);
  }
  for (const list of byParent.values()) {
    list.sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.code.localeCompare(b.code),
    );
  }
  function traverse(parentId: string | null) {
    const children = byParent.get(parentId) ?? [];
    for (const child of children) {
      result.push(child);
      traverse(child.id);
    }
  }
  traverse(null);
  const addedIds = new Set(result.map((r) => r.id));
  for (const g of groups) {
    if (!addedIds.has(g.id)) {
      result.push(g);
    }
  }
  return result;
}

function getDescendantGroupIds(groups: AccountGroupMaster[], rootId: string) {
  const descendants = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const group of groups) {
      if (group.parent_id === current && !descendants.has(group.id)) {
        descendants.add(group.id);
        queue.push(group.id);
      }
    }
  }
  return descendants;
}

export default function AccountGroupingPage() {
  const buCode = useBuCode();
  const queryClient = useQueryClient();
  const groupQuery = useGlAccountGroups();
  const groups = useMemo(() => groupQuery.data ?? [], [groupQuery.data]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [detailOnly, setDetailOnly] = useState(false);
  const [editing, setEditing] = useState<AccountGroupMaster | null | undefined>();
  const [deleting, setDeleting] = useState<AccountGroupMaster | null>(null);
  const [warning, setWarning] = useState("");
  const [saving, setSaving] = useState(false);

  const saveGroup = async (value: Omit<AccountGroupMaster, "id" | "account_count" | "doc_version">) => {
    if (!buCode || saving) return;
    setSaving(true);
    try {
      const url = API_ENDPOINTS.GL_ACCOUNT_GROUPS(buCode);
      const { level: _level, category, ...fields } = value;
      const res = editing
        ? await httpClient.put(`${url}/${editing.id}`, { ...fields, doc_version: editing.doc_version })
        : await httpClient.post(url, { ...fields, category });
      if (!res.ok) throw await ApiError.from(res, "Unable to save account group");
      await queryClient.invalidateQueries({ queryKey: glAccountGroupsKey(buCode) });
      toast.success(editing ? "Account group updated" : "Account group created");
      setEditing(undefined);
    } catch (error) {
      setWarning(error instanceof Error ? error.message : "Unable to save account group");
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async () => {
    if (!buCode || !deleting || saving) return;
    setSaving(true);
    try {
      const res = await httpClient.delete(`${API_ENDPOINTS.GL_ACCOUNT_GROUPS(buCode)}/${deleting.id}`);
      if (!res.ok) throw await ApiError.from(res, "Unable to delete account group");
      await queryClient.invalidateQueries({ queryKey: glAccountGroupsKey(buCode) });
      toast.success("Account group deleted");
      setDeleting(null);
    } catch (error) {
      setWarning(error instanceof Error ? error.message : "Unable to delete account group");
    } finally {
      setSaving(false);
    }
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of groups) {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    return counts;
  }, [groups]);

  const orderedGroups = useMemo(
    () => buildHierarchyOrder(groups),
    [groups],
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orderedGroups.filter((item) => {
      if (
        query &&
        !`${item.code} ${item.name} ${item.name_local ?? ""} ${item.category}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (selectedLevel !== "all" && item.level !== Number(selectedLevel)) {
        return false;
      }
      if (selectedStatus !== "all") {
        const isActive = selectedStatus === "active";
        if (item.is_active !== isActive) return false;
      }
      return true;
    });
  }, [orderedGroups, search, selectedCategory, selectedLevel, selectedStatus]);

  const names = useMemo(
    () =>
      new Map(
        groups.map((item) => [
          item.id,
          `${item.code} — ${item.name}`,
        ]),
      ),
    [groups],
  );

  const columns = useMemo<ColumnDef<AccountGroupMaster>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Group Code" />
        ),
        cell: ({ row }) => (
          <CellAction onClick={() => { setDetailOnly(true); setEditing(row.original); }}>
            <span className="font-mono font-medium">{row.original.code}</span>
          </CellAction>
        ),
        size: 130,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Group Name (EN)" />
        ),
        cell: ({ row }) => (
          <CellAction onClick={() => { setDetailOnly(true); setEditing(row.original); }}>
            <span
              className="inline-flex items-center gap-1.5"
              style={{ paddingLeft: `${(row.original.level - 1) * 20}px` }}
            >
              {row.original.level > 1 && (
                <span className="text-muted-foreground/60 select-none font-mono text-xs">
                  └─
                </span>
              )}
              <span className="font-medium">{row.original.name}</span>
            </span>
          </CellAction>
        ),
      },
      {
        accessorKey: "name_local",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Group Name (TH)" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {row.original.name_local || "—"}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <Badge data-standard-chip="" variant="outline" size="sm" className="uppercase font-mono">
            {row.original.category}
          </Badge>
        ),
        size: 100,
      },
      {
        accessorKey: "level",
        header: "Level",
        cell: ({ row }) => {
          const l = row.original.level;
          const variant =
            l === 1
              ? "default"
              : l === 2
                ? "secondary"
                : "outline";
          return (
            <Badge data-standard-chip="" variant={variant} size="sm" className="font-mono">
              L{l}
            </Badge>
          );
        },
        size: 80,
      },
      {
        accessorKey: "parent_id",
        header: "Parent Group",
        cell: ({ row }) =>
          row.original.parent_id ? (
            <span className="text-muted-foreground font-mono text-xs">
              {names.get(row.original.parent_id) ?? row.original.parent_id}
            </span>
          ) : (
            <span className="text-muted-foreground/50 text-xs italic">Root</span>
          ),
      },
      {
        accessorKey: "account_count",
        header: "Accounts",
        cell: ({ row }) => (
          <span className="tabular-nums font-mono text-xs">
            {row.original.account_count}
          </span>
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        size: 90,
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge active={row.original.is_active} />
        ),
        size: 90,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DataGridRowActions
            activity={{ id: row.original.id }}

            onEdit={() => { setDetailOnly(false); setEditing(row.original); }}
            onDelete={() => setDeleting(row.original)}
          />
        ),
        enableSorting: false,
        size: 60,
      },
    ],
    [names],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DisplayTemplate
      title="Account Code Grouping"
      description="Four-level hierarchy used to classify Chart of Accounts"
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-56">
            <SearchInput
              defaultValue={search}
              onSearch={setSearch}
              onInputChange={setSearch}
            />
          </div>
          <div className="w-32">
            <FieldSelect
              value={selectedLevel}
              onValueChange={setSelectedLevel}
              className="h-8 text-xs"
            >
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="1">Level 1 (Root)</SelectItem>
                <SelectItem value="2">Level 2</SelectItem>
                <SelectItem value="3">Level 3</SelectItem>
                <SelectItem value="4">Level 4</SelectItem>
              </SelectContent>
            </FieldSelect>
          </div>
          <div className="w-32">
            <FieldSelect
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              className="h-8 text-xs"
            >
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </FieldSelect>
          </div>
        </div>
      }
      actions={
        <Button size="sm" onClick={() => setEditing(null)}>
          <Plus className="size-4" /> Add Group
        </Button>
      }
    >
      <div className="space-y-3">
        {groupQuery.isError && <ErrorState error={groupQuery.error} onRetry={() => groupQuery.refetch()} />}
        <Tabs
          value={selectedCategory}
          onValueChange={setSelectedCategory}
          className="w-full"
        >
          <TabsList variant="line" className="border-b w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">
              All ({groups.length})
            </TabsTrigger>
            {ACCOUNT_CATEGORIES.map((cat) => (
              <TabsTrigger key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)} (
                {categoryCounts[cat] ?? 0})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="bg-muted/30 flex items-center gap-2 rounded-md px-3 py-2 text-xs">
          <FolderTree className="text-primary size-4 shrink-0" />
          <span className="font-medium">Hierarchy Tree:</span>
          <span className="text-muted-foreground">
            L1–L4 structure classified by account category. Indentation indicates
            parent-child relationship.
          </span>
        </div>

        <DataGrid
          table={table}
          recordCount={rows.length}
          emptyMessage={<EmptyComponent />}
          tableLayout={{ width: "auto", headerSticky: true }}
          tableClassNames={{ bodyRow: "h-10" }}
        >
          <DataGridContainer scroll className="max-h-[calc(100vh-17rem)]">
            <DataGridTable />
          </DataGridContainer>
        </DataGrid>
      </div>

      <GroupDialog
        readOnly={detailOnly}
        key={editing?.id ?? "new"}
        open={editing !== undefined}
        item={editing ?? null}
        groups={groups}
        saving={saving}
        onOpenChange={(open) => { if (!open) { setEditing(undefined); setDetailOnly(false); } }}
        onSave={saveGroup}
      />
      <DeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete account group?"
        description={
          deleting ? `Delete ${deleting.code} — ${deleting.name}?` : undefined
        }
        isPending={saving}
        onConfirm={deleteGroup}
      />
      <WarningDialog
        open={!!warning}
        title="Action blocked"
        description={warning}
        onConfirm={() => setWarning("")}
      />
    </DisplayTemplate>
  );
}

function GroupDialog({
  open,
  readOnly = false,
  item,
  groups,
  saving,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  readOnly?: boolean;
  item: AccountGroupMaster | null;
  groups: AccountGroupMaster[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    value: Omit<AccountGroupMaster, "id" | "account_count" | "doc_version">,
  ) => void;
}) {
  const [code, setCode] = useState(item?.code ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [nameLocal, setNameLocal] = useState(item?.name_local ?? "");
  const [category, setCategory] = useState<AccountCategory>(
    item?.category ?? "asset",
  );
  const [sortOrder, setSortOrder] = useState<number>(item?.sort_order ?? 0);
  const [level, setLevel] = useState<AccountGroupMaster["level"]>(
    item?.level ?? 1,
  );
  const [parentId, setParentId] = useState(item?.parent_id ?? "root");
  const [active, setActive] = useState(item?.is_active ?? true);

  const excludedIds = useMemo(() => {
    if (!item) return new Set<string>();
    const desc = getDescendantGroupIds(groups, item.id);
    desc.add(item.id);
    return desc;
  }, [groups, item]);

  const parentOptions = useMemo(() => {
    if (level === 1) return [];
    return groups.filter(
      (group) =>
        !excludedIds.has(group.id) &&
        group.level === level - 1 &&
        group.category === category &&
        group.is_active,
    );
  }, [groups, excludedIds, level, category]);

  const handleCategoryChange = (val: AccountCategory) => {
    setCategory(val);
    if (level > 1) {
      const valid = groups.filter(
        (g) =>
          !excludedIds.has(g.id) &&
          g.level === level - 1 &&
          g.category === val &&
          g.is_active,
      );
      if (!valid.some((p) => p.id === parentId)) {
        setParentId(valid[0]?.id ?? "");
      }
    }
  };

  const handleLevelChange = (next: AccountGroupMaster["level"]) => {
    setLevel(next);
    if (next === 1) {
      setParentId("root");
    } else {
      const valid = groups.filter(
        (g) =>
          !excludedIds.has(g.id) &&
          g.level === next - 1 &&
          g.category === category &&
          g.is_active,
      );
      if (!valid.some((p) => p.id === parentId)) {
        setParentId(valid[0]?.id ?? "");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {readOnly ? "Account Group Detail" : item ? "Edit Account Group" : "Add Account Group"}
          </DialogTitle>
          <DialogDescription>
            Selecting a parent creates the hierarchy path used by Chart of Accounts.
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={readOnly} className="grid gap-4 py-2 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="group-code" required>
              Group Code
            </FieldLabel>
            <FieldInput
              id="group-code"
              value={code}
              disabled={!!item}
              maxLength={20}
              placeholder="e.g. 1000, 1100"
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </Field>
          <Field>
            <FieldLabel required>Category</FieldLabel>
            <FieldSelect
              value={category}
              disabled={!!item}
              onValueChange={(val) => handleCategoryChange(val as AccountCategory)}
            >
              <SelectContent>
                {ACCOUNT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </FieldSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="group-name" required>
              Group Name (EN)
            </FieldLabel>
            <FieldInput
              id="group-name"
              value={name}
              maxLength={100}
              placeholder="e.g. Current Assets"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="group-name-local">
              Group Name (TH)
            </FieldLabel>
            <FieldInput
              id="group-name-local"
              value={nameLocal}
              maxLength={100}
              placeholder="e.g. สินทรัพย์หมุนเวียน"
              onChange={(event) => setNameLocal(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel required>Level</FieldLabel>
            <FieldSelect
              value={String(level)}
              disabled={!!item && (item.account_count > 0 || groups.some((g) => g.parent_id === item.id))}
              onValueChange={(value) => {
                handleLevelChange(Number(value) as AccountGroupMaster["level"]);
              }}
            >
              <SelectContent>
                {[1, 2, 3, 4].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    Level {value} {value === 1 ? "(Root Category)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </FieldSelect>
          </Field>
          <Field>
            <FieldLabel required={level > 1}>Parent Group</FieldLabel>
            <FieldSelect
              value={parentId}
              disabled={level === 1 || parentOptions.length === 0}
              onValueChange={setParentId}
            >
              <SelectContent>
                {level === 1 ? (
                  <SelectItem value="root">Root (No Parent)</SelectItem>
                ) : (
                  parentOptions.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.code} — {group.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </FieldSelect>
            {level > 1 && parentOptions.length === 0 && (
              <div className="flex items-center gap-1 text-amber-600 text-xs mt-1">
                <AlertCircle className="size-3 shrink-0" />
                <span>No active L{level - 1} group in {category}</span>
              </div>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="group-sort-order">Sort Order</FieldLabel>
            <FieldInput
              id="group-sort-order"
              type="number"
              value={sortOrder}
              onChange={(event) => setSortOrder(Number(event.target.value) || 0)}
            />
          </Field>
          <div className="sm:col-span-2">
            <StatusSwitch
              id="account-group-active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>
        </fieldset>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && <Button
            disabled={
              saving ||
              !code.trim() ||
              !name.trim() ||
              (level > 1 && (!parentId || parentId === "root"))
            }
            onClick={() =>
              onSave({
                code,
                name,
                name_local: nameLocal || null,
                level,
                parent_id: level === 1 ? null : parentId,
                category,
                sort_order: sortOrder,
                is_active: active,
              })
            }
          >
            {item ? "Save" : "Create"}
          </Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
