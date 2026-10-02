import { StatusBadge } from "@/components/ui/status-badge";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { FileSpreadsheet, Plus } from "lucide-react";
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
import {
  type WhtFormMaster,
  useAccountingMasterMock,
} from "../accounting-master-mock";
import { LookupChartOfAccount } from "@/components/lookup/lookup-chart-of-account";

const FORM_TYPES = [
  { value: "pnd1", label: "ภ.ง.ด. 1 (เงินเดือนและค่าจ้างพนักงาน)" },
  { value: "pnd2", label: "ภ.ง.ด. 2 (ดอกเบี้ย เงินปันผล)" },
  { value: "pnd3", label: "ภ.ง.ด. 3 (หัก ณ ที่จ่ายบุคคลธรรมดา)" },
  { value: "pnd53", label: "ภ.ง.ด. 53 (หัก ณ ที่จ่ายนิติบุคคล)" },
  { value: "pnd54", label: "ภ.ง.ด. 54 (ส่งไปต่างประเทศ)" },
];

export default function WhtFormPage() {
  const store = useAccountingMasterMock();
  const [search, setSearch] = useState("");
  const [detailOnly, setDetailOnly] = useState(false);
  const [editing, setEditing] = useState<WhtFormMaster | null | undefined>();
  const [deleting, setDeleting] = useState<WhtFormMaster | null>(null);

  const rows = useMemo(
    () =>
      store.whtForms.filter((item) =>
        `${item.code} ${item.description} ${item.form_type} ${item.gl_account_id ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [search, store.whtForms],
  );

  const columns = useMemo<ColumnDef<WhtFormMaster>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Form Code" />
        ),
        cell: ({ row }) => (
          <CellAction onClick={() => { setDetailOnly(true); setEditing(row.original); }}>
            <span className="font-mono font-semibold">{row.original.code}</span>
          </CellAction>
        ),
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Form Description" />
        ),
        cell: ({ row }) => (
          <CellAction onClick={() => { setDetailOnly(true); setEditing(row.original); }}>
            {row.original.description}
          </CellAction>
        ),
      },
      {
        accessorKey: "form_type",
        header: "Form Type",
        cell: ({ row }) => (
          <Badge data-standard-chip="" variant="outline" size="sm" className="uppercase font-mono">
            {row.original.form_type}
          </Badge>
        ),
      },
      {
        accessorKey: "gl_account_id",
        header: "GL Control Account",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.gl_account_id || "—"}</span>
        ),
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge active={row.original.is_active} />
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DataGridRowActions
            activity={{ id: row.original.id, disabled: true, disabledTitle: "Activity is unavailable for mock data" }}

            onEdit={() => { setDetailOnly(false); setEditing(row.original); }}
            onDelete={() => setDeleting(row.original)}
          />
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
      title="WHT Tax Return Forms"
      description="Statutory Thai Revenue Department tax filing forms (ภ.ง.ด. 1/2/3/53/54) and GL liability mapping"
      toolbar={
        <SearchInput
          defaultValue={search}
          onSearch={setSearch}
          onInputChange={setSearch}
        />
      }
      actions={
        <Button size="sm" onClick={() => setEditing(null)}>
          <Plus className="size-4" /> Add WHT Form
        </Button>
      }
    >
      <div className="bg-muted/30 flex items-center gap-2 rounded-md px-3 py-2 text-xs">
        <FileSpreadsheet className="text-primary size-4" />
        <span className="font-medium">Statutory reporting:</span>
        <span className="text-muted-foreground">
          Maps withholding tax lines to specific Thai Revenue Department filing categories and balance sheet payable accounts.
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
      <WhtFormDialog
        readOnly={detailOnly}
        key={editing?.id ?? "new"}
        open={editing !== undefined}
        item={editing ?? null}
        onOpenChange={(open) => { if (!open) { setEditing(undefined); setDetailOnly(false); } }}
        onSave={(value) => {
          store.saveWhtForm(value, editing?.id);
          toast.success(
            editing ? "WHT form updated" : "WHT form created",
          );
          setEditing(undefined);
        }}
      />
      <DeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete WHT form?"
        description={
          deleting ? `Delete ${deleting.code} — ${deleting.description}?` : undefined
        }
        onConfirm={() => {
          if (!deleting) return;
          store.deleteWhtForm(deleting);
          toast.success("WHT form deleted");
          setDeleting(null);
        }}
      />
    </DisplayTemplate>
  );
}

function WhtFormDialog({
  open,
  readOnly = false,
  item,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  readOnly?: boolean;
  item: WhtFormMaster | null;
  onOpenChange: (open: boolean) => void;
  onSave: (value: Omit<WhtFormMaster, "id" | "doc_version">) => void;
}) {
  const [code, setCode] = useState(item?.code ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [formType, setFormType] = useState(item?.form_type ?? "pnd3");
  const [glAccountId, setGlAccountId] = useState(item?.gl_account_id ?? "");
  const [active, setActive] = useState(item?.is_active ?? true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{readOnly ? "WHT Form Detail" : item ? "Edit WHT Form" : "Add WHT Form"}</DialogTitle>
          <DialogDescription>
            Configuration for statutory withholding tax filing and liability mapping.
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={readOnly} className="grid gap-4 py-2">
          <Field>
            <FieldLabel htmlFor="form-code" required>Form Code</FieldLabel>
            <FieldInput
              id="form-code"
              value={code}
              disabled={!!item}
              maxLength={20}
              placeholder="e.g. PND3, PND53"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="form-desc" required>Form Description</FieldLabel>
            <FieldInput
              id="form-desc"
              value={description}
              maxLength={100}
              placeholder="e.g. ภ.ง.ด. 3 (บุคคลธรรมดา)"
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel required>Form Type</FieldLabel>
            <FieldSelect value={formType} onValueChange={setFormType}>
              <SelectContent>
                {FORM_TYPES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </FieldSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="form-gl">GL Liability Account</FieldLabel>
            <LookupChartOfAccount
              value={glAccountId}
              category="liability"
              placeholder="Select liability GL account"
              onValueChange={setGlAccountId}
            />
          </Field>
          <StatusSwitch
            id="wht-form-active"
            checked={active}
            onCheckedChange={setActive}
          />
        </fieldset>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && <Button
            disabled={!code.trim() || !description.trim()}
            onClick={() =>
              onSave({
                code,
                description,
                form_type: formType,
                gl_account_id: glAccountId || null,
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
