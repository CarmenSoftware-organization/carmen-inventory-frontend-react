import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Landmark, Plus } from "lucide-react";
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
import { WarningDialog } from "@/components/ui/warning-dialog";
import {
  type BankAccountMaster,
  useAccountingMasterMock,
} from "../accounting-master-mock";
import { LookupChartOfAccount } from "@/components/lookup/lookup-chart-of-account";

export default function BankAccountPage() {
  const store = useAccountingMasterMock();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<BankAccountMaster | null | undefined>();
  const [deleting, setDeleting] = useState<BankAccountMaster | null>(null);
  const [warning, setWarning] = useState("");

  const rows = useMemo(
    () =>
      store.bankAccounts.filter((item) =>
        `${item.bank_name} ${item.account_number} ${item.account_name} ${item.branch_name ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [search, store.bankAccounts],
  );

  const columns = useMemo<ColumnDef<BankAccountMaster>[]>(
    () => [
      {
        accessorKey: "bank_name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Bank Name" />
        ),
        cell: ({ row }) => (
          <CellAction onClick={() => setEditing(row.original)}>
            <span className="font-semibold">{row.original.bank_name}</span>
          </CellAction>
        ),
      },
      {
        accessorKey: "account_number",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Account Number" />
        ),
        cell: ({ row }) => (
          <span className="font-mono">{row.original.account_number}</span>
        ),
      },
      {
        accessorKey: "account_name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Account Name" />
        ),
        cell: ({ row }) => row.original.account_name,
      },
      {
        accessorKey: "branch_name",
        header: "Branch",
        cell: ({ row }) => row.original.branch_name || "—",
      },
      {
        accessorKey: "gl_account_id",
        header: "GL Account",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.gl_account_id || "—"}</span>
        ),
      },
      {
        accessorKey: "currency_code",
        header: "Currency",
        cell: ({ row }) => (
          <Badge variant="outline" size="xs">
            {row.original.currency_code}
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
      title="Bank Accounts"
      description="Business unit bank accounts used for AP payments, AR receipts, and cash management"
      toolbar={
        <SearchInput
          defaultValue={search}
          onSearch={setSearch}
          onInputChange={setSearch}
        />
      }
      actions={
        <Button size="sm" onClick={() => setEditing(null)}>
          <Plus className="size-4" /> Add Bank Account
        </Button>
      }
    >
      <div className="bg-muted/30 flex items-center gap-2 rounded-md px-3 py-2 text-xs">
        <Landmark className="text-primary size-4" />
        <span className="font-medium">GL integration:</span>
        <span className="text-muted-foreground">
          Each bank account links to a Chart of Accounts control account for automatic journal posting on AP/AR settlement.
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
      <BankAccountDialog
        key={editing?.id ?? "new"}
        open={editing !== undefined}
        item={editing ?? null}
        onOpenChange={(open) => !open && setEditing(undefined)}
        onSave={(value) => {
          try {
            store.saveBankAccount(value, editing?.id);
            toast.success(
              editing ? "Bank account updated" : "Bank account created",
            );
            setEditing(undefined);
          } catch (error) {
            setWarning(
              error instanceof Error ? error.message : "Unable to save bank account",
            );
          }
        }}
      />
      <DeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete bank account?"
        description={
          deleting ? `Delete ${deleting.bank_name} (${deleting.account_number})?` : undefined
        }
        onConfirm={() => {
          if (!deleting) return;
          try {
            store.deleteBankAccount(deleting);
            toast.success("Bank account deleted");
            setDeleting(null);
          } catch (error) {
            setDeleting(null);
            setWarning(
              error instanceof Error ? error.message : "Unable to delete bank account",
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

function BankAccountDialog({
  open,
  item,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  item: BankAccountMaster | null;
  onOpenChange: (open: boolean) => void;
  onSave: (
    value: Omit<BankAccountMaster, "id" | "doc_version">,
  ) => void;
}) {
  const [bankName, setBankName] = useState(item?.bank_name ?? "");
  const [accountNumber, setAccountNumber] = useState(item?.account_number ?? "");
  const [accountName, setAccountName] = useState(item?.account_name ?? "");
  const [branchName, setBranchName] = useState(item?.branch_name ?? "");
  const [glAccountId, setGlAccountId] = useState(item?.gl_account_id ?? "");
  const [currencyCode, setCurrencyCode] = useState(item?.currency_code ?? "THB");
  const [active, setActive] = useState(item?.is_active ?? true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit Bank Account" : "Add Bank Account"}
          </DialogTitle>
          <DialogDescription>
            Account details for financial operations and GL control mapping.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="bank-name" required>
              Bank Name
            </FieldLabel>
            <FieldInput
              id="bank-name"
              value={bankName}
              placeholder="e.g. Kasikorn Bank (KBANK)"
              onChange={(e) => setBankName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="bank-acc-no" required>
              Account Number
            </FieldLabel>
            <FieldInput
              id="bank-acc-no"
              value={accountNumber}
              placeholder="e.g. 123-4-56789-0"
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="bank-curr" required>
              Currency
            </FieldLabel>
            <FieldInput
              id="bank-curr"
              value={currencyCode}
              maxLength={3}
              placeholder="THB"
              onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="bank-acc-name" required>
              Account Name
            </FieldLabel>
            <FieldInput
              id="bank-acc-name"
              value={accountName}
              placeholder="e.g. Company Limited"
              onChange={(e) => setAccountName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="bank-branch">
              Branch Name
            </FieldLabel>
            <FieldInput
              id="bank-branch"
              value={branchName}
              placeholder="e.g. Silom Complex"
              onChange={(e) => setBranchName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="bank-gl">
              GL Account Code
            </FieldLabel>
            <LookupChartOfAccount
              value={glAccountId}
              category="asset"
              placeholder="Select asset GL account"
              onValueChange={setGlAccountId}
            />
          </Field>
          <div className="sm:col-span-2">
            <StatusSwitch
              id="bank-account-active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!bankName.trim() || !accountNumber.trim() || !accountName.trim()}
            onClick={() =>
              onSave({
                bank_name: bankName,
                account_number: accountNumber,
                account_name: accountName,
                branch_name: branchName || null,
                gl_account_id: glAccountId || null,
                currency_code: currencyCode,
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
