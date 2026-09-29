import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { CreditCard, Plus } from "lucide-react";
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
import {
  type PaymentTypeMaster,
  useAccountingMasterMock,
} from "../accounting-master-mock";

const PAYMENT_METHODS = [
  { value: "transfer", label: "Bank Transfer (โอนเงินผ่านธนาคาร)" },
  { value: "cheque", label: "Bank Cheque (เช็คธนาคาร)" },
  { value: "cash", label: "Cash / Petty Cash (เงินสด/เงินสดย่อย)" },
  { value: "credit_card", label: "Credit Card (บัตรเครดิต)" },
  { value: "other", label: "Other (อื่นๆ)" },
];

export default function PaymentTypePage() {
  const store = useAccountingMasterMock();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PaymentTypeMaster | null | undefined>();
  const [deleting, setDeleting] = useState<PaymentTypeMaster | null>(null);

  const rows = useMemo(
    () =>
      store.paymentTypes.filter((item) =>
        `${item.code} ${item.description} ${item.description_local ?? ""} ${item.payment_method}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [search, store.paymentTypes],
  );

  const columns = useMemo<ColumnDef<PaymentTypeMaster>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Payment Type Code" />
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
          <DataGridColumnHeader column={column} title="Description (EN)" />
        ),
        cell: ({ row }) => (
          <CellAction onClick={() => setEditing(row.original)}>
            {row.original.description}
          </CellAction>
        ),
      },
      {
        accessorKey: "description_local",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Description (TH)" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.description_local || "—"}
          </span>
        ),
      },
      {
        accessorKey: "payment_method",
        header: "Method",
        cell: ({ row }) => (
          <Badge variant="outline" size="xs" className="uppercase font-mono">
            {row.original.payment_method}
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
      title="Payment Types"
      description="Methods and payment options used for Accounts Payable and Accounts Receivable"
      toolbar={
        <SearchInput
          defaultValue={search}
          onSearch={setSearch}
          onInputChange={setSearch}
        />
      }
      actions={
        <Button size="sm" onClick={() => setEditing(null)}>
          <Plus className="size-4" /> Add Payment Type
        </Button>
      }
    >
      <div className="bg-muted/30 flex items-center gap-2 rounded-md px-3 py-2 text-xs">
        <CreditCard className="text-primary size-4" />
        <span className="font-medium">Settlement integration:</span>
        <span className="text-muted-foreground">
          Payment types categorize AP Payment Vouchers and AR Receipts according to payment instruments.
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
      <PaymentTypeDialog
        key={editing?.id ?? "new"}
        open={editing !== undefined}
        item={editing ?? null}
        onOpenChange={(open) => !open && setEditing(undefined)}
        onSave={(value) => {
          store.savePaymentType(value, editing?.id);
          toast.success(
            editing ? "Payment type updated" : "Payment type created",
          );
          setEditing(undefined);
        }}
      />
      <DeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete payment type?"
        description={
          deleting ? `Delete ${deleting.code} — ${deleting.description}?` : undefined
        }
        onConfirm={() => {
          if (!deleting) return;
          store.deletePaymentType(deleting);
          toast.success("Payment type deleted");
          setDeleting(null);
        }}
      />
    </DisplayTemplate>
  );
}

function PaymentTypeDialog({
  open,
  item,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  item: PaymentTypeMaster | null;
  onOpenChange: (open: boolean) => void;
  onSave: (value: Omit<PaymentTypeMaster, "id" | "doc_version">) => void;
}) {
  const [code, setCode] = useState(item?.code ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [descriptionLocal, setDescriptionLocal] = useState(item?.description_local ?? "");
  const [paymentMethod, setPaymentMethod] = useState(item?.payment_method ?? "transfer");
  const [active, setActive] = useState(item?.is_active ?? true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Payment Type" : "Add Payment Type"}</DialogTitle>
          <DialogDescription>
            Defines the payment instrument for financial transactions.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field>
            <FieldLabel htmlFor="pm-code" required>Payment Type Code</FieldLabel>
            <FieldInput
              id="pm-code"
              value={code}
              disabled={!!item}
              maxLength={20}
              placeholder="e.g. TRANSFER, CHEQUE, CASH"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="pm-desc" required>Description (EN)</FieldLabel>
            <FieldInput
              id="pm-desc"
              value={description}
              maxLength={100}
              placeholder="e.g. Bank Transfer"
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="pm-desc-local">Description (TH)</FieldLabel>
            <FieldInput
              id="pm-desc-local"
              value={descriptionLocal}
              maxLength={100}
              placeholder="e.g. โอนเงินผ่านธนาคาร"
              onChange={(e) => setDescriptionLocal(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel required>Payment Method</FieldLabel>
            <FieldSelect value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </FieldSelect>
          </Field>
          <StatusSwitch
            id="payment-type-active"
            checked={active}
            onCheckedChange={setActive}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!code.trim() || !description.trim()}
            onClick={() =>
              onSave({
                code,
                description,
                description_local: descriptionLocal || null,
                payment_method: paymentMethod,
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
