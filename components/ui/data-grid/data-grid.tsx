
import { createContext, ReactNode, useContext, useMemo } from "react";
import { RowData, Table } from "@tanstack/react-table";

import { cn } from "@/lib/utils";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    headerTitle?: string;
    headerClassName?: string;
    cellClassName?: string;
    skeleton?: ReactNode;
    expandedContent?: (row: TData) => ReactNode;
    footerContent?: (row: TData) => ReactNode;
    footerColSpan?: number;
  }
}

export interface DataGridContextProps<TData extends object> {
  props: DataGridProps<TData>;
  table: Table<TData>;
  recordCount: number;
  isLoading: boolean;
}

export interface DataGridProps<TData extends object> {
  className?: string;
  table?: Table<TData>;
  recordCount: number;
  children?: ReactNode;
  onRowClick?: (row: TData) => void;
  isLoading?: boolean;
  loadingMode?: "skeleton" | "spinner";
  loadingMessage?: ReactNode | string;
  emptyMessage?: ReactNode | string;
  tableLayout?: {
    dense?: boolean;
    cellBorder?: boolean;
    rowBorder?: boolean;
    rowRounded?: boolean;
    stripped?: boolean;
    headerBackground?: boolean;
    headerBorder?: boolean;
    headerSticky?: boolean;
    width?: "auto" | "fixed";
    columnsVisibility?: boolean;
    columnsResizable?: boolean;
    columnsPinnable?: boolean;
    columnsMovable?: boolean;
    columnsDraggable?: boolean;
    rowsDraggable?: boolean;
    checkbox?: boolean;
  };
  tableClassNames?: {
    base?: string;
    header?: string;
    headerRow?: string;
    headerSticky?: string;
    body?: string;
    bodyRow?: string;
    footer?: string;
    edgeCell?: string;
  };
}

const DataGridContext = createContext<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DataGridContextProps<any> | undefined
>(undefined);

// Context uses `any` because React's createContext doesn't support generics.
// Type safety is preserved at the component level via DataGridProvider<TData>.
/**
 * Hook เข้าถึง DataGridContext
 *
 * คืนค่า context ปัจจุบันที่มี props ของ DataGrid, table instance, recordCount
 * และ isLoading ใช้ภายในลูก ๆ ของ DataGrid (เช่น DataGridTable, DataGridPagination)
 * Context type ใช้ `any` เพราะ React.createContext ไม่รองรับ generic แต่
 * type safety ถูกบังคับใน component level ผ่าน `DataGridProvider<TData>`
 *
 * @returns DataGridContextProps ของ DataGrid ที่ครอบ component อยู่
 * @throws Error เมื่อเรียกนอก `DataGridProvider`
 * @example
 * ```tsx
 * const { table, isLoading } = useDataGrid();
 * ```
 */
function useDataGrid() {
  const context = useContext(DataGridContext);
  if (!context) {
    throw new Error("useDataGrid must be used within a DataGridProvider");
  }
  return context;
}

/**
 * Provider context ของ DataGrid
 *
 * ครอบ children ด้วย `DataGridContext.Provider` ที่บรรจุ props, table,
 * recordCount และ isLoading ปกติเรียกผ่าน `<DataGrid>` ไม่ได้ใช้โดยตรง
 *
 * @typeParam TData - ประเภทข้อมูลแถวของ table
 * @param props - DataGridProps พร้อม `table` instance ของ TanStack Table
 * @returns JSX element ของ context provider
 * @example
 * ```tsx
 * <DataGridProvider table={table} recordCount={total}>
 *   <DataGridTable />
 * </DataGridProvider>
 * ```
 */
function DataGridProvider<TData extends object>({
  children,
  table,
  ...props
}: DataGridProps<TData> & { table: Table<TData> }) {
  const contextValue = useMemo(
    () => ({
      props,
      table,
      recordCount: props.recordCount,
      isLoading: props.isLoading || false,
    }),
    [props, table],
  );

  return (
    <DataGridContext.Provider value={contextValue}>
      {children}
    </DataGridContext.Provider>
  );
}

