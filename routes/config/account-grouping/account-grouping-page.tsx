import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { FolderTree, Plus } from "lucide-react";
import { toast } from "sonner";
import SearchInput from "@/components/search-input";
import EmptyComponent from "@/components/empty-component";
import DisplayTemplate from "@/components/display-template";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { WarningDialog } from "@/components/ui/warning-dialog";
import {
  type AccountGroupMaster,
  useAccountingMasterMock,
} from "../accounting-master-mock";

export default function AccountGroupingPage() {
  const store = useAccountingMasterMock();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<
    AccountGroupMaster | null | undefined
  >();
  const [deleting, setDeleting] = useState<AccountGroupMaster | null>(null);
  const [warning, setWarning] = useState("");
  const rows = useMemo(
    () =>
      store.accountGroups.filter((item) =>
        `${item.code} ${item.name}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [search, store.accountGroups],
  );
  const names = useMemo(
    () =>
      new Map(
        store.accountGroups.map((item) => [
          item.id,
          `${item.code} — ${item.name}`,
        ]),
      ),
    [store.accountGroups],
  );
  const columns = useMemo<ColumnDef<AccountGroupMaster>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Group Code" />
        ),
        cell: ({ row }) => (
          <CellAction onClick={() => setEditing(row.original)}>
            {row.original.code}
          </CellAction>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Group Name" />
        ),
        cell: ({ row }) => (
          <CellAction onClick={() => setEditing(row.original)}>
            <span style={{ paddingLeft: `${(row.original.level - 1) * 16}px` }}>
              {row.original.name}
            </span>
          </CellAction>
        ),
      },
      {
        accessorKey: "level",
        header: "Level",
        cell: ({ row }) => (
          <Badge variant="outline" size="xs">
            L{row.original.level}
          </Badge>
        ),
      },
      {
        accessorKey: "parent_id",
        header: "Parent",
        cell: ({ row }) =>
          row.original.parent_id ? names.get(row.original.parent_id) : "Root",
      },
      {
        accessorKey: "account_count",
        header: "Accounts",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.account_count}</span>
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={row.original.is_active ? "success-light" : "invert-light"}
            size="xs"
          >
            {row.original.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(row.original)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeleting(row.original)}
            >
              Delete
            </Button>
          </div>
        ),
        enableSorting: false,
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
        <SearchInput
          defaultValue={search}
          onSearch={setSearch}
          onInputChange={setSearch}
        />
      }
      actions={
        <Button size="sm" onClick={() => setEditing(null)}>
          <Plus className="size-4" /> Add Group
        </Button>
      }
    >
      <div className="bg-muted/30 flex items-center gap-2 rounded-md px-3 py-2 text-xs">
        <FolderTree className="text-primary size-4" />
        <span className="font-medium">Hierarchy preview:</span>
        <span className="text-muted-foreground">
          indentation shows the selected parent and level.
        </span>
      </div>
      <DataGrid
        table={table}
        recordCount={rows.length}
        emptyMessage={<EmptyComponent />}
        tableLayout={{ width: "auto", headerSticky: true }}
        tableClassNames={{ bodyRow: "h-10" }}
      >
        <DataGridContainer scroll className="max-h-[calc(100vh-14rem)]">
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>
      <GroupDialog
        key={editing?.id ?? "new"}
        open={editing !== undefined}
        item={editing ?? null}
        groups={store.accountGroups}
        onOpenChange={(open) => !open && setEditing(undefined)}
        onSave={(value) => {
          try {
            store.saveAccountGroup(value, editing?.id);
            toast.success(
              editing ? "Account group updated" : "Account group created",
            );
            setEditing(undefined);
          } catch (error) {
            setWarning(
              error instanceof Error
                ? error.message
                : "Unable to save account group",
            );
          }
        }}
      />
      <DeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete account group?"
        description={
          deleting ? `Delete ${deleting.code} — ${deleting.name}?` : undefined
        }
        onConfirm={() => {
          if (!deleting) return;
          try {
            store.deleteAccountGroup(deleting);
            toast.success("Account group deleted");
            setDeleting(null);
          } catch (error) {
            setDeleting(null);
            setWarning(
              error instanceof Error
                ? error.message
                : "Unable to delete account group",
            );
          }
        }}
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
  item,
  groups,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  item: AccountGroupMaster | null;
  groups: AccountGroupMaster[];
  onOpenChange: (open: boolean) => void;
  onSave: (value: Omit<AccountGroupMaster, "id" | "account_count">) => void;
}) {
  const [code, setCode] = useState(item?.code ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [level, setLevel] = useState<AccountGroupMaster["level"]>(
    item?.level ?? 1,
  );
  const [parentId, setParentId] = useState(item?.parent_id ?? "root");
  const [active, setActive] = useState(item?.is_active ?? true);
  const parentOptions = groups.filter(
    (group) => group.id !== item?.id && group.level === level - 1,
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit Account Group" : "Add Account Group"}
          </DialogTitle>
          <DialogDescription>
            Selecting a parent creates the new hierarchy path used by COA.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="group-code" required>
              Group Code
            </FieldLabel>
            <FieldInput
              id="group-code"
              value={code}
              disabled={!!item}
              maxLength={10}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="group-name" required>
              Group Name
            </FieldLabel>
            <FieldInput
              id="group-name"
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel required>Level</FieldLabel>
            <FieldSelect
              value={String(level)}
              onValueChange={(value) => {
                const next = Number(value) as AccountGroupMaster["level"];
                setLevel(next);
                if (next === 1) setParentId("root");
              }}
            >
              <SelectContent>
                {[1, 2, 3, 4].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    Level {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </FieldSelect>
          </Field>
          <Field>
            <FieldLabel>Parent Group</FieldLabel>
            <FieldSelect
              value={parentId}
              disabled={level === 1}
              onValueChange={setParentId}
            >
              <SelectContent>
                <SelectItem value="root">Root</SelectItem>
                {parentOptions.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.code} — {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </FieldSelect>
          </Field>
          <div className="sm:col-span-2">
            <StatusSwitch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              !code.trim() || !name.trim() || (level > 1 && parentId === "root")
            }
            onClick={() =>
              onSave({
                code,
                name,
                level,
                parent_id: level === 1 ? null : parentId,
                is_active: active,
              })
            }
          >
            {item ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
