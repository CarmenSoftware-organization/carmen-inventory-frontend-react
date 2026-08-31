import { Table } from "@tanstack/react-table";
import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setURLParams, useURL } from "@/hooks/use-url";

/**
 * Dropdown เลือกเรียงลำดับจาก toolbar — derive รายการจากคอลัมน์ที่ sort ได้ของ
 * table เอง (`getCanSort` + `meta.headerTitle` สูตรเดียวกับ DataGridColumnVisibility)
 * จึงวางได้ทุกหน้าโดยไม่ต้องประกาศ field เพิ่ม — จำเป็นกับ grid card/มือถือที่ไม่มี
 * หัวคอลัมน์ให้กด และ sort ที่เลือกไหลลง URL `sort` เดิม → saved view จับไปด้วยเอง
 *
 * กดคอลัมน์ที่เรียงอยู่ = สลับทิศ, กดคอลัมน์อื่น = เรียง asc — เมนูเปิดค้างไว้ให้
 * สลับทิศต่อได้ (แบบเดียวกับ toggle ใน DataGridColumnVisibility)
 * แถว "Default" ล้าง `sort` บน URL กลับไปใช้ default ของหน้า (เขียน URL ตรง
 * เพราะ `useDataGridState` จงใจไม่รับ removal ผ่าน setSorting — มันพลิกทิศแทน)
 *
 * @param props.table - TanStack Table instance (ตัวเดียวกับที่ส่งให้ DataGrid)
 * @example
 * ```tsx
 * <DataGridSortMenu table={table} />
 * ```
 */
function DataGridSortMenu<TData>({ table }: { table: Table<TData> }) {
  "use no memo"; // TanStack table is stable-ref but mutable; opt out of React Compiler
  const tc = useTranslations("common");
  const [sortRaw] = useURL("sort");

  const sortableColumns = table
    .getAllColumns()
    .filter(
      (column) =>
        typeof column.accessorFn !== "undefined" && column.getCanSort(),
    );

  // หน้าที่ไม่มีคอลัมน์ sort ได้เลย — ปุ่มไม่มีประโยชน์ ซ่อนไปทั้งปุ่ม
  if (sortableColumns.length === 0) return null;

  // sorting state สะท้อน default sort ของหน้าด้วย (useDataGridState เติมให้เมื่อ
  // URL ว่าง) — ตัวชี้ทิศบนแถวจึงบอก "ลำดับจริงที่เห็น" เสมอ ส่วนแถว Default
  // เช็คจาก URL ดิบเพราะ state แยกไม่ออกว่า sort มาจากผู้ใช้หรือ default
  const current = table.getState().sorting[0];

  const handleSelect = (columnId: string) => {
    if (current?.id === columnId) {
      table.setSorting([{ id: columnId, desc: !current.desc }]);
    } else {
      table.setSorting([{ id: columnId, desc: false }]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-sm"
          variant="outline"
          aria-label={tc("sortBy")}
          className={sortRaw ? "text-primary" : undefined}
        >
          <ArrowDownUp className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-semibold">
            {tc("sortBy")}
          </DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={(event) => event.preventDefault()}
            onClick={() => setURLParams({ sort: "", page: "" })}
          >
            <span className={sortRaw ? "pl-5.5" : undefined}>
              {!sortRaw && <ArrowDownUp className="mr-2 inline size-3.5" />}
              {tc("sortDefault")}
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {sortableColumns.map((column) => {
            const isActive = current?.id === column.id;
            return (
              <DropdownMenuItem
                key={column.id}
                onSelect={(event) => event.preventDefault()}
                onClick={() => handleSelect(column.id)}
                className="justify-between"
              >
                {column.columnDef.meta?.headerTitle || column.id}
                {isActive &&
                  (current.desc ? (
                    <ArrowDown className="size-3.5" />
                  ) : (
                    <ArrowUp className="size-3.5" />
                  ))}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { DataGridSortMenu };