/**
 * Top-level component ของ DataGrid
 *
 * Merge default props (loadingMode, tableLayout, tableClassNames) เข้ากับ
 * props ของผู้ใช้ และส่งเข้า `DataGridProvider` ตรวจว่ามี `table` prop เสมอ
 * (throw ถ้าไม่มี) ใช้เป็น root component ของทุก ๆ DataGrid ในระบบ
 *
 * @typeParam TData - ประเภทข้อมูลแถว
 * @param props - DataGridProps ต้องระบุ `table` instance
 * @returns JSX element ของ DataGridProvider พร้อม children
 * @throws Error เมื่อไม่ได้ส่ง `table` prop
 * @example
 * ```tsx
 * <DataGrid table={table} recordCount={total} isLoading={isLoading}
 *   tableLayout={{ dense: true, headerSticky: true }}>
 *   <DataGridContainer>
 *     <DataGridTable />
 *   </DataGridContainer>
 * </DataGrid>
 * ```
 */
function DataGrid<TData extends object>({
  children,
  table,
  ...props
}: DataGridProps<TData>) {
  const defaultProps: Partial<DataGridProps<TData>> = {
    loadingMode: "skeleton",
    tableLayout: {
      dense: false,
      cellBorder: false,
      rowBorder: true,
      rowRounded: false,
      stripped: false,
      headerSticky: false,
      headerBackground: true,
      headerBorder: true,
      width: "fixed",
      columnsVisibility: false,
      columnsResizable: false,
      columnsPinnable: false,
      columnsMovable: false,
      columnsDraggable: false,
      rowsDraggable: false,
      checkbox: false,
    },
    tableClassNames: {
      base: "",
      header: "",
      headerRow: "",
      headerSticky: "sticky top-0 z-10 bg-background/90 backdrop-blur-xs",
      body: "",
      bodyRow: "",
      footer: "",
      edgeCell: "",
    },
  };

  const mergedProps: DataGridProps<TData> = {
    ...defaultProps,
    ...props,
    tableLayout: {
      ...defaultProps.tableLayout,
      ...(props.tableLayout || {}),
    },
    tableClassNames: {
      ...defaultProps.tableClassNames,
      ...(props.tableClassNames || {}),
    },
  };

  // Ensure table is provided
  if (!table) {
    throw new Error('DataGrid requires a "table" prop');
  }

  return (
    <DataGridProvider table={table} {...mergedProps}>
      {children}
    </DataGridProvider>
  );
}

/**
 * Container wrapper ของ DataGrid
 *
 * Render `<div>` ครอบ DataGridTable + DataGridPagination พร้อม border, shadow,
 * rounded และ overflow-auto ใช้ className เพื่อกำหนด max-height สำหรับ scroll
 * area และ flex layout ของแถวเนื้อหา + pagination ด้านล่าง
 *
 * @param props - props ของ container
 * @param props.children - เนื้อหาภายใน (DataGridTable, pagination, ฯลฯ)
 * @param props.className - className เพิ่มเติม
 * @param props.border - แสดงเส้นขอบและ shadow (default true)
 * @returns JSX element ของ div container
 * @example
 * ```tsx
 * <DataGridContainer className="flex max-h-[calc(100vh-13rem-3rem)] flex-col">
 *   <div className="flex-1 overflow-auto"><DataGridTable /></div>
 *   <DataGridPagination />
 * </DataGridContainer>
 * ```
 */
function DataGridContainer({
  children,
  className,
  border = true,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly border?: boolean;
}) {
  return (
    <div
      data-slot="data-grid"
      className={cn(
        "w-full overflow-auto",
        border && "rounded-lg border border-border/60 shadow-sm bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export { useDataGrid, DataGridProvider, DataGrid, DataGridContainer };
