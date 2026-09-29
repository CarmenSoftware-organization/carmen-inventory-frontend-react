import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { CalendarRange, Plus, Lock, Unlock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import DisplayTemplate from "@/components/display-template";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
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
import { WarningDialog } from "@/components/ui/warning-dialog";
import {
  type GlPeriodMaster,
  useAccountingMasterMock,
} from "../accounting-master-mock";

export default function GlPeriodPage() {
  const store = useAccountingMasterMock();
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [generatingYear, setGeneratingYear] = useState(false);
  const [newYearInput, setNewYearInput] = useState<number>(2027);
  const [warning, setWarning] = useState("");

  const years = useMemo(() => {
    const set = new Set(store.glPeriods.map((p) => p.fiscal_year));
    set.add(2026);
    return Array.from(set).sort((a, b) => b - a);
  }, [store.glPeriods]);

  const rows = useMemo(
    () =>
      store.glPeriods
        .filter((p) => p.fiscal_year === selectedYear)
        .sort((a, b) => a.period_number - b.period_number),
    [selectedYear, store.glPeriods],
  );

  const columns = useMemo<ColumnDef<GlPeriodMaster>[]>(
    () => [
      {
        accessorKey: "period_number",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Period #" />
        ),
        cell: ({ row }) => (
          <span className="font-mono font-bold">
            {row.original.period_number === 13
              ? "Period 13 (Year-end Adj)"
              : `Period ${row.original.period_number}`}
          </span>
        ),
      },
      {
        accessorKey: "fiscal_year",
        header: "Fiscal Year",
        cell: ({ row }) => (
          <span className="font-mono">{row.original.fiscal_year}</span>
        ),
      },
      {
        accessorKey: "start_date",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Start Date" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.start_date}</span>
        ),
      },
      {
        accessorKey: "end_date",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="End Date" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.end_date}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = row.original.status;
          const variant =
            s === "open"
              ? "success-light"
              : s === "closed"
                ? "warning-light"
                : "invert-light";
          return (
            <Badge variant={variant} size="xs" className="uppercase font-mono">
              {s}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex justify-end gap-1">
              {p.status === "open" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    store.setPeriodStatus(p.id, "closed");
                    toast.success(`Period ${p.period_number} closed`);
                  }}
                >
                  <CheckCircle2 className="size-3.5 mr-1" />
                  Close Period
                </Button>
              )}
              {p.status === "closed" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      store.setPeriodStatus(p.id, "open");
                      toast.success(`Period ${p.period_number} re-opened`);
                    }}
                  >
                    <Unlock className="size-3.5 mr-1" />
                    Re-open
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      store.setPeriodStatus(p.id, "locked");
                      toast.success(`Period ${p.period_number} locked`);
                    }}
                  >
                    <Lock className="size-3.5 mr-1" />
                    Lock
                  </Button>
                </>
              )}
              {p.status === "locked" && (
                <span className="text-xs text-muted-foreground self-center px-2">
                  Locked
                </span>
              )}
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [store],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DisplayTemplate
      title="Accounting GL Periods"
      description="Fiscal year accounting periods control document posting dates and period-end close"
      toolbar={
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Fiscal Year:</span>
          <div className="flex gap-1">
            {years.map((y) => (
              <Button
                key={y}
                size="sm"
                variant={selectedYear === y ? "default" : "outline"}
                className="h-8 text-xs font-mono"
                onClick={() => setSelectedYear(y)}
              >
                {y}
              </Button>
            ))}
          </div>
        </div>
      }
      actions={
        <Button size="sm" onClick={() => setGeneratingYear(true)}>
          <Plus className="size-4" /> Generate Fiscal Year
        </Button>
      }
    >
      <div className="bg-muted/30 flex items-center gap-2 rounded-md px-3 py-2 text-xs">
        <CalendarRange className="text-primary size-4" />
        <span className="font-medium">13-Period structure:</span>
        <span className="text-muted-foreground">
          Generates 12 regular monthly calendar periods plus Period 13 specifically dedicated for year-end audit adjustments.
        </span>
      </div>
      <DataGrid
        table={table}
        recordCount={rows.length}
        emptyMessage={
          <div className="p-8 text-center text-sm text-muted-foreground">
            No periods generated for fiscal year {selectedYear}.
          </div>
        }
        tableLayout={{ width: "auto", headerSticky: true }}
        tableClassNames={{ bodyRow: "h-10" }}
      >
        <DataGridContainer scroll className="max-h-[calc(100vh-14rem)]">
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>

      <Dialog open={generatingYear} onOpenChange={setGeneratingYear}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Fiscal Year Periods</DialogTitle>
            <DialogDescription>
              Automatically creates 12 monthly periods and 1 year-end adjustment period for the specified year.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Field>
              <FieldLabel htmlFor="fiscal-year-input" required>
                Fiscal Year (e.g. 2027)
              </FieldLabel>
              <FieldInput
                id="fiscal-year-input"
                type="number"
                value={newYearInput}
                onChange={(e) => setNewYearInput(Number(e.target.value) || 2027)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGeneratingYear(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                try {
                  store.generatePeriods(newYearInput);
                  setSelectedYear(newYearInput);
                  toast.success(`13 periods generated for FY ${newYearInput}`);
                  setGeneratingYear(false);
                } catch (err) {
                  setWarning(err instanceof Error ? err.message : "Unable to generate fiscal year");
                }
              }}
            >
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WarningDialog
        open={!!warning}
        title="Action blocked"
        description={warning}
        onConfirm={() => setWarning("")}
      />
    </DisplayTemplate>
  );
}
