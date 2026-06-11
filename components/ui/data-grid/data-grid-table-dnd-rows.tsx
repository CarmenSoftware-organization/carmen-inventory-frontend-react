
import {
  createContext,
  CSSProperties,
  useContext,
  useId,
  useMemo,
  useRef,
} from "react"
import { useDataGrid } from "@/components/ui/data-grid/data-grid"
import {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableBodyRowSkeleton,
  DataGridTableBodyRowSkeletonCell,
  DataGridTableEmpty,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableRowSpacer,
} from "@/components/ui/data-grid/data-grid-table"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Cell, flexRender, HeaderGroup, Row } from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { GripHorizontalIcon } from "lucide-react"

// Context to share sortable listeners from row to handle
type SortableContextValue = ReturnType<typeof useSortable>
const SortableRowContext = createContext<Pick<
  SortableContextValue,
  "attributes" | "listeners"
> | null>(null)

/**
 * Drag handle ของ row
 *
 * Render ปุ่มไอคอน GripHorizontal เป็น drag handle ของ sortable row โดย
 * อ่าน `attributes` และ `listeners` จาก `SortableRowContext` (provided โดย
 * `DataGridTableDndRow`) ถ้าไม่มี context จะ fallback เป็นปุ่ม disabled
 *
 * @param props - props ของ component
 * @param props.className - className เพิ่มเติม
 * @returns JSX element ของ drag handle button
 * @example
 * ```tsx
 * <DataGridTableDndRowHandle />
 * ```
 */
function DataGridTableDndRowHandle({ className }: { className?: string }) {
  const context = useContext(SortableRowContext)

  if (!context) {
    // Fallback if context is not available (shouldn't happen in normal usage)
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(
          "size-7 cursor-move opacity-70 hover:bg-transparent hover:opacity-100",
          className
        )}
        aria-label="Drag to reorder"
        disabled
      >
        <GripHorizontalIcon />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(
        "size-7 cursor-move opacity-70 hover:bg-transparent hover:opacity-100",
        className
      )}
      aria-label="Drag to reorder"
      {...context.attributes}
      {...context.listeners}
    >
      <GripHorizontalIcon />
    </Button>
  )
}

/**
 * Sortable row wrapper
 *
 * Render `DataGridTableBodyRow` ภายใน `SortableRowContext.Provider` เพื่อแชร์
 * `attributes` และ `listeners` ของ `useSortable` ให้ `DataGridTableDndRowHandle`
 * ใช้งาน รองรับ drag-to-reorder แนวตั้ง
 *
 * @typeParam TData - ประเภทข้อมูลแถว
 * @param props - props ของ component
 * @param props.row - Row instance ของ TanStack Table
 * @returns JSX element ของ sortable row
 * @example
 * ```tsx
 * <DataGridTableDndRow row={row} />
 * ```
 */
