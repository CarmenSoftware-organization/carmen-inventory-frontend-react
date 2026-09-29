import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Percent, Plus } from "lucide-react";
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
} from "@/components/ui/field";
import { StatusSwitch } from "@/components/ui/status-switch";
import {
  type WhtServiceTypeMaster,
  useAccountingMasterMock,
} from "../accounting-master-mock";

export default function WhtServiceTypePage() {
  const store = useAccountingMasterMock();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<WhtServiceTypeMaster | null | undefined>();
  const [deleting, setDeleting] = useState<WhtServiceTypeMaster | null>(null);

  const rows = useMemo(
    () =>
      store.whtServiceTypes.filter((item) =>
        `${item.code} ${item.description} ${item.default_rate}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [search, store.whtServiceTypes],
  );

  const columns = useMemo<ColumnDef<WhtServiceTypeMaster>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Service Type Code" />
        ),
        cell: ({ row }) => (
          <CellAction onClick={() => setEditing(row.original)}>
            <span className="font-mono font-semibold">{row.original.code}</span>
          </CellAction>
        ),
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Service Description" />
        ),
        cell: ({ row }) => (
          <CellAction onClick={() => setEditing(row.original)}>
            {row.original.description}
          </CellAction>
        ),
      },
      {
        accessorKey: "default_rate",
        header: "Default Rate",
        cell: ({ row }) => (
          <Badge variant="outline" size="xs" className="font-mono">
            {row.original.default_rate}%
          </Badge>
        ),
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
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DisplayTemplate
      title="WHT Service Types"
      description="Withholding tax service classifications and statutory deduction rates"
      toolbar={
        <SearchInput
          defaultValue={search}
          onSearch={setSearch}
          onInputChange={setSearch}
        />
      }
      actions={
        <Button size="sm" onClick={() => setEditing(null)}>
          <Plus className="size-4" /> Add Service Type
        </Button>
      }
    >
      <div className="bg-muted/30 flex items-center gap-2 rounded-md px-3 py-2 text-xs">
        <Percent className="text-primary size-4" />
        <span className="font-medium">Tax calculation:</span>
        <span className="text-muted-foreground">
          Service types automatically populate the withholding tax rate and description in AP Payment Vouchers and WHT Certificates.
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
      <WhtServiceTypeDialog
        key={editing?.id ?? "new"}
        open={editing !== undefined}
        item={editing ?? null}
        onOpenChange={(open) => !open && setEditing(undefined)}
        onSave={(value) => {
          store.saveWhtServiceType(value, editing?.id);
          toast.success(
            editing ? "WHT service type updated" : "WHT service type created",
          );
          setEditing(undefined);
        }}
      />
      <DeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete WHT service type?"
        description={
          deleting ? `Delete ${deleting.code} — ${deleting.description}?` : undefined
        }
        onConfirm={() => {
          if (!deleting) return;
          store.deleteWhtServiceType(deleting);
          toast.success("WHT service type deleted");
          setDeleting(null);
        }}
      />
    </DisplayTemplate>
  );
}

function WhtServiceTypeDialog({
  open,
  item,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  item: WhtServiceTypeMaster | null;
  onOpenChange: (open: boolean) => void;
  onSave: (value: Omit<WhtServiceTypeMaster, "id" | "doc_version">) => void;
}) {
  const [code, setCode] = useState(item?.code ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [defaultRate, setDefaultRate] = useState(item?.default_rate ?? "3.00");
  const [active, setActive] = useState(item?.is_active ?? true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Edit WHT Service Type" : "Add WHT Service Type"}</DialogTitle>
          <DialogDescription>
            Withholding tax rate category for vendor payment deductions.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field>
            <FieldLabel htmlFor="wht-code" required>Service Type Code</FieldLabel>
            <FieldInput
              id="wht-code"
              value={code}
              disabled={!!item}
              maxLength={20}
              placeholder="e.g. WHT-SVC, WHT-RENT"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="wht-desc" required>Description</FieldLabel>
            <FieldInput
              id="wht-desc"
              value={description}
              maxLength={100}
              placeholder="e.g. Service Fee (ค่าจ้างทำของ/บริการ)"
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="wht-rate" required>Default Tax Rate (%)</FieldLabel>
            <FieldInput
              id="wht-rate"
              value={defaultRate}
              placeholder="e.g. 1.00, 2.00, 3.00, 5.00"
              onChange={(e) => setDefaultRate(e.target.value)}
            />
          </Field>
          <StatusSwitch
            id="wht-service-type-active"
            checked={active}
            onCheckedChange={setActive}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!code.trim() || !description.trim() || !defaultRate.trim()}
            onClick={() =>
              onSave({
                code,
                description,
                default_rate: defaultRate,
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
