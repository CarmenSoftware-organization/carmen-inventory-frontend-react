
import { ReactElement } from "react"
import { Table } from "@tanstack/react-table"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Dropdown toggle visibility ของ columns
 *
 * Render dropdown ที่มีรายการ column ทั้งหมดพร้อม checkbox toggle
 * `column.toggleVisibility` กรองเฉพาะ column ที่มี `accessorFn` และ `canHide`
 * ใช้ `meta.headerTitle` เป็นชื่อแสดง (fallback เป็น `column.id`)
 *
 * @typeParam TData - ประเภทข้อมูลแถว
 * @param props - props ของ component
 * @param props.table - TanStack Table instance
 * @param props.trigger - element trigger ของ dropdown
 * @returns JSX element ของ dropdown
 * @example
 * ```tsx
 * <DataGridColumnVisibility
 *   table={table}
 *   trigger={<Button size="icon-sm" variant="outline"><Columns3 /></Button>}
 * />
 * ```
 */
function DataGridColumnVisibility<TData>({
  table,
  trigger,
}: {
  table: Table<TData>
  trigger: ReactElement<Record<string, unknown>>
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-medium">
            Toggle Columns
          </DropdownMenuLabel>
          {table
            .getAllColumns()
            .filter(
              (column) =>
                typeof column.accessorFn !== "undefined" && column.getCanHide()
            )
            .map((column) => {
              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.columnDef.meta?.headerTitle || column.id}
                </DropdownMenuCheckboxItem>
              )
            })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { DataGridColumnVisibility }