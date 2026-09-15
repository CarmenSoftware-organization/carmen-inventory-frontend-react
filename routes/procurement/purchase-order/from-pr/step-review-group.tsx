import { useMemo, useState } from "react";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
  type ExpandedState,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronRight, Package } from "lucide-react";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import type { GroupPrPo, GroupPrProduct } from "@/types/purchase-order";

/** สินค้าของใบสั่งซื้อที่จะเกิดขึ้น — กางจากแถวใบ */
function ExpandedProducts({
  products,
  currencyCode,
}: {
  products: GroupPrProduct[];
  currencyCode: string;
}) {
  const tfl = useTranslations("field");

  return (
    <div className="max-w-2xl py-2 pl-16">
      <table className="w-full table-fixed text-xs">
        <thead>
          <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs font-semibold">
            <th scope="col" className="px-2 py-1 font-semibold">
              {tfl("product")}
            </th>
            <th scope="col" className="w-16 px-2 py-1 text-right font-semibold">
              {tfl("quantity")}
            </th>
            <th scope="col" className="w-28 px-2 py-1 text-right font-semibold">
              {tfl("price")} ({currencyCode})
            </th>
            <th scope="col" className="w-28 px-2 py-1 text-right font-semibold">
              {tfl("total")} ({currencyCode})
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.product_id} className="border-b last:border-0">
              <td className="px-2 py-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Package
                    className="text-muted-foreground size-3 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">{p.product_name}</span>
                </div>
              </td>
              <td className="px-2 py-1 text-right tabular-nums">{p.qty}</td>
              <td className="text-muted-foreground px-2 py-1 text-right tabular-nums">
                {formatCurrency(p.price_per_unit)}
              </td>
              <td className="text-foreground px-2 py-1 text-right font-medium tabular-nums">
                {formatCurrency(p.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * ตรวจสอบใบสั่งซื้อที่จะถูกสร้าง — หลังบ้านจัดกลุ่มใบขอซื้อตามผู้ขายกับสกุลเงิน
 * มาให้แล้ว หน้านี้แค่แสดงผลลัพธ์ก่อนกดยืนยัน แก้อะไรไม่ได้
 */
export function StepReviewGroup({
  data,
  workflowName,
}: {
  readonly data: GroupPrPo[];
  /** workflow ที่ใบทั้งชุดจะเดินตาม — มาจาก `data.workflow` ของ group-pr */
  readonly workflowName?: string;
}) {
  "use no memo";
  const t = useTranslations("procurement.purchaseOrder");
  const tfl = useTranslations("field");
  const { dateFormat, defaultCurrencyCode } = useProfile();
  const [expanded, setExpanded] = useState<ExpandedState>({});

  // บวกเองจากยอดรายสินค้าที่แสดงอยู่ (`total`) แล้วคูณเรตของใบนั้นเป็นสกุลฐาน —
  // แต่ละใบอาจคนละสกุลเงิน (หลังบ้านจัดกลุ่มตามผู้ขาย+สกุลเงิน) บวกกันตรง ๆ คือ
  // บวกเลขคนละหน่วย · ไม่ใช้ `base_total_price` / `base_price` ที่หลังบ้านส่งมา
  // เพราะของจริงมันมาเป็น 0 ยอดรวมเลยเป็นศูนย์ทั้งที่รายการมียอดอยู่
  const grandTotal = useMemo(
    () =>
      round2(
        data.reduce((sum, po) => {
          const docTotal = (po.products ?? []).reduce(
            (acc, p) => acc + (Number(p.total) || 0),
            0,
          );
          return sum + docTotal * (Number(po.exchange_rate) || 1);
        }, 0),
      ),
    [data],
  );

  const columns = useMemo<ColumnDef<GroupPrPo>[]>(
    () => [
      {
        id: "expander",
        size: 40,
        header: () => null,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={row.getToggleExpandedHandler()}
            aria-label={row.getIsExpanded() ? "Collapse" : "Expand"}
            className="flex items-center justify-center"
          >
            <ChevronRight
              className={`text-muted-foreground size-4 transition-transform ${row.getIsExpanded() ? "rotate-90" : ""}`}
            />
          </button>
        ),
        meta: {
          expandedContent: (po: GroupPrPo) => (
            <ExpandedProducts
              products={po.products}
              currencyCode={po.currency_code}
            />
          ),
        },
      },
      // ยังไม่มีเลขที่ใบตอนนี้ — ใบเพิ่งถูกจัดกลุ่ม ยังไม่ได้สร้าง po_no จึงว่าง
      // ทั้งคอลัมน์ ใช้ลำดับแทนเพื่อให้อ้างถึงกลุ่มที่กำลังดูอยู่ได้
      {
        id: "index",
        header: "#",
        size: 48,
        enableSorting: false,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center text-muted-foreground tabular-nums",
        },
        cell: ({ row }) => row.index + 1,
      },
      { accessorKey: "pr", header: t("prRef") },
      { accessorKey: "vendor_name", header: tfl("vendor") },
      {
        accessorKey: "delivery_date",
        header: tfl("deliveryDate"),
        cell: ({ row }) =>
          formatDate(row.getValue("delivery_date"), dateFormat),
        meta: { cellClassName: "text-center", headerClassName: "text-center" },
      },
      {
        accessorKey: "total_price",
        header: tfl("total"),
        cell: ({ row }) => {
          const amount = row.getValue<number>("total_price");
          const currency = row.original.currency_code;
          if (amount == null) return <span></span>;
          return (
            <span className="font-medium tabular-nums">
              {formatCurrency(amount)}
              {currency && (
                <span className="text-muted-foreground ms-1 text-xs font-normal">
                  {currency}
                </span>
              )}
            </span>
          );
        },
        meta: { cellClassName: "text-right", headerClassName: "text-right" },
      },
    ],
    [t, tfl, dateFormat],
  );

  const table = useReactTable({
    data,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
  });

  return (
    <div className="space-y-2">
      {/* ใบที่กำลังจะสร้างทั้งชุดเดินตาม workflow เดียวกัน — บอกไว้ตรงนี้ก่อนกด
          ยืนยัน เพราะในฟอร์ม PO ช่องนี้แก้ไม่ได้อีกแล้ว */}
      {workflowName && (
        <p className="text-muted-foreground text-xs">
          {t("workflowLabel")}:{" "}
          <span className="text-foreground font-medium">{workflowName}</span>
        </p>
      )}
      <DataGrid
        table={table}
        recordCount={data.length}
        tableLayout={{ headerSticky: true, rowBorder: true }}
      >
        <DataGridContainer scroll className="max-h-112">
          <DataGridTable />
        </DataGridContainer>
        {/* อยู่นอก container ที่เลื่อนได้ — ยอดรวมต้องเห็นตลอด ไม่ใช่เลื่อนตามตาราง
          หายไปตอนใบเยอะ */}
        {data.length > 0 && (
          <div className="border-border/60 flex items-center justify-end gap-2 border-t px-3 py-2 text-xs">
            <span className="text-muted-foreground">{tfl("grandTotal")}</span>
            <span className="font-semibold tabular-nums">
              {formatCurrency(grandTotal)}
            </span>
            <span className="text-muted-foreground">{defaultCurrencyCode}</span>
          </div>
        )}
      </DataGrid>
    </div>
  );
}
