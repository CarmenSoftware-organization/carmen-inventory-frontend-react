"use no memo";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import type { MoqTierDto } from "@/types/price-list-external";

interface MoqTiersSubTableProps {
  tiers: MoqTierDto[];
  onTiersUpdate?: (tiers: MoqTierDto[]) => void;
}

/**
 * Sub-table แสดงและแก้ไขรายการ MOQ tiers (ขั้นต่ำ/ราคา/lead time) ของสินค้าแต่ละรายการ
 * รองรับการเพิ่ม แก้ไข และลบ tier พร้อม sync กับ parent ผ่าน onTiersUpdate
 *
 * @param props - tiers ปัจจุบันและ callback เมื่อมีการเปลี่ยนแปลง
 * @returns element ของ sub-table MOQ tiers
 * @example
 * ```tsx
 * <MoqTiersSubTable
 *   tiers={item.moq_tiers}
 *   onTiersUpdate={(tiers) => form.setValue("items.0.moq_tiers", tiers)}
 * />
 * ```
 */
export default function MoqTiersSubTable({
  tiers,
  onTiersUpdate,
}: MoqTiersSubTableProps) {
  const [editingTierIds, setEditingTierIds] = useState<Set<string>>(new Set());
  const [localTiers, setLocalTiers] = useState<MoqTierDto[]>(tiers);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tierToDelete, setTierToDelete] = useState<string | null>(null);

  // Track if local changes have been made
  const hasLocalChanges = useRef(false);

  // Sync with parent when tiers prop changes (only if no local changes)
  useEffect(() => {
    if (!hasLocalChanges.current) {
      setLocalTiers(tiers);
    }
  }, [tiers]);

  const handleToggleEdit = (tierId: string) => {
    setEditingTierIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tierId)) {
        newSet.delete(tierId);
      } else {
        newSet.add(tierId);
      }
      return newSet;
    });
  };

  const handleAddNew = () => {
    const newId = `tier-new-${Date.now()}`;
    const newTier: MoqTierDto = {
      id: newId,
      minimum_quantity: 0,
      price: 0,
      lead_time_days: 0,
    };

    const updatedTiers = [...localTiers, newTier];
    hasLocalChanges.current = true;
    setLocalTiers(updatedTiers);
    onTiersUpdate?.(updatedTiers);
    setEditingTierIds((prev) => new Set(prev).add(newId));
  };

  const handleDeleteClick = (tierId: string) => {
    setTierToDelete(tierId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!tierToDelete) return;

    const updatedTiers = localTiers.filter((tier) => tier.id !== tierToDelete);
    hasLocalChanges.current = true;
    setLocalTiers(updatedTiers);
    onTiersUpdate?.(updatedTiers);
    setDeleteDialogOpen(false);
    setTierToDelete(null);
  };

  const handleFieldChange = (
    tierId: string,
    field: keyof MoqTierDto,
    value: number,
  ) => {
    const updatedTiers = localTiers.map((tier) =>
      tier.id === tierId ? { ...tier, [field]: value } : tier,
    );

    hasLocalChanges.current = true;
    setLocalTiers(updatedTiers);
    onTiersUpdate?.(updatedTiers);
  };

  const columns = useMemo<ColumnDef<MoqTierDto>[]>(
    () => [
      {
        accessorKey: "minimum_quantity",
        header: ({ column }) => (
          <DataGridColumnHeader title="Minimum Qty" column={column} />
        ),
        cell: (info) => {
          const isEditing = editingTierIds.has(info.row.original.id);
          const value = info.getValue() as number;

          if (isEditing) {
            return (
              <Input
                type="number"
                value={value}
                onChange={(e) =>
                  handleFieldChange(
                    info.row.original.id,
                    "minimum_quantity",
                    Number(e.target.value),
                  )
                }
                className="h-7 text-xs"
                min={0}
              />
            );
          }

          return (
            <div className="font-semibold text-xs">
              {value.toLocaleString("en-US", { maximumFractionDigits: 0 })}{" "}
              units
            </div>
          );
        },
        size: 140,
      },
      {
        accessorKey: "price",
        header: ({ column }) => (
          <DataGridColumnHeader title="Price" column={column} />
        ),
        cell: (info) => {
          const isEditing = editingTierIds.has(info.row.original.id);
          const value = info.getValue() as number;

          if (isEditing) {
            return (
              <Input
                type="number"
                value={value}
                onChange={(e) =>
                  handleFieldChange(
                    info.row.original.id,
                    "price",
                    Number(e.target.value),
                  )
                }
                className="h-7 text-xs"
                min={0}
              />
            );
          }

          return (
            <div className="font-semibold text-primary text-xs">
              {value.toLocaleString()}
            </div>
          );
        },
        size: 120,
      },
      {
        accessorKey: "lead_time_days",
        header: ({ column }) => (
          <DataGridColumnHeader title="Lead Time" column={column} />
        ),
        cell: (info) => {
          const isEditing = editingTierIds.has(info.row.original.id);
          const value = info.getValue() as number | undefined;

          if (isEditing) {
            return (
              <Input
                type="number"
                value={value ?? 0}
                onChange={(e) =>
                  handleFieldChange(
                    info.row.original.id,
                    "lead_time_days",
                    Number(e.target.value),
                  )
                }
                className="h-7 text-xs"
                min={0}
                placeholder="Days"
              />
            );
          }

          const label = value === 1 ? "day" : "days";
          return (
            <div className="text-xs">{value ? `${value} ${label}` : "-"}</div>
          );
        },
        size: 120,
      },
      {
        id: "actions",
        header: () => (
          <div className="flex justify-end">
            <Button
              onClick={handleAddNew}
              size="sm"
              variant="ghost"
              className="h-7 px-2"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        ),
        cell: (info) => {
          const isEditing = editingTierIds.has(info.row.original.id);

          return (
            <div className="flex justify-end gap-1">
              <Button
                onClick={() => handleToggleEdit(info.row.original.id)}
                size="sm"
                variant="ghost"
                className="h-7 px-2"
              >
                {isEditing ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Pencil className="h-3 w-3" />
                )}
              </Button>
              <Button
                onClick={() => handleDeleteClick(info.row.original.id)}
                size="sm"
                variant="ghost"
                className="h-7 px-2"
              >
                <Trash2 className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          );
        },
        size: 80,
      },
    ],
    [editingTierIds, localTiers],
  );

  const table = useReactTable({
    data: localTiers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: MoqTierDto) => row.id,
  });

  if (localTiers.length === 0) {
    return (
      <div className="p-4 bg-muted/30">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            No MOQ tiers configured
          </p>
          <Button onClick={handleAddNew} size="sm" variant="outline">
            <Plus className="h-3 w-3 mr-1" />
            Add MOQ Tier
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4">
        <DataGrid
          table={table}
          recordCount={localTiers.length}
          tableLayout={{
            rowBorder: true,
            headerBackground: true,
            headerBorder: true,
          }}
        >
          <DataGridContainer>
            <ScrollArea>
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </DataGridContainer>
        </DataGrid>
      </div>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete MOQ Tier"
        description="Are you sure you want to delete this MOQ tier? This action cannot be undone."
      />
    </>
  );
}
