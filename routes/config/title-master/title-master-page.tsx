import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import SearchInput from "@/components/search-input";
import EmptyComponent from "@/components/empty-component";
import DisplayTemplate from "@/components/display-template";
import {
  ListCard,
  ListCardActiveRow,
  ListCardRow,
} from "@/components/share/list-card";
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
import { Field, FieldInput, FieldLabel } from "@/components/ui/field";
import { StatusFilter } from "@/components/ui/status-filter";
import { StatusSwitch } from "@/components/ui/status-switch";
import { WarningDialog } from "@/components/ui/warning-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  type TitleMaster,
  useAccountingMasterMock,
} from "../accounting-master-mock";

export default function TitleMasterPage() {
  const store = useAccountingMasterMock();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<TitleMaster | null | undefined>();
  const [deleting, setDeleting] = useState<TitleMaster | null>(null);
  const [warning, setWarning] = useState("");
  const rows = useMemo(
    () =>
      store.titles.filter((item) => {
        const matchesSearch = `${item.code} ${item.description}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesStatus =
          !status || (status === "active" ? item.is_active : !item.is_active);
        return matchesSearch && matchesStatus;
      }),
    [search, status, store.titles],
  );

  const columns = useMemo<ColumnDef<TitleMaster>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Title Code" />
        ),
        cell: ({ row }) => (
          <CellAction onClick={() => setEditing(row.original)}>
            {row.original.code}
          </CellAction>
        ),
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Description" />
        ),
        cell: ({ row }) => (
          <CellAction onClick={() => setEditing(row.original)}>
            {row.original.description}
          </CellAction>
        ),
      },
      {
        accessorKey: "reference_count",
        header: "Linked records",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.reference_count}</span>
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            size="xs"
            variant={row.original.is_active ? "success-light" : "invert-light"}
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
    [],
  );
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const remove = () => {
    if (!deleting) return;
    try {
      store.deleteTitle(deleting);
      toast.success("Title deleted");
      setDeleting(null);
    } catch (error) {
      setDeleting(null);
      setWarning(
        error instanceof Error ? error.message : "Unable to delete title",
      );
    }
  };

  return (
    <DisplayTemplate
      title="Title Master"
      description="Honorifics used by customer, guest and accounting profiles"
      toolbar={
        <>
          <div className="min-w-52 flex-1 sm:flex-initial">
            <SearchInput
              defaultValue={search}
              onSearch={setSearch}
              onInputChange={setSearch}
            />
          </div>
          <StatusFilter
            value={status}
            onChange={setStatus}
            placeholder="Status"
            defaultLabel="All statuses"
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            className="w-36"
          />
        </>
      }
      actions={
        <>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Refresh mock data"
            onClick={() => location.reload()}
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button size="sm" onClick={() => setEditing(null)}>
            <Plus className="size-4" /> Add Title
          </Button>
        </>
      }
    >
      {isMobile ? (
        <div className="grid gap-3">
          {rows.map((item) => (
            <ListCard
              key={item.id}
              title={item.code}
              onOpen={() => setEditing(item)}
              onDelete={() => setDeleting(item)}
            >
              <ListCardRow label="Description">{item.description}</ListCardRow>
              <ListCardRow label="Linked">{item.reference_count}</ListCardRow>
              <ListCardActiveRow active={item.is_active} />
            </ListCard>
          ))}
          {rows.length === 0 && <EmptyComponent />}
        </div>
      ) : (
        <DataGrid
          table={table}
          recordCount={rows.length}
          emptyMessage={<EmptyComponent />}
          tableLayout={{ width: "auto", headerSticky: true }}
          tableClassNames={{ bodyRow: "h-10" }}
        >
          <DataGridContainer
            scroll
            className="max-h-[calc(100vh-13rem)]"
          >
            <DataGridTable />
          </DataGridContainer>
        </DataGrid>
      )}
      <TitleDialog
        key={editing?.id ?? "new"}
        open={editing !== undefined}
        item={editing ?? null}
        onOpenChange={(open) => !open && setEditing(undefined)}
        onSave={(values) => {
          try {
            store.saveTitle(values, editing?.id);
            toast.success(editing ? "Title updated" : "Title created");
            setEditing(undefined);
          } catch (error) {
            setWarning(
              error instanceof Error ? error.message : "Unable to save title",
            );
          }
        }}
      />
      <DeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete title?"
        description={
          deleting
            ? `Delete ${deleting.code} — ${deleting.description}?`
            : undefined
        }
        onConfirm={remove}
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

function TitleDialog({
  open,
  item,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  item: TitleMaster | null;
  onOpenChange: (open: boolean) => void;
  onSave: (value: {
    code: string;
    description: string;
    is_active: boolean;
  }) => void;
}) {
  const [code, setCode] = useState(item?.code ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [active, setActive] = useState(item?.is_active ?? true);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit Title" : "Add Title"}</DialogTitle>
          <DialogDescription>
            Code is locked after the title is created.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field>
            <FieldLabel htmlFor="title-code" required>
              Title Code
            </FieldLabel>
            <FieldInput
              id="title-code"
              value={code}
              disabled={!!item}
              maxLength={15}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="title-description" required>
              Description
            </FieldLabel>
            <FieldInput
              id="title-description"
              value={description}
              maxLength={50}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <StatusSwitch checked={active} onCheckedChange={setActive} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!code.trim() || !description.trim()}
            onClick={() => onSave({ code, description, is_active: active })}
          >
            {item ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
