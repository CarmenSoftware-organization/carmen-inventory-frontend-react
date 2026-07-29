import type { ReactNode } from "react";
import type { Table } from "@tanstack/react-table";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import type { ActiveFilter } from "@/components/ui/active-filter-bar";
import type { XlsxColumn } from "@/lib/xlsx-utils";

export interface StatusOption {
  label: string;
  value: string;
}

/** Standardized options passed to entity table hooks by templates. */
export interface ConfigTableHookOptions<TEntity> {
  data: TEntity[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (item: TEntity) => void;
  onDelete: (item: TEntity) => void;
  /** เช่น `"configuration.department"` — เมื่อระบุ template จะเช็ค {prefix}.delete */
  permissionPrefix?: string;
}

/** A table hook function that the template calls at the top level. */
export type UseTableFn<TEntity> = (
  options: ConfigTableHookOptions<TEntity>,
) => Table<TEntity>;

/** Render prop for the entity dialog (create/edit). */
export interface DialogRenderProps<TEntity> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: TEntity | null;
  /**
   * View-only mode — user มี view permission แต่ไม่มี update permission.
   * Dialog ต้อง disable form + ซ่อนปุ่ม save เมื่อ true.
   * Add mode (entity = null) จะส่ง false เสมอ (เพราะถูก gate ที่ปุ่ม Add ก่อนแล้ว)
   */
  readOnly: boolean;
}

/** Render prop for overriding the delete confirmation dialog. */
export interface DeleteDialogRenderProps<TEntity> {
  target: TEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => void;
}

/** Render prop for the mobile card view. */
export interface CardRenderProps<TEntity> {
  item: TEntity;
  index?: number;
  onEdit: (item: TEntity) => void;
  onDelete: (item: TEntity) => void;
}

/** Props for ConfigListTemplate. */
export interface ConfigListTemplateProps<TEntity extends { id: string }> {
  /** Translation namespace, e.g. "config.currency" */
  translationNamespace: string;
  /** Field name used in delete confirmation message, e.g. "name" or "code" */
  entityNameField: keyof TEntity & string;

  /** Hook to fetch list data */
  useList: (
    params?: ParamsDto,
    options?: { enabled?: boolean },
  ) => {
    data?: { data?: TEntity[]; paginate?: { total: number; pages?: number } };
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  };
  /** Hook to delete an entity */
  useDelete: () => {
    mutate: (
      id: string,
      options: {
        onSuccess: () => void;
      },
    ) => void;
    isPending: boolean;
  };

  /** Hook to create and configure the TanStack table */
  useTable: UseTableFn<TEntity>;

  /** Render the entity-specific dialog (omit when using page-based add/edit) */
  renderDialog?: (props: DialogRenderProps<TEntity>) => ReactNode;
  /** Render a custom delete confirmation dialog (fallback = generic DeleteDialog) */
  renderDeleteDialog?: (props: DeleteDialogRenderProps<TEntity>) => ReactNode;
  /** Page route for "Add" button (page-based mode). Mutually exclusive with renderDialog. */
  addPath?: string;
  /** Function returning page route for editing an entity (page-based mode). */
  getEditPath?: (entity: TEntity) => string;
  /** Extra filter expression(s) joined to the URL `filter` param (comma-separated) */
  extraFilter?: string;
  /** Extra active filter chips merged into the active filter bar */
  extraActiveFilters?: ActiveFilter[];
  /** Called when "Clear all" is clicked, in addition to clearing the status filter */
  onClearExtraFilters?: () => void;
  /** Render the mobile card for an entity (omit to always show DataGrid) */
  renderCard?: (props: CardRenderProps<TEntity>) => ReactNode;

  /** Additional toolbar items (after SearchInput + StatusFilter) */
  extraToolbar?: ReactNode;
  /** Additional action buttons (after Add/Export/Print) */
  extraActions?: ReactNode;
  /** Override status filter options */
  statusOptions?: StatusOption[];
  /** Hide the status filter dropdown */
  hideStatusFilter?: boolean;
  /** Hide export/print buttons entirely (overrides exportColumns) */
  hideExportPrint?: boolean;
  /** xlsx column definitions for the Export action. When omitted, the Export
   *  button is hidden but Print still renders. */
  exportColumns?: XlsxColumn<TEntity>[];
  /** File name prefix used by Export (helper appends `_YYYY-MM-DD.xlsx`).
   *  Defaults to the last segment of `translationNamespace`. */
  exportFileNamePrefix?: string;
  /** Sheet tab name inside the workbook. Defaults to `t("title")`. */
  exportSheetName?: string;
  /** Default sort when no sort is specified in URL, e.g. "tax_rate:asc" */
  defaultSort?: string;
  /**
   * Resource prefix สำหรับ permission gate ปุ่ม Add/Delete (แบบไม่รวม action)
   * เช่น `"configuration.department"` จะเช็ค `.create` กับ `.delete` ภายใน
   * ไม่ระบุ = ไม่ guard (ใช้ตอน BE ยังไม่บังคับ perm)
   */
  permissionPrefix?: string;
}