function DataGridTableDndRow<TData>({ row }: { row: Row<TData> }) {
  const {
    transform,
    transition,
    setNodeRef,
    isDragging,
    attributes,
    listeners,
  } = useSortable({
    id: row.id,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  }

  return (
    <SortableRowContext.Provider value={{ attributes, listeners }}>
      <DataGridTableBodyRow
        row={row}
        dndRef={setNodeRef}
        dndStyle={style}
        key={row.id}
      >
        {row.getVisibleCells().map((cell: Cell<TData, unknown>, colIndex) => {
          return (
            <DataGridTableBodyRowCell cell={cell} key={colIndex}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </DataGridTableBodyRowCell>
          )
        })}
      </DataGridTableBodyRow>
    </SortableRowContext.Provider>
  )
}

/**
 * DataGrid table variant รองรับลาก rows เพื่อ reorder
 *
 * Render `<table>` ภายใน `DndContext` ที่จำกัดการลากในแนวตั้ง
 * (`restrictToVerticalAxis`) และไม่เลย container ใช้ `SortableContext` แบบ
 * `verticalListSortingStrategy` รองรับ skeleton/empty state ปกติ
 *
 * @typeParam TData - ประเภทข้อมูลแถว
 * @param props - props ของ component
 * @param props.handleDragEnd - callback เมื่อ drag เสร็จ รับ DragEndEvent
 * @param props.dataIds - array ของ row ids ที่ใช้ใน SortableContext
 * @returns JSX element ของ table พร้อม DndContext
 * @example
 * ```tsx
 * <DataGridTableDndRows handleDragEnd={onEnd} dataIds={ids} />
 * ```
 */
function DataGridTableDndRows<TData>({
  handleDragEnd,
  dataIds,
}: {
  handleDragEnd: (event: DragEndEvent) => void
  dataIds: UniqueIdentifier[]
}) {
  const { table, isLoading, props } = useDataGrid()
  const pagination = table.getState().pagination
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const modifiers = useMemo(() => {
    const restrictToTableContainer: Modifier = ({
      transform,
      draggingNodeRect,
    }) => {
      if (!tableContainerRef.current || !draggingNodeRect) {
        return transform
      }

      const containerRect = tableContainerRef.current.getBoundingClientRect()
      const { x, y } = transform

      const minX = containerRect.left - draggingNodeRect.left
      const maxX = containerRect.right - draggingNodeRect.right
      const minY = containerRect.top - draggingNodeRect.top
      const maxY = containerRect.bottom - draggingNodeRect.bottom

      return {
        ...transform,
        x: Math.max(minX, Math.min(maxX, x)),
        y: Math.max(minY, Math.min(maxY, y)),
      }
    }

    return [restrictToVerticalAxis, restrictToTableContainer]
  }, [])

  return (
    <DndContext
      id={useId()}
      collisionDetection={closestCenter}
      modifiers={modifiers}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <div ref={tableContainerRef} className="relative">
        <DataGridTableBase>
          <DataGridTableHead>
            {table
              .getHeaderGroups()
              .map((headerGroup: HeaderGroup<TData>) => {
                const totalWidth = headerGroup.headers.reduce(
                  (sum, h) => sum + h.getSize(),
                  0,
                )

                return (
                  <DataGridTableHeadRow headerGroup={headerGroup} key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const { column } = header

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
                                header.getContext()
                              )}
                          {props.tableLayout?.columnsResizable &&
                            column.getCanResize() && (
                              <DataGridTableHeadRowCellResize header={header} />
                            )}
                        </DataGridTableHeadRowCell>
                      )
                    })}
                  </DataGridTableHeadRow>
                )
              })}
          </DataGridTableHead>

          {(props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && (
            <DataGridTableRowSpacer />
          )}

          <DataGridTableBody>
            {props.loadingMode === "skeleton" &&
            isLoading &&
            pagination?.pageSize ? (
              Array.from({ length: pagination.pageSize }).map((_, rowIndex) => (
                <DataGridTableBodyRowSkeleton key={rowIndex}>
                  {table.getVisibleFlatColumns().map((column, colIndex) => {
                    return (
                      <DataGridTableBodyRowSkeletonCell
                        column={column}
                        key={colIndex}
                      >
                        {column.columnDef.meta?.skeleton}
                      </DataGridTableBodyRowSkeletonCell>
                    )
                  })}
                </DataGridTableBodyRowSkeleton>
              ))
            ) : table.getRowModel().rows.length ? (
              <SortableContext
                items={dataIds}
                strategy={verticalListSortingStrategy}
              >
                {table.getRowModel().rows.map((row: Row<TData>) => {
                  return <DataGridTableDndRow row={row} key={row.id} />
                })}
              </SortableContext>
            ) : (
              <DataGridTableEmpty />
            )}
          </DataGridTableBody>
        </DataGridTableBase>
      </div>
    </DndContext>
  )
}

export { DataGridTableDndRowHandle, DataGridTableDndRows }