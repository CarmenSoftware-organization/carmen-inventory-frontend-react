import { ArrowDown, ArrowUp, SlidersHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ApInvoiceLine } from "@/types/accounts-payable";
import { ApDetailGrid } from "./ap-detail-grid";
import { Money, ApStatusBadge } from "./ap-ui";
import { addDecimal, multiplyDecimal } from "./ap-decimal";

export function InvoiceLines({
  lines,
  editable,
  currency,
  rate,
  onChange,
  onConfigure,
  onMove,
  onRemove,
}: {
  lines: ApInvoiceLine[];
  editable: boolean;
  currency: string;
  rate: string;
  onChange: (index: number, patch: Partial<ApInvoiceLine>) => void;
  onConfigure: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}) {
  const amount = (value: string, tone = "") => (
    <div className="grid gap-1 text-right">
      <Money value={value} currency={currency} className={tone} />
      {currency !== "THB" && (
        <Money
          value={multiplyDecimal(value, rate)}
          className="text-muted-foreground text-xs"
        />
      )}
    </div>
  );
  const field = (
    line: ApInvoiceLine,
    index: number,
    key: "description" | "unit" | "quantity" | "unit_price" | "discount",
  ) =>
    editable ? (
      <Input
        aria-label={`${key.replaceAll("_", " ")} line ${index + 1}`}
        className={
          key === "description"
            ? "min-w-48"
            : "min-w-20 text-right tabular-nums"
        }
        value={line[key]}
        onChange={(event) => {
          if (
            key === "description" ||
            key === "unit" ||
            /^\d*(\.\d*)?$/.test(event.target.value)
          )
            onChange(index, { [key]: event.target.value });
        }}
      />
    ) : (
      <span>{line[key]}</span>
    );
  return (
    <ApDetailGrid
      rows={lines}
      columns={[
        { id: "no", header: "#", cell: ({ row }) => row.index + 1 },
        {
          id: "description",
          header: "Description / Comment",
          cell: ({ row }) => (
            <div className="min-w-48 space-y-2">
              {field(row.original, row.index, "description")}
              <div className="text-muted-foreground text-xs">
                {row.original.department || "No department"} ·{" "}
                {row.original.account || "No account"}
              </div>
              <div className="text-muted-foreground text-xs">
                {row.original.dimension || "No dimensions"}
              </div>
            </div>
          ),
        },
        {
          id: "unit",
          header: "Unit",
          cell: ({ row }) => field(row.original, row.index, "unit"),
        },
        {
          id: "quantity",
          header: "Qty",
          cell: ({ row }) => field(row.original, row.index, "quantity"),
          meta: { cellClassName: "text-right" },
        },
        {
          id: "price",
          header: "Price / Unit",
          cell: ({ row }) =>
            editable
              ? field(row.original, row.index, "unit_price")
              : amount(row.original.unit_price),
          meta: { cellClassName: "text-right" },
        },
        {
          id: "subtotal",
          header: "Subtotal",
          cell: ({ row }) => amount(row.original.subtotal),
        },
        {
          id: "discount",
          header: "Discount",
          cell: ({ row }) =>
            editable
              ? field(row.original, row.index, "discount")
              : amount(
                  row.original.discount,
                  "text-rose-600 dark:text-rose-400",
                ),
        },
        {
          id: "net",
          header: "Net amount",
          cell: ({ row }) => amount(row.original.net_amount),
        },
        {
          id: "tax",
          header: "Tax",
          cell: ({ row }) => (
            <div className="space-y-1">
              {amount(
                row.original.vat_amount,
                "text-emerald-600 dark:text-emerald-400",
              )}
              <p className="text-muted-foreground text-right text-xs">
                VAT {row.original.vat_rate}% · WHT {row.original.wht_rate}%
              </p>
            </div>
          ),
        },
        {
          id: "total",
          header: "Total",
          cell: ({ row }) =>
            amount(
              addDecimal([row.original.net_amount, row.original.vat_amount]),
              "text-primary font-semibold",
            ),
        },
        {
          id: "match",
          header: "Match",
          cell: ({ row }) => (
            <ApStatusBadge value={row.original.match_status} />
          ),
        },
        {
          id: "actions",
          header: "Action",
          cell: ({ row }) => (
            <div className="flex">
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Line ${row.index + 1} details`}
                onClick={() => onConfigure(row.index)}
              >
                <SlidersHorizontal className="size-4" />
              </Button>
              {editable && (
                <>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Move line up"
                    disabled={row.index === 0}
                    onClick={() => onMove(row.index, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Move line down"
                    disabled={row.index === lines.length - 1}
                    onClick={() => onMove(row.index, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Delete line"
                    disabled={lines.length === 1}
                    onClick={() => onRemove(row.index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}
