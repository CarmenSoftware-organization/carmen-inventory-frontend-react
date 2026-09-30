import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { CalendarRange, Plus, Unlock, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { ErrorState } from "@/components/ui/error-state";
import { useGlPeriods } from "@/hooks/use-accounting-master";
import { useBuCode } from "@/hooks/use-bu-code";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { ApiError } from "@/lib/api-error";
import { httpClient } from "@/lib/http-client";
import type { GlPeriodMaster } from "@/types/accounting-master";

export default function GlPeriodPage() {
  const buCode = useBuCode();
  const queryClient = useQueryClient();
  const periodQuery = useGlPeriods();
  const periods = useMemo(() => periodQuery.data ?? [], [periodQuery.data]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [generatingYear, setGeneratingYear] = useState(false);
  const [newYearInput, setNewYearInput] = useState<number>(new Date().getFullYear() + 1);
  const [warning, setWarning] = useState("");

  const updatePeriod = useCallback(async (id: string, action: "close" | "reopen") => {
    if (!buCode) throw new Error("Select a business unit first");
    const res = await httpClient.post(
      `${API_ENDPOINTS.GL_PERIODS(buCode)}/${id}/${action}`,
      {},
    );
    if (!res.ok) throw await ApiError.from(res, `Unable to ${action} GL period`);
    await queryClient.invalidateQueries({
      queryKey: ["accounting-master", "gl-periods", buCode],
    });
  }, [buCode, queryClient]);

  const years = useMemo(() => {
    const set = new Set(periods.map((p) => p.fiscal_year));
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [periods]);

  const rows = useMemo(
    () =>
      periods
        .filter((p) => p.fiscal_year === selectedYear)
        .sort((a, b) => a.period_number - b.period_number),
    [selectedYear, periods],
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
                    void updatePeriod(p.id, "close")
                      .then(() => toast.success(`Period ${p.period_number} closed`))
                      .catch((error) =>
                        setWarning(error instanceof Error ? error.message : "Unable to close period"),
                      );
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
                      void updatePeriod(p.id, "reopen")
                        .then(() => toast.success(`Period ${p.period_number} re-opened`))
                        .catch((error) =>
                          setWarning(error instanceof Error ? error.message : "Unable to reopen period"),
                        );
                    }}
                  >
                    <Unlock className="size-3.5 mr-1" />
                    Re-open
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
    [updatePeriod],
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
      {periodQuery.isError && (
        <ErrorState
          error={periodQuery.error}
          message="Unable to load GL periods"
          onRetry={() => void periodQuery.refetch()}
        />
      )}
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
                onChange={(e) => setNewYearInput(Number(e.target.value) || new Date().getFullYear() + 1)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGeneratingYear(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  if (!buCode) throw new Error("Select a business unit first");
                  const res = await httpClient.post(
                    `${API_ENDPOINTS.GL_PERIODS(buCode)}/years`,
                    { fiscal_year: newYearInput },
                  );
                  if (!res.ok) throw await ApiError.from(res, "Unable to generate fiscal year");
                  await queryClient.invalidateQueries({
                    queryKey: ["accounting-master", "gl-periods", buCode],
                  });
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
