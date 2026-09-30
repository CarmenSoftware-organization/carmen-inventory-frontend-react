import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Layers, Plus, ListTree } from "lucide-react";
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
import { ErrorState } from "@/components/ui/error-state";
import { useBuCode } from "@/hooks/use-bu-code";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { ApiError } from "@/lib/api-error";
import { httpClient } from "@/lib/http-client";
import type { DimensionMaster, DimensionValueMaster } from "@/types/accounting-master";

export default function DimensionPage() {
  const buCode = useBuCode();
  const queryClient = useQueryClient();
  const dimensionQuery = useQuery({
    queryKey: ["accounting-master", "dimensions", buCode],
    enabled: !!buCode,
    queryFn: async (): Promise<DimensionMaster[]> => {
      const res = await httpClient.get(API_ENDPOINTS.GL_DIMENSIONS(buCode!));
      if (!res.ok) throw await ApiError.from(res, "Unable to load dimensions");
      const json = await res.json();
      return Array.isArray(json) ? json : (json.data ?? []);
    },
  });
  const valueQuery = useQuery({
    queryKey: ["accounting-master", "dimension-values", buCode],
    enabled: !!buCode,
    queryFn: async (): Promise<DimensionValueMaster[]> => {
      const res = await httpClient.get(API_ENDPOINTS.GL_DIMENSION_VALUES(buCode!));
      if (!res.ok) throw await ApiError.from(res, "Unable to load dimension values");
      const json = await res.json();
      const items = Array.isArray(json) ? json : (json.data ?? []);
      return items.map((item: DimensionValueMaster & { gl_dimension_id: string }) => ({
        ...item,
        dimension_id: item.gl_dimension_id,
      }));
    },
  });
  const dimensions = useMemo(
    () => (dimensionQuery.data ?? []).map((dimension) => ({
      ...dimension,
      values: (valueQuery.data ?? []).filter(
        (value) => value.dimension_id === dimension.id,
      ),
    })),
    [dimensionQuery.data, valueQuery.data],
  );
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<DimensionMaster | null | undefined>();
  const [viewingValuesId, setViewingValuesId] = useState<string | null>(null);
  const viewingValues = dimensions.find((dimension) => dimension.id === viewingValuesId) ?? null;
  const [deleting, setDeleting] = useState<DimensionMaster | null>(null);
  const [warning, setWarning] = useState("");

  const mutateValue = async (request: () => Promise<Response>, success: string) => {
    try {
      if (!buCode) throw new Error("Select a business unit first");
      const res = await request();
      if (!res.ok) throw await ApiError.from(res, "Unable to save dimension value");
      await queryClient.invalidateQueries({
        queryKey: ["accounting-master", "dimension-values", buCode],
      });
      toast.success(success);
      return true;
    } catch (error) {
      setWarning(error instanceof Error ? error.message : "Unable to save dimension value");
      return false;
    }
  };

  const rows = useMemo(
    () =>
      dimensions.filter((item) =>
        `${item.code} ${item.name} ${item.name_local ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [search, dimensions],
  );

  const columns = useMemo<ColumnDef<DimensionMaster>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Dimension Code" />
        ),
        cell: ({ row }) => (
          <CellAction onClick={() => setEditing(row.original)}>
            <span className="font-mono font-semibold">{row.original.code}</span>
          </CellAction>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Dimension Name (EN)" />
        ),
        cell: ({ row }) => (
          <CellAction onClick={() => setEditing(row.original)}>
            {row.original.name}
          </CellAction>
        ),
      },
      {
        accessorKey: "name_local",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Dimension Name (TH)" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.name_local || "—"}
          </span>
        ),
      },
      {
        accessorKey: "sequence",
        header: "Sequence",
        cell: ({ row }) => (
          <Badge variant="outline" size="xs">
            Seq {row.original.sequence}
          </Badge>
        ),
      },
      {
        id: "values_count",
        header: "Sub-Values",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setViewingValuesId(row.original.id)}
          >
            <ListTree className="size-3.5 mr-1" />
            {(row.original.values ?? []).length} values
          </Button>
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
      title="Accounting Dimensions"
      description="Analytical dimensions and segment values for GL entries and reporting"
      toolbar={
        <SearchInput
          defaultValue={search}
          onSearch={setSearch}
          onInputChange={setSearch}
        />
      }
      actions={
        <Button size="sm" onClick={() => setEditing(null)}>
          <Plus className="size-4" /> Add Dimension
        </Button>
      }
    >
      <div className="bg-muted/30 flex items-center gap-2 rounded-md px-3 py-2 text-xs">
        <Layers className="text-primary size-4" />
        <span className="font-medium">Multi-dimensional accounting:</span>
        <span className="text-muted-foreground">
          Each dimension allows sub-codes (e.g. Market Segments, Channels) for tag-based GL allocation and budgeting.
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
      {(dimensionQuery.isError || valueQuery.isError) && (
        <ErrorState
          error={dimensionQuery.error ?? valueQuery.error}
          message="Unable to load dimensions"
          onRetry={() => {
            void dimensionQuery.refetch();
            void valueQuery.refetch();
          }}
        />
      )}
      <DimensionDialog
        key={editing?.id ?? "new"}
        open={editing !== undefined}
        item={editing ?? null}
        onOpenChange={(open) => !open && setEditing(undefined)}
        onSave={async (value) => {
          try {
            if (!buCode) throw new Error("Select a business unit first");
            const endpoint = API_ENDPOINTS.GL_DIMENSIONS(buCode);
            const res = editing
              ? await httpClient.put(`${endpoint}/${editing.id}`, {
                  name: value.name,
                  name_local: value.name_local,
                  sequence: value.sequence,
                  is_active: value.is_active,
                  doc_version: editing.doc_version,
                })
              : await httpClient.post(endpoint, value);
            if (!res.ok) throw await ApiError.from(res, "Unable to save dimension");
            await queryClient.invalidateQueries({
              queryKey: ["accounting-master", "dimensions", buCode],
            });
            toast.success(
              editing ? "Dimension updated" : "Dimension created",
            );
            setEditing(undefined);
          } catch (error) {
            setWarning(
              error instanceof Error ? error.message : "Unable to save dimension",
            );
          }
        }}
      />
      {viewingValues && (
        <DimensionValuesDialog
          open={!!viewingValues}
          dimension={viewingValues}
          onOpenChange={(open) => !open && setViewingValuesId(null)}
          onAddValue={async (val) => {
            const currentVals = viewingValues.values ?? [];
            if (currentVals.some((v) => v.code.toUpperCase() === val.code.toUpperCase())) {
              toast.error(`Value ${val.code} already exists.`);
              return false;
            }
            return mutateValue(
              () => httpClient.post(API_ENDPOINTS.GL_DIMENSION_VALUES(buCode!), {
                gl_dimension_id: viewingValues.id,
                ...val,
              }),
              "Dimension value added",
            );
          }}
          onUpdateValue={(val) => {
            return mutateValue(
              () => httpClient.put(`${API_ENDPOINTS.GL_DIMENSION_VALUES(buCode!)}/${val.id}`, {
                name: val.name,
                name_local: val.name_local,
                is_active: val.is_active,
                doc_version: val.doc_version,
              }),
              "Dimension value updated",
            );
          }}
          onToggleStatus={(id) => {
            const value = viewingValues.values?.find((item) => item.id === id);
            if (!value) return Promise.resolve(false);
            return mutateValue(
              () => httpClient.put(`${API_ENDPOINTS.GL_DIMENSION_VALUES(buCode!)}/${id}`, {
                name: value.name,
                name_local: value.name_local,
                is_active: !value.is_active,
                doc_version: value.doc_version,
              }),
              "Status toggled",
            );
          }}
          onDeleteValue={(id) => {
            return mutateValue(
              () => httpClient.delete(`${API_ENDPOINTS.GL_DIMENSION_VALUES(buCode!)}/${id}`),
              "Dimension value removed",
            );
          }}
        />
      )}
      <DeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete dimension?"
        description={
          deleting ? `Delete ${deleting.code} — ${deleting.name}?` : undefined
        }
        onConfirm={async () => {
          if (!deleting) return;
          try {
            if (!buCode) throw new Error("Select a business unit first");
            const res = await httpClient.delete(
              `${API_ENDPOINTS.GL_DIMENSIONS(buCode)}/${deleting.id}`,
            );
            if (!res.ok) throw await ApiError.from(res, "Unable to delete dimension");
            await queryClient.invalidateQueries({
              queryKey: ["accounting-master", "dimensions", buCode],
            });
            toast.success("Dimension deleted");
            setDeleting(null);
          } catch (error) {
            setDeleting(null);
            setWarning(
              error instanceof Error ? error.message : "Unable to delete dimension",
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

function DimensionDialog({
  open,
  item,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  item: DimensionMaster | null;
  onOpenChange: (open: boolean) => void;
  onSave: (
    value: Omit<DimensionMaster, "id" | "doc_version" | "values">,
  ) => void;
}) {
  const [code, setCode] = useState(item?.code ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [nameLocal, setNameLocal] = useState(item?.name_local ?? "");
  const [sequence, setSequence] = useState(item?.sequence ?? 1);
  const [active, setActive] = useState(item?.is_active ?? true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit Dimension" : "Add Dimension"}
          </DialogTitle>
          <DialogDescription>
            Defines a category of analytical tags (e.g., market segment, project).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field>
            <FieldLabel htmlFor="dim-code" required>
              Dimension Code (lowercase/underscore)
            </FieldLabel>
            <FieldInput
              id="dim-code"
              value={code}
              disabled={!!item}
              maxLength={20}
              placeholder="e.g. market, project, event"
              onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="dim-name" required>
              Dimension Name (EN)
            </FieldLabel>
            <FieldInput
              id="dim-name"
              value={name}
              maxLength={100}
              placeholder="e.g. Market Segment"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="dim-name-local">
              Dimension Name (TH)
            </FieldLabel>
            <FieldInput
              id="dim-name-local"
              value={nameLocal}
              maxLength={100}
              placeholder="e.g. กลุ่มตลาด"
              onChange={(e) => setNameLocal(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="dim-seq" required>
              Sequence (1–10)
            </FieldLabel>
            <FieldInput
              id="dim-seq"
              type="number"
              min={1}
              max={10}
              value={sequence}
              onChange={(e) => setSequence(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
            />
          </Field>
          <StatusSwitch
            id="dim-active"
            checked={active}
            onCheckedChange={setActive}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!code.trim() || !name.trim()}
            onClick={() =>
              onSave({
                code,
                name,
                name_local: nameLocal || null,
                sequence,
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

function DimensionValuesDialog({
  open,
  dimension,
  onOpenChange,
  onAddValue,
  onUpdateValue,
  onToggleStatus,
  onDeleteValue,
}: {
  open: boolean;
  dimension: DimensionMaster;
  onOpenChange: (open: boolean) => void;
  onAddValue: (val: Omit<DimensionValueMaster, "id" | "dimension_id" | "doc_version">) => Promise<boolean>;
  onUpdateValue: (val: DimensionValueMaster) => Promise<boolean>;
  onToggleStatus: (id: string) => Promise<boolean>;
  onDeleteValue: (id: string) => Promise<boolean>;
}) {
  const [valCode, setValCode] = useState("");
  const [valName, setValName] = useState("");
  const [valNameLocal, setValNameLocal] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editNameLocal, setEditNameLocal] = useState("");
  const values = dimension.values ?? [];

  const startEdit = (v: DimensionValueMaster) => {
    setEditingId(v.id);
    setEditCode(v.code);
    setEditName(v.name);
    setEditNameLocal(v.name_local ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (original: DimensionValueMaster) => {
    if (!editCode.trim() || !editName.trim()) {
      toast.error("Code and Name (EN) are required");
      return;
    }
    const saved = await onUpdateValue({
      ...original,
      code: editCode.trim().toUpperCase(),
      name: editName.trim(),
      name_local: editNameLocal.trim() || null,
    });
    if (saved) setEditingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Sub-Values for {dimension.name} ({dimension.code})
          </DialogTitle>
          <DialogDescription>
            Manage allowed values and active status for this dimension.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Add form */}
          <div className="bg-muted/30 p-3 rounded-md grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <Field>
              <FieldLabel className="text-xs" required>Code</FieldLabel>
              <FieldInput
                value={valCode}
                placeholder="e.g. CORP"
                className="h-8 text-xs"
                onChange={(e) => setValCode(e.target.value.toUpperCase())}
              />
            </Field>
            <Field>
              <FieldLabel className="text-xs" required>Name (EN)</FieldLabel>
              <FieldInput
                value={valName}
                placeholder="e.g. Corporate"
                className="h-8 text-xs"
                onChange={(e) => setValName(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel className="text-xs">Name (TH)</FieldLabel>
              <FieldInput
                value={valNameLocal}
                placeholder="e.g. องค์กร"
                className="h-8 text-xs"
                onChange={(e) => setValNameLocal(e.target.value)}
              />
            </Field>
            <Button
              size="sm"
              className="h-8"
              disabled={!valCode.trim() || !valName.trim()}
              onClick={async () => {
                const saved = await onAddValue({
                  code: valCode.trim().toUpperCase(),
                  name: valName.trim(),
                  name_local: valNameLocal.trim() || null,
                  is_active: true,
                });
                if (saved) {
                  setValCode("");
                  setValName("");
                  setValNameLocal("");
                }
              }}
            >
              <Plus className="size-3.5 mr-1" /> Add Value
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-md overflow-hidden max-h-60 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-2 text-left">Code</th>
                  <th className="p-2 text-left">Name (EN)</th>
                  <th className="p-2 text-left">Name (TH)</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {values.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No sub-values defined yet.
                    </td>
                  </tr>
                ) : (
                  values.map((v) => {
                    const isEditing = editingId === v.id;
                    return (
                      <tr key={v.id} className={isEditing ? "bg-muted/40" : undefined}>
                        {isEditing ? (
                          <>
                            <td className="p-2">
                              <FieldInput
                                value={editCode}
                                disabled
                                className="h-7 text-xs font-mono font-medium"
                                onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                              />
                            </td>
                            <td className="p-2">
                              <FieldInput
                                value={editName}
                                className="h-7 text-xs"
                                onChange={(e) => setEditName(e.target.value)}
                              />
                            </td>
                            <td className="p-2">
                              <FieldInput
                                value={editNameLocal}
                                placeholder="TH (optional)"
                                className="h-7 text-xs"
                                onChange={(e) => setEditNameLocal(e.target.value)}
                              />
                            </td>
                            <td className="p-2">
                              <button
                                type="button"
                                onClick={() => void onToggleStatus(v.id)}
                                title="Click to toggle status"
                                className="inline-flex cursor-pointer transition-opacity hover:opacity-80"
                              >
                                <Badge variant={v.is_active ? "success-light" : "invert-light"} size="xs">
                                  {v.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </button>
                            </td>
                            <td className="p-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => void saveEdit(v)}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  onClick={cancelEdit}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 font-mono font-medium">{v.code}</td>
                            <td className="p-2">{v.name}</td>
                            <td className="p-2 text-muted-foreground">{v.name_local || "—"}</td>
                            <td className="p-2">
                              <button
                                type="button"
                                onClick={() => void onToggleStatus(v.id)}
                                title="Click to toggle status"
                                className="inline-flex cursor-pointer transition-opacity hover:opacity-80"
                              >
                                <Badge variant={v.is_active ? "success-light" : "invert-light"} size="xs">
                                  {v.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </button>
                            </td>
                            <td className="p-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => startEdit(v)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                                  onClick={() => void onDeleteValue(v.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
