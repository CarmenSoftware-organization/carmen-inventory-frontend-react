
import React, { useMemo } from "react";
import { useTranslations } from "use-intl";
import { useDataGrid } from "@/components/ui/data-grid/data-grid";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
} from "lucide-react";

interface DataGridPaginationProps {
  sizes?: number[];
  className?: string;
  siblings?: number;
}

/**
 * คำนวณรายการเลขหน้าสำหรับแสดง pagination
 *
 * คืน array ของ page index พร้อม marker `"ellipsis-start"` / `"ellipsis-end"`
 * เมื่อจำนวนหน้ามากกว่าจำนวน slot ที่แสดงได้ (`siblings*2 + 5`) เพื่อลด
 * ความยาวของแถวเลขหน้า รักษา first/last page เสมอ
 *
 * @param pageIndex - index ของหน้าปัจจุบัน (0-based)
 * @param pageCount - จำนวนหน้าทั้งหมด
 * @param siblings - จำนวนเลขหน้าข้างเคียง current page
 * @returns Array ของ page index หรือ ellipsis marker
 * @example
 * ```ts
 * buildPageRange(5, 20, 1); // [0, "ellipsis-start", 4, 5, 6, "ellipsis-end", 19]
 * ```
 */
function buildPageRange(
  pageIndex: number,
  pageCount: number,
  siblings: number,
): (number | "ellipsis-start" | "ellipsis-end")[] {
  const totalSlots = siblings * 2 + 5;
  if (pageCount <= totalSlots) {
    return Array.from({ length: pageCount }, (_, i) => i);
  }

  const leftSibling = Math.max(pageIndex - siblings, 1);
  const rightSibling = Math.min(pageIndex + siblings, pageCount - 2);

  const showLeftEllipsis = leftSibling > 1;
  const showRightEllipsis = rightSibling < pageCount - 2;

  const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [0];

  if (showLeftEllipsis) {
    pages.push("ellipsis-start");
  } else {
    for (let i = 1; i < leftSibling; i++) pages.push(i);
  }

  for (let i = leftSibling; i <= rightSibling; i++) pages.push(i);

  if (showRightEllipsis) {
    pages.push("ellipsis-end");
  } else {
    for (let i = rightSibling + 1; i < pageCount - 1; i++) pages.push(i);
  }

  if (pageCount > 1) pages.push(pageCount - 1);

  return pages;
}

/**
 * Pagination bar ของ DataGrid
 *
 * Render แถบ pagination ด้านล่าง DataGrid ประกอบด้วย showing X-Y of Z,
 * dropdown rows per page และปุ่ม navigation (first/prev/page numbers/next/last)
 * ใช้ `useDataGrid` เพื่ออ่าน table state ซ่อนตัวเองเมื่อ recordCount = 0
 * และแสดง skeleton ระหว่าง loading รวมถึง `aria-live` สำหรับ screen reader
 *
 * @param props - props ของ pagination
 * @param props.sizes - ตัวเลือก rows per page (default [5,10,25,50,100])
 * @param props.className - className เพิ่มเติม
 * @param props.siblings - จำนวนเลขหน้าข้างเคียง current page (default 1)
 * @returns JSX element ของ pagination toolbar
 * @example
 * ```tsx
 * <DataGridPagination sizes={[10, 20, 50]} siblings={2} />
 * ```
 */
function DataGridPagination({
  sizes = [5, 10, 25, 50, 100],
  className,
  siblings = 1,
}: DataGridPaginationProps): React.JSX.Element {
  // "use no memo" opts out of React Compiler's automatic memoization.
  // The TanStack `table` instance is referentially stable but internally
  // mutable, so the compiler would freeze derived reads like
  // `table.getState().pagination.pageIndex` at their first value — leaving the
  // active page / "showing X–Y" stale after a page change. Same reason
  // `use-config-table.ts` opts out.
  "use no memo";

  const { table, recordCount, isLoading } = useDataGrid();
  const t = useTranslations("pagination");

  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = table.getPageCount();
  const from = pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, recordCount);

  const pages = useMemo(
    () => buildPageRange(pageIndex, pageCount, siblings),
    [pageIndex, pageCount, siblings],
  );

  if (!isLoading && recordCount <= 0) return <></>;

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-between border-t border-border/50 bg-muted/10 px-3 py-1.5",
          className,
        )}
      >
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-44" />
      </div>
    );
  }

  return (
    <div
      data-slot="data-grid-pagination"
      role="navigation"
      aria-label={t("label")}
      className={cn(
        "flex flex-col items-center gap-2 border-t border-border/50 bg-muted/10 px-3 py-1.5 sm:flex-row sm:justify-between",
        className,
      )}
    >
      {/* Left: record info + rows per page */}
      <div className="flex items-center gap-3">
        <p className="text-muted-foreground text-xs tabular-nums">
          {t("showing")}{" "}
          <span className="text-foreground font-medium">
            {from}–{to}
          </span>{" "}
          {t("of")}{" "}
          <span className="text-foreground font-medium">{recordCount}</span>
        </p>

        <span className="bg-border hidden h-3.5 w-px sm:block" />

        <div className="flex items-center gap-1.5">
          <label
            htmlFor="page-size-select"
            className="text-muted-foreground text-xs"
          >
            {t("rows")}
          </label>
          <Select
            value={`${pageSize}`}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger
              id="page-size-select"
              className="h-6 w-fit text-xs font-medium"
              size="sm"
              aria-label={t("rowsPerPage")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top" className="min-w-14">
              {sizes.map((size) => (
                <SelectItem key={size} value={`${size}`} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right: page navigation */}
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="outline"
            className="size-6 border-border/40"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label={t("firstPage")}
          >
            <ChevronsLeftIcon className="size-3" />
          </Button>

          <Button
            size="icon-sm"
            variant="outline"
            className="size-6 border-border/40"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label={t("previousPage")}
          >
            <ChevronLeftIcon className="size-3" />
          </Button>

          <div className="flex items-center gap-1">
            {pages.map((page) => {
              if (page === "ellipsis-start" || page === "ellipsis-end") {
                return (
                  <span
                    key={page}
                    className="text-muted-foreground flex h-6 min-w-6 items-center justify-center px-1 text-xs select-none"
                    aria-hidden="true"
                  >
                    ···
                  </span>
                );
              }

              const isActive = page === pageIndex;
              return (
                <button
                  key={page}
                  type="button"
                  className={cn(
                    "inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-xs font-medium cursor-pointer transition-all duration-150",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={t("page", { page: page + 1 })}
                  onClick={() => table.setPageIndex(page)}
                >
                  {page + 1}
                </button>
              );
            })}
          </div>

          <Button
            size="icon-sm"
            variant="outline"
            className="size-6 border-border/40"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label={t("nextPage")}
          >
            <ChevronRightIcon className="size-3" />
          </Button>

          <Button
            size="icon-sm"
            variant="outline"
            className="size-6 border-border/40"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            aria-label={t("lastPage")}
          >
            <ChevronsRightIcon className="size-3" />
          </Button>
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {t("status", {
          page: pageIndex + 1,
          total: pageCount,
          count: table.getRowModel().rows.length,
        })}
      </div>
    </div>
  );
}

export { DataGridPagination, type DataGridPaginationProps };
