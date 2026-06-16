
import { CSSProperties, Fragment, ReactNode } from "react";
import { useDataGrid } from "@/components/ui/data-grid/data-grid";
import {
  Cell,
  Column,
  flexRender,
  Header,
  HeaderGroup,
  Row,
} from "@tanstack/react-table";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import EmptyComponent from "@/components/empty-component";

const headerCellSpacingVariants = cva("", {
  variants: {
    size: {
      dense: "px-2 h-8",
      default: "px-3",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const bodyCellSpacingVariants = cva("", {
  variants: {
    size: {
      dense: "px-2 py-0.5",
      default: "px-3 py-1",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

/**
 * คำนวณ inline style สำหรับ pinned column
 *
 * คืน CSSProperties ที่ตั้งค่า `position: sticky` และ `left` หรือ `right`
 * ตามที่ column ถูก pin ซ้าย/ขวา รวมถึง `width` และ `zIndex` ใช้ใน
 * `DataGridTableHeadRowCell` และ `DataGridTableBodyRowCell`
 *
 * @typeParam TData - ประเภทข้อมูลแถว
 * @param column - TanStack Table column instance
 * @returns CSSProperties สำหรับ pinned (หรือ relative) column
 * @example
 * ```ts
 * const style = getPinningStyles(column);
 * ```
 */
function getPinningStyles<TData>(column: Column<TData>): CSSProperties {
  const isPinned = column.getIsPinned();

  return {
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    position: isPinned ? "sticky" : "relative",
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
  };
}

/**
 * Base `<table>` element ของ DataGrid
 *
 * Render `<table>` พื้นฐานที่อ่าน `tableLayout` จาก context ตั้งค่า
 * `table-auto` หรือ `table-fixed`, รองรับ resize ผ่าน `table.getTotalSize()`
 * และใช้ border-separate เมื่อไม่เปิด columnsDraggable
 *
 * @param props - props ของ component
 * @param props.children - thead/tbody ภายใน
 * @returns JSX element ของ `<table>`
 * @example
 * ```tsx
 * <DataGridTableBase><DataGridTableHead/>...</DataGridTableBase>
 * ```
 */
function DataGridTableBase({ children }: { children: ReactNode }) {
  "use no memo"; // TanStack table is stable-ref but mutable; opt out of React Compiler
  const { props, table } = useDataGrid();

  return (
    <table
      data-slot="data-grid-table"
      className={cn(
        "text-foreground w-full min-w-full caption-bottom text-left align-middle text-xs font-normal rtl:text-right",
        props.tableLayout?.width === "auto" ? "table-auto" : "table-fixed",
        !props.tableLayout?.columnsResizable && "",
        !props.tableLayout?.columnsDraggable &&
          "border-separate border-spacing-0",
        props.tableClassNames?.base,
      )}
      style={
        props.tableLayout?.columnsResizable
          ? { width: table.getTotalSize() }
          : undefined
      }
    >
      {children}
    </table>
  );
}

/**
 * `<thead>` ของ DataGrid
 *
 * Render thead พร้อม class จาก `tableClassNames.header` และเพิ่ม
 * `headerSticky` class เมื่อเปิดใน `tableLayout`
 *
 * @param props - props ของ component
 * @param props.children - rows ภายใน thead
 * @returns JSX element ของ `<thead>`
 * @example
 * ```tsx
 * <DataGridTableHead>{headerRows}</DataGridTableHead>
 * ```
 */
function DataGridTableHead({ children }: { children: ReactNode }) {
  const { props } = useDataGrid();

  return (
    <thead
      className={cn(
        props.tableClassNames?.header,
        props.tableLayout?.headerSticky && props.tableClassNames?.headerSticky,
      )}
    >
      {children}
    </thead>
  );
}

/**
 * Header row (`<tr>`) ของตาราง
 *
 * Render tr ภายใน thead รองรับ border, stripped และ backdrop ตามค่า
 * `tableLayout` พร้อม merge `tableClassNames.headerRow`
 *
 * @typeParam TData - ประเภทข้อมูลแถว
 * @param props - props ของ component
 * @param props.children - header cells
 * @param props.headerGroup - HeaderGroup จาก TanStack Table
 * @returns JSX element ของ `<tr>` header
 * @example
 * ```tsx
 * <DataGridTableHeadRow headerGroup={hg}>{cells}</DataGridTableHeadRow>
 * ```
 */
function DataGridTableHeadRow<TData>({
  children,
  headerGroup,
}: {
  children: ReactNode;
  headerGroup: HeaderGroup<TData>;
}) {
  const { props } = useDataGrid();

  return (
    <tr
      key={headerGroup.id}
      className={cn(
        "bg-muted/60 text-foreground border-b",
        props.tableLayout?.headerBorder &&
          "[&>th]:border-border/60 [&>th]:border-b",
        props.tableLayout?.cellBorder && "*:last:border-e-0",
        props.tableLayout?.stripped && "bg-transparent",
        props.tableLayout?.headerBackground === false && "bg-transparent",
        props.tableClassNames?.headerRow,
      )}
    >
      {children}
    </tr>
  );
}

/**
 * Header cell (`<th>`) ของ DataGrid
 *
 * Render th ที่รองรับ column pinning (sticky), column resize, width แบบ %
 * หรือ fixed, และ dnd ref/style จาก `useSortable` ใช้ class จาก
 * `meta.headerClassName` และ edge cell class
 *
 * @typeParam TData - ประเภทข้อมูลแถว
 * @param props - props ของ component
 * @param props.children - เนื้อหาภายใน cell
 * @param props.header - Header instance ของ TanStack Table
 * @param props.dndRef - ref จาก `useSortable` (optional)
 * @param props.dndStyle - inline style จาก dnd transform (optional)
 * @param props.widthPercent - กำหนดความกว้างเป็น % ของ table
 * @returns JSX element ของ `<th>`
 * @example
 * ```tsx
 * <DataGridTableHeadRowCell header={header}>{content}</DataGridTableHeadRowCell>
 * ```
 */
function DataGridTableHeadRowCell<TData>({
  children,
  header,
  dndRef,
  dndStyle,
  widthPercent,
}: {
  children: ReactNode;
  header: Header<TData, unknown>;
  dndRef?: React.Ref<HTMLTableCellElement>;
  dndStyle?: CSSProperties;
  widthPercent?: number;
}) {
  const { props } = useDataGrid();

  const { column } = header;
  const isPinned = column.getIsPinned();
  const isLastLeftPinned =
    isPinned === "left" && column.getIsLastColumn("left");
  const isFirstRightPinned =
    isPinned === "right" && column.getIsFirstColumn("right");
  const headerCellSpacing = headerCellSpacingVariants({
    size: props.tableLayout?.dense ? "dense" : "default",
  });

  return (
    <th
      scope="col"
      key={header.id}
      ref={dndRef}
      style={{
        ...((props.tableLayout?.width === "fixed" ||
          props.tableLayout?.columnsResizable) && {
          width: props.tableLayout?.columnsResizable
            ? header.getSize()
            : widthPercent != null
              ? `${widthPercent}%`
              : header.getSize(),
        }),
        ...(props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          getPinningStyles(column)),
        ...(dndStyle ? dndStyle : null),
      }}
      data-pinned={isPinned || undefined}
      data-last-col={
        isLastLeftPinned ? "left" : isFirstRightPinned ? "right" : undefined
      }
      className={cn(
        "text-muted-foreground relative h-9 text-left align-middle text-xs font-medium rtl:text-right",
        headerCellSpacing,
        props.tableLayout?.cellBorder && "border-e",
        props.tableLayout?.columnsResizable &&
          column.getCanResize() &&
          "truncate",
        props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          "[&[data-pinned][data-last-col]]:border-border data-pinned:bg-muted/90 data-pinned:backdrop-blur-xs [&:not([data-pinned]):has(+[data-pinned])_div.cursor-col-resize:last-child]:opacity-0 [&[data-last-col=left]_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right]:last-child_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=right][data-last-col=right]]:border-s!",
        header.column.columnDef.meta?.headerClassName,
        column.getIndex() === 0 ||
          column.getIndex() === header.headerGroup.headers.length - 1
          ? props.tableClassNames?.edgeCell
          : "",
      )}
    >
      {children}
    </th>
  );
}

/**
 * Resize handle ของ header cell
 *
 * Render `<div>` แถบ resize ด้านขวาของ header cell ใช้
 * `header.getResizeHandler()` รองรับ mouse/touch และ double-click reset size
 *
 * @typeParam TData - ประเภทข้อมูลแถว
 * @param props - props ของ component
 * @param props.header - Header instance ของ TanStack Table
 * @returns JSX element ของ resize handle
 * @example
 * ```tsx
 * <DataGridTableHeadRowCellResize header={header} />
 * ```
 */
function DataGridTableHeadRowCellResize<TData>({
  header,
}: {
  header: Header<TData, unknown>;
}) {
  const { column } = header;

  return (
    <div
      {...{
        onDoubleClick: () => column.resetSize(),
        onMouseDown: header.getResizeHandler(),
        onTouchStart: header.getResizeHandler(),
        className:
          "absolute top-0 h-full w-4 cursor-col-resize user-select-none touch-none -end-2 z-10 flex justify-center before:absolute before:w-px before:inset-y-0 before:bg-transparent hover:before:bg-border before:-translate-x-px",
      }}
    />
  );
}

/**
 * Spacer tbody ระหว่าง head และ body
 *
 * Render `<tbody>` สูง 2 (h-2) เพื่อเพิ่มระยะห่างเมื่อเปิด stripped หรือ
 * ไม่ใช้ rowBorder ใช้ `aria-hidden` ไม่ให้ screen reader อ่าน
 *
 * @returns JSX element ของ spacer tbody
 * @example
 * ```tsx
 * <DataGridTableRowSpacer />
 * ```
 */
function DataGridTableRowSpacer() {
  return <tbody aria-hidden="true" className="h-2"></tbody>;
}

/**
 * `<tbody>` ของ DataGrid
 *
 * Render tbody พร้อม styling สำหรับ rounded rows (เมื่อเปิด `rowRounded`)
 * และ merge `tableClassNames.body` ปิด border-bottom ของแถวสุดท้าย
 *
 * @param props - props ของ component
 * @param props.children - rows ภายใน
 * @returns JSX element ของ `<tbody>`
 * @example
 * ```tsx
 * <DataGridTableBody>{rows}</DataGridTableBody>
 * ```
 */
function DataGridTableBody({ children }: { children: ReactNode }) {
  const { props } = useDataGrid();

  return (
    <tbody
      className={cn(
        "[&_tr:last-child]:border-0",
        "[&>tr:has(+[data-slot=footer-row])>td]:border-b-0",
        props.tableLayout?.rowRounded && "[&_td:first-child]:rounded-l-lg",
        props.tableLayout?.rowRounded && "[&_td:last-child]:rounded-r-lg",
        props.tableClassNames?.body,
      )}
    >
      {children}
    </tbody>
  );
}

/**
 * Skeleton row (`<tr>`) แสดงขณะ loading
 *
 * Render tr ที่มี styling เหมือน data row จริงเพื่อ avoid layout shift
 * รองรับ row border/stripped/cell border ตาม `tableLayout`
 *
 * @param props - props ของ component
 * @param props.children - skeleton cells
 * @returns JSX element ของ `<tr>` skeleton
 * @example
 * ```tsx
 * <DataGridTableBodyRowSkeleton>{skeletonCells}</DataGridTableBodyRowSkeleton>
 * ```
 */
function DataGridTableBodyRowSkeleton({ children }: { children: ReactNode }) {
  "use no memo"; // TanStack table is stable-ref but mutable; opt out of React Compiler
  const { table, props } = useDataGrid();

  return (
    <tr
      className={cn(
        "hover:bg-muted/40 data-[state=selected]:bg-primary/5 transition-colors duration-150",
        props.onRowClick && "cursor-pointer",
        !props.tableLayout?.stripped &&
          props.tableLayout?.rowBorder &&
          "[&:not(:last-child)>td]:border-border/50 [&:not(:last-child)>td]:border-b",
        props.tableLayout?.cellBorder && "*:last:border-e-0",
        props.tableLayout?.stripped &&
          "odd:bg-muted/30 odd:hover:bg-muted/50 hover:bg-transparent",
        table.options.enableRowSelection && "*:first:relative",
        props.tableClassNames?.bodyRow,
      )}
    >
      {children}
    </tr>
  );
}

/**
 * Skeleton cell (`<td>`) ของแถว skeleton
 *
 * Render td placeholder สำหรับแต่ละ column ใช้ class จาก
 * `meta.cellClassName` และ width ตาม column ใช้ภายใน
 * `DataGridTableBodyRowSkeleton`
 *
 * @typeParam TData - ประเภทข้อมูลแถว
 * @param props - props ของ component
 * @param props.children - skeleton element
 * @param props.column - Column instance ของ TanStack Table
 * @returns JSX element ของ `<td>` skeleton
 * @example
 * ```tsx
 * <DataGridTableBodyRowSkeletonCell column={col}>
 *   <Skeleton />
 * </DataGridTableBodyRowSkeletonCell>
 * ```
 */
function DataGridTableBodyRowSkeletonCell<TData>({
  children,
  column,
}: {
  children: ReactNode;
  column: Column<TData>;
}) {
  "use no memo"; // TanStack table is stable-ref but mutable; opt out of React Compiler
  const { props, table } = useDataGrid();
  const bodyCellSpacing = bodyCellSpacingVariants({
    size: props.tableLayout?.dense ? "dense" : "default",
  });

  return (
    <td
      style={
        props.tableLayout?.columnsResizable
          ? { width: column.getSize() }
          : undefined
      }
      className={cn(
        "align-middle",
        bodyCellSpacing,
        props.tableLayout?.cellBorder && "border-e",
        props.tableLayout?.columnsResizable &&
          column.getCanResize() &&
          "truncate",
        column.columnDef.meta?.cellClassName,
        props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          '[&[data-pinned][data-last-col]]:border-border data-pinned:bg-background/90 data-pinned:backdrop-blur-xs" [&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right][data-last-col=right]]:border-s!',
        column.getIndex() === 0 ||
          column.getIndex() === table.getVisibleFlatColumns().length - 1
          ? props.tableClassNames?.edgeCell
          : "",
      )}
    >
      {children}
    </td>
  );
}

/**
 * Body row (`<tr>`) ของ DataGrid
 *
 * Render data row พร้อม row selection highlight, onRowClick handler,
 * keyboard activation (Enter/Space) เมื่อมี onRowClick, focus ring,
 * stripped/border styling และ dnd ref/style จาก useSortable
 *
 * @typeParam TData - ประเภทข้อมูลแถว
 * @param props - props ของ component
 * @param props.children - body cells
 * @param props.row - Row instance ของ TanStack Table
 * @param props.dndRef - ref จาก `useSortable` (optional)
 * @param props.dndStyle - inline style จาก dnd transform (optional)
 * @returns JSX element ของ `<tr>` data row
 * @example
 * ```tsx
 * <DataGridTableBodyRow row={row}>{cells}</DataGridTableBodyRow>
 * ```
 */
function DataGridTableBodyRow<TData>({
  children,
  row,
  dndRef,
  dndStyle,
}: {
  children: ReactNode;
  row: Row<TData>;
  dndRef?: React.Ref<HTMLTableRowElement>;
  dndStyle?: CSSProperties;
}) {
  "use no memo"; // TanStack table is stable-ref but mutable; opt out of React Compiler
  const { props, table } = useDataGrid();

  return (
    <tr
      ref={dndRef}
      style={{ ...(dndStyle ? dndStyle : null) }}
      data-state={
        table.options.enableRowSelection && row.getIsSelected()
          ? "selected"
          : undefined
      }
      tabIndex={props.onRowClick ? 0 : undefined}
      role={props.onRowClick ? "button" : undefined}
      onClick={() => props.onRowClick && props.onRowClick(row.original)}
      onKeyDown={
        props.onRowClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                props.onRowClick!(row.original);
              }
            }
          : undefined
      }
      className={cn(
        "hover:bg-muted/40 data-[state=selected]:bg-primary/5 transition-colors duration-150",
        props.onRowClick &&
          "focus-visible:ring-ring/50 cursor-pointer focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
        !props.tableLayout?.stripped &&
          props.tableLayout?.rowBorder &&
          "[&:not(:last-child)>td]:border-border/50 [&:not(:last-child)>td]:border-b",
        props.tableLayout?.cellBorder && "*:last:border-e-0",
        props.tableLayout?.stripped &&
          "odd:bg-muted/30 odd:hover:bg-muted/50 hover:bg-transparent",
        table.options.enableRowSelection && "*:first:relative",
        props.tableClassNames?.bodyRow,
      )}
    >
      {children}
    </tr>
  );
}

/**
 * Expanded content row ของ DataGrid
 *
 * Render `<tr>` ที่อยู่ใต้ data row เมื่อ row อยู่ในสถานะ expanded ใช้
 * `meta.expandedContent` ของ column แรกที่กำหนดไว้ ส่งข้อมูล `row.original`
 * เข้าฟังก์ชัน
 *
 * @typeParam TData - ประเภทข้อมูลแถว
 * @param props - props ของ component
 * @param props.row - Row instance ของ TanStack Table
 * @returns JSX element ของ expanded row
 * @example
 * ```tsx
 * {row.getIsExpanded() && <DataGridTableBodyRowExpandded row={row} />}
 * ```
 */
function DataGridTableBodyRowExpandded<TData>({ row }: { row: Row<TData> }) {
  "use no memo"; // TanStack table is stable-ref but mutable; opt out of React Compiler
  const { props, table } = useDataGrid();

  return (
    <tr
      className={cn(
        props.tableLayout?.rowBorder && "[&:not(:last-child)>td]:border-b",
      )}
    >
      <td colSpan={row.getVisibleCells().length}>
        {table
          .getAllColumns()
          .find((column) => column.columnDef.meta?.expandedContent)
          ?.columnDef.meta?.expandedContent?.(row.original)}
      </td>
    </tr>
  );
}

/**
 * Footer row ใต้ data row
 *
 * Render `<tr>` footer ใต้ data row โดยอ่าน column ที่มี
 * `meta.footerContent` และจัด colSpan ตาม `meta.footerColSpan` คำนวณ
 * empty td ก่อน/หลังให้พอดีกับ visible columns ทั้งหมด
 *
 * @typeParam TData - ประเภทข้อมูลแถว
 * @param props - props ของ component
 * @param props.row - Row instance ของ TanStack Table
 * @returns JSX element ของ footer row หรือ null
 * @example
 * ```tsx
 * <DataGridTableBodyRowFooter row={row} />
 * ```
 */
function DataGridTableBodyRowFooter<TData>({ row }: { row: Row<TData> }) {
  const { props } = useDataGrid();

  const visibleCells = row.getVisibleCells();
  const footerIdx = visibleCells.findIndex(
    (cell) => cell.column.columnDef.meta?.footerContent,
  );

  if (footerIdx === -1) return null;

  const footerCol = visibleCells[footerIdx].column;
  const colSpan = footerCol.columnDef.meta?.footerColSpan ?? 1;
  const remaining = Math.max(0, visibleCells.length - footerIdx - colSpan);

  return (
    <tr
      data-slot="footer-row"
      className={cn(
        "[&>td]:border-border/50 [&>td]:border-b",
        props.tableClassNames?.bodyRow,
      )}
    >
      {footerIdx > 0 && <td colSpan={footerIdx} />}
      <td colSpan={colSpan}>
        {footerCol.columnDef.meta?.footerContent?.(row.original)}
      </td>
      {remaining > 0 && <td colSpan={remaining} />}
    </tr>
  );
}

/**
 * Body cell (`<td>`) ของ DataGrid
 *
 * Render td รองรับ column pinning (sticky), column resize, edge cell class
 * และ dnd ref/style จาก useSortable ใช้ class จาก `meta.cellClassName`
 *
 * @typeParam TData - ประเภทข้อมูลแถว
 * @param props - props ของ component
 * @param props.children - เนื้อหาภายใน cell
 * @param props.cell - Cell instance ของ TanStack Table
 * @param props.dndRef - ref จาก `useSortable` (optional)
 * @param props.dndStyle - inline style จาก dnd transform (optional)
 * @returns JSX element ของ `<td>`
 * @example
 * ```tsx
 * <DataGridTableBodyRowCell cell={cell}>{content}</DataGridTableBodyRowCell>
 * ```
 */
function DataGridTableBodyRowCell<TData>({
  children,
  cell,
  dndRef,
  dndStyle,
}: {
  children: ReactNode;
  cell: Cell<TData, unknown>;
  dndRef?: React.Ref<HTMLTableCellElement>;
  dndStyle?: CSSProperties;
}) {
  const { props } = useDataGrid();

  const { column, row } = cell;
  const isPinned = column.getIsPinned();
  const isLastLeftPinned =
    isPinned === "left" && column.getIsLastColumn("left");
  const isFirstRightPinned =
    isPinned === "right" && column.getIsFirstColumn("right");
  const bodyCellSpacing = bodyCellSpacingVariants({
    size: props.tableLayout?.dense ? "dense" : "default",
  });

  return (
    <td
      key={cell.id}
      ref={dndRef}
      {...(props.tableLayout?.columnsDraggable && !isPinned ? { cell } : {})}
      style={{
        ...(props.tableLayout?.columnsResizable && {
          width: column.getSize(),
        }),
        ...(props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          getPinningStyles(column)),
        ...(dndStyle ? dndStyle : null),
      }}
      data-pinned={isPinned || undefined}
      data-last-col={
        isLastLeftPinned ? "left" : isFirstRightPinned ? "right" : undefined
      }
      className={cn(
        "align-middle",
        bodyCellSpacing,
        props.tableLayout?.cellBorder && "border-e",
        props.tableLayout?.columnsResizable &&
          column.getCanResize() &&
          "truncate",
        cell.column.columnDef.meta?.cellClassName,
        props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          '[&[data-pinned][data-last-col]]:border-border data-pinned:bg-background/90 data-pinned:backdrop-blur-xs" [&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right][data-last-col=right]]:border-s!',
        column.getIndex() === 0 ||
          column.getIndex() === row.getVisibleCells().length - 1
          ? props.tableClassNames?.edgeCell
          : "",
      )}
    >
      {children}
    </td>
  );
}

/**
 * Empty state row ของ DataGrid
 *
 * Render `<tr>` ที่มี td colSpan ครอบทุก column แสดง `props.emptyMessage`
 * จาก context หรือ `EmptyComponent` เมื่อไม่กำหนด ใช้เมื่อ data ว่างเปล่า
 *
 * @returns JSX element ของ empty row
 * @example
 * ```tsx
 * <DataGridTableEmpty />
 * ```
 */
function DataGridTableEmpty() {
  "use no memo"; // TanStack table is stable-ref but mutable; opt out of React Compiler
  const { table, props } = useDataGrid();
  const totalColumns = table.getAllColumns().length;

  return (
    <tr>
      <td
        colSpan={totalColumns}
        className="text-muted-foreground h-32 text-center text-sm"
      >
        {props.emptyMessage || <EmptyComponent />}
      </td>
    </tr>
  );
}

/**
 * Overlay loader ของ DataGrid
 *
 * Render overlay กึ่งกลางตารางที่มี spinner + `props.loadingMessage`
 * (default "Loading...") ใช้สำหรับ loading mode "spinner"
 *
 * @returns JSX element ของ loader overlay
 * @example
 * ```tsx
 * <DataGridTableLoader />
 * ```
 */
function DataGridTableLoader() {
  const { props } = useDataGrid();

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="text-muted-foreground bg-card flex items-center gap-2 rounded-lg border px-4 py-2 text-sm leading-none font-medium">
        <Spinner className="-ml-1" />
        {props.loadingMessage || "Loading..."}
      </div>
    </div>
  );
}

/**
 * Checkbox เลือกแถวเดียว
 *
 * Render checkbox พร้อม accent bar สีดำซ้ายแสดงเมื่อ row ถูก select
 * เรียก `row.toggleSelected` เมื่อกด รองรับ disabled
 *
 * @typeParam TData - ประเภทข้อมูลแถว
 * @param props - props ของ component
 * @param props.row - Row instance ของ TanStack Table
 * @param props.disabled - disable checkbox
 * @returns JSX element ของ checkbox + accent bar
 * @example
 * ```tsx
 * <DataGridTableRowSelect row={row} />
 * ```
 */
function DataGridTableRowSelect<TData>({
  row,
  disabled,
}: {
  row: Row<TData>;
  disabled?: boolean;
}) {
  const isSelected = row.getIsSelected();
  return (
    <>
      {isSelected && (
        <div className="bg-primary absolute start-0 top-0 bottom-0 w-0.5 rounded-full" />
      )}
      <Checkbox
        checked={isSelected}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        disabled={disabled}
        aria-label="Select row"
        className="align-[inherit]"
      />
    </>
  );
}

/**
 * Checkbox เลือก/ยกเลิกทุกแถวในหน้า
 *
 * Render header checkbox ที่แสดง state indeterminate เมื่อบาง row ถูกเลือก
 * เรียก `table.toggleAllPageRowsSelected` เมื่อกด disable เมื่อ loading หรือ
 * recordCount = 0
 *
 * @returns JSX element ของ select-all checkbox
 * @example
 * ```tsx
 * <DataGridTableRowSelectAll />
 * ```
 */
function DataGridTableRowSelectAll() {
  "use no memo"; // TanStack table is stable-ref but mutable; opt out of React Compiler
  const { table, recordCount, isLoading } = useDataGrid();

  const isAllSelected = table.getIsAllPageRowsSelected();
  const isSomeSelected = table.getIsSomePageRowsSelected();

  return (
    <Checkbox
      checked={
        isSomeSelected && !isAllSelected ? "indeterminate" : isAllSelected
      }
      disabled={isLoading || recordCount === 0}
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      aria-label="Select all"
      className="align-[inherit]"
    />
  );
}

/**
 * Main DataGrid table component
 *
 * Render `<table>` พร้อม head + body ครบ ใช้ `useDataGrid` เพื่ออ่าน table
 * instance จัดการ skeleton/spinner ระหว่าง loading, empty state เมื่อ
 * ไม่มีข้อมูล และ expanded/footer rows ให้ทุก data row กรอง column
 * "select" ออกเมื่อ `tableLayout.checkbox = false`
 *
 * @typeParam TData - ประเภทข้อมูลแถว
 * @returns JSX element ของ `<table>` พร้อม content ทั้งหมด
 * @example
 * ```tsx
 * <DataGrid table={table} recordCount={total}>
 *   <DataGridContainer><DataGridTable /></DataGridContainer>
 * </DataGrid>
 * ```
 */
function DataGridTable<TData>() {
  "use no memo"; // TanStack table is stable-ref but mutable; opt out of React Compiler
  const { table, isLoading, props } = useDataGrid();
  const pagination = table.getState().pagination;
  const showCheckbox = !!props.tableLayout?.checkbox;

  const isColumnVisible = (columnId: string) =>
    showCheckbox || columnId !== "select";

  return (
    <DataGridTableBase>
      <DataGridTableHead>
        {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => {
          const visibleHeaders = headerGroup.headers.filter((header) =>
            isColumnVisible(header.column.id),
          );
          const totalWidth = visibleHeaders.reduce(
            (sum, h) => sum + h.getSize(),
            0,
          );

          return (
            <DataGridTableHeadRow
              headerGroup={headerGroup}
              key={headerGroup.id}
            >
              {visibleHeaders.map((header) => {
                const { column } = header;

                return (
                  <DataGridTableHeadRowCell
                    header={header}
                    key={header.id}
                    widthPercent={
                      totalWidth > 0
                        ? (header.getSize() / totalWidth) * 100
                        : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    {props.tableLayout?.columnsResizable &&
                      column.getCanResize() && (
                        <DataGridTableHeadRowCellResize header={header} />
                      )}
                  </DataGridTableHeadRowCell>
                );
              })}
            </DataGridTableHeadRow>
          );
        })}
      </DataGridTableHead>

      {(props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && (
        <DataGridTableRowSpacer />
      )}

      <DataGridTableBody>
        {isLoading &&
        props.loadingMode === "skeleton" &&
        pagination?.pageSize ? (
          // Show skeleton loading immediately
          Array.from({ length: pagination.pageSize }).map((_, rowIndex) => (
            <DataGridTableBodyRowSkeleton key={rowIndex}>
              {table
                .getVisibleFlatColumns()
                .filter((column) => isColumnVisible(column.id))
                .map((column, colIndex) => {
                  return (
                    <DataGridTableBodyRowSkeletonCell
                      column={column}
                      key={colIndex}
                    >
                      {column.columnDef.meta?.skeleton}
                    </DataGridTableBodyRowSkeletonCell>
                  );
                })}
            </DataGridTableBodyRowSkeleton>
          ))
        ) : isLoading && props.loadingMode === "spinner" ? (
          // Show spinner loading immediately
          <tr>
            <td colSpan={table.getVisibleFlatColumns().length} className="p-8">
              <div className="flex items-center justify-center">
                <Spinner className="mr-3 -ml-1" />
                {props.loadingMessage || "Loading..."}
              </div>
            </td>
          </tr>
        ) : table.getRowModel().rows.length ? (
          // Show actual data when not loading
          table.getRowModel().rows.map((row: Row<TData>) => {
            return (
              <Fragment key={row.id}>
                <DataGridTableBodyRow row={row}>
                  {row
                    .getVisibleCells()
                    .filter((cell) => isColumnVisible(cell.column.id))
                    .map((cell: Cell<TData, unknown>) => {
                      return (
                        <DataGridTableBodyRowCell cell={cell} key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </DataGridTableBodyRowCell>
                      );
                    })}
                </DataGridTableBodyRow>
                <DataGridTableBodyRowFooter row={row} />
                {row.getIsExpanded() && (
                  <DataGridTableBodyRowExpandded row={row} />
                )}
              </Fragment>
            );
          })
        ) : (
          <DataGridTableEmpty />
        )}
      </DataGridTableBody>
    </DataGridTableBase>
  );
}

export {
  DataGridTable,
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableBodyRowExpandded,
  DataGridTableBodyRowFooter,
  DataGridTableBodyRowSkeleton,
  DataGridTableBodyRowSkeletonCell,
  DataGridTableEmpty,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableLoader,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
  DataGridTableRowSpacer,
};
