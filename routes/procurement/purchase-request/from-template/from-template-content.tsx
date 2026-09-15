import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
  useReactTable,
  getCoreRowModel,
} from "@tanstack/react-table";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixQty,
} from "@/components/ui/input/input-suffix";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import EmptyComponent from "@/components/empty-component";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import SearchInput from "@/components/search-input";
import { usePurchaseRequestTemplates } from "../use-purchase-request";
import TemplateCard from "./template-card";
import type {
  PurchaseRequestTemplate,
  PurchaseRequestTemplateDetail,
} from "@/types/purchase-request";

const PR_LIST_PATH = "/procurement/purchase-request";

const buildQtyColumns = (
  tfl: ReturnType<typeof useTranslations>,
  qtyById: Record<string, number>,
  onQtyChange: (id: string, qty: number) => void,
): ColumnDef<PurchaseRequestTemplateDetail>[] => [
  {
    id: "index",
    header: "#",
    size: 48,
    meta: {
      headerClassName: "text-center",
      cellClassName: "text-center text-muted-foreground tabular-nums",
    },
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "location_name",
    header: tfl("location"),
    size: 180,
    cell: ({ row }) => (
      <NameWithSubtext
        primary={row.original.location_name || "—"}
        secondary={row.original.location_code ?? undefined}
      />
    ),
  },
  {
    accessorKey: "product_name",
    header: tfl("product"),
    size: 320,
    cell: ({ row }) => (
      <NameWithSubtext
        primary={row.original.product_name}
        secondary={row.original.product_local_name ?? undefined}
      />
    ),
  },
  {
    id: "requested",
    header: tfl("requested"),
    size: 180,
    meta: { headerClassName: "text-right", cellClassName: "text-right" },
    cell: ({ row }) => {
      const d = row.original;
      return (
        <InputSuffixField>
          <InputSuffixQty
            aria-label={`${tfl("requested")} ${d.product_name}`}
            defaultValue={qtyById[d.id] ?? d.requested_qty ?? 0}
            className="tabular-nums"
            onChange={(e) => {
              const n = e.target.valueAsNumber;
              onQtyChange(d.id, Number.isNaN(n) ? 0 : n);
            }}
          />
          <InputSuffixAddon>
            <span className="text-muted-foreground px-2 text-xs">
              {d.requested_unit_name}
            </span>
          </InputSuffixAddon>
        </InputSuffixField>
      );
    },
  },
];

export function FromTemplateContent() {
  const t = useTranslations("procurement.purchaseRequest");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<PurchaseRequestTemplate | null>(
    null,
  );
  /** จำนวนที่จะขอรอบนี้ ต่อแถวของเทมเพลต (key = id ของ template detail) */
  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const { data: templates, isLoading } = usePurchaseRequestTemplates(true);

  const term = searchTerm.trim().toLowerCase();
  const filteredTemplates = !term
    ? (templates ?? [])
    : (templates ?? []).filter(
        (template) =>
          template.name?.toLowerCase().includes(term) ||
          template.department_name?.toLowerCase().includes(term) ||
          template.workflow_name?.toLowerCase().includes(term),
      );

  const hasTemplates = !isLoading && !!templates && templates.length > 0;

  const handleSelect = (id: string) => {
    const template = templates?.find((item) => item.id === id);
    if (!template) return;
    setQtyById(
      Object.fromEntries(
        template.purchase_request_template_detail.map((d) => [
          d.id,
          d.requested_qty ?? 0,
        ]),
      ),
    );
    setSelected(template);
  };

  const qtyRows = selected?.purchase_request_template_detail ?? [];
  const qtyTable = useReactTable({
    data: qtyRows,
    columns: buildQtyColumns(tfl, qtyById, (id, qty) =>
      setQtyById((prev) => ({ ...prev, [id]: qty })),
    ),
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  const pickedItems = selected
    ? selected.purchase_request_template_detail.filter(
        (d) => (qtyById[d.id] ?? 0) > 0,
      )
    : [];

  const handleContinue = () => {
    if (!selected || pickedItems.length === 0) return;
    navigate(`${PR_LIST_PATH}/new`, {
      state: {
        template: {
          ...selected,
          purchase_request_template_detail: pickedItems.map((d) => ({
            ...d,
            requested_qty: qtyById[d.id] ?? 0,
          })),
        },
      },
    });
  };

  if (selected) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <header className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSelected(null)}
            aria-label={tc("goBack")}
            className="mt-0.5"
          >
            <ArrowLeft />
          </Button>
          <div className="min-w-0 flex-1 space-y-0.5">
            {/* workflow นำหน้าชื่อเทมเพลต — ใบที่กำลังจะเกิดเดินตาม workflow นี้
                และเปลี่ยนทีหลังไม่ได้ ต้องเห็นก่อนกรอกจำนวน ไม่ใช่ไปรู้ในฟอร์ม */}
            <h1 className="text-foreground flex min-w-0 items-baseline gap-1.5 text-lg font-semibold tracking-tight">
              {selected.workflow_name && (
                <>
                  <span>{selected.workflow_name}</span>
                  <span className="text-muted-foreground/60 shrink-0 font-normal">
                    ·
                  </span>
                </>
              )}
              <span className="truncate">{selected.name}</span>
            </h1>
            <p className="text-muted-foreground text-xs">
              {t("templateQtyDesc")}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleContinue}
            disabled={pickedItems.length === 0}
            className="mr-10"
          >
            {tc("next")}
            <ArrowRight />
          </Button>
        </header>

        <div className="space-y-4 px-10">
          <DataGrid
            table={qtyTable}
            recordCount={qtyRows.length}
            tableLayout={{
              headerBackground: true,
              rowBorder: true,
              rowClamp: false,
            }}
            tableClassNames={{
              base: "text-xs",
              headerRow: "h-10",
              bodyRow: "h-14",
            }}
          >
            <DataGridContainer className="rounded-lg border">
              <DataGridTable />
            </DataGridContainer>
          </DataGrid>
          <p className="text-muted-foreground text-micro tabular-nums">
            {t("nItems", { count: pickedItems.length })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="flex items-start gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate(PR_LIST_PATH)}
          aria-label={tc("goBack")}
          className="mt-0.5"
        >
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h1 className="text-foreground text-lg font-semibold tracking-tight">
            {t("selectTemplate")}
          </h1>
          <p className="text-muted-foreground text-xs">
            {t("selectTemplateDesc")}
          </p>
        </div>
      </header>

      <div className="space-y-4 px-10">
        {hasTemplates && (
          <SearchInput
            defaultValue={searchTerm}
            onSearch={setSearchTerm}
            onInputChange={setSearchTerm}
            containerClassName="w-96"
          />
        )}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          </div>
        )}

        {hasTemplates && filteredTemplates.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}

        {hasTemplates && filteredTemplates.length === 0 && (
          <div className="py-12">
            <EmptyComponent
              title={t("noTemplateResults")}
              description={t("tryDifferentSearch")}
            />
          </div>
        )}

        {!isLoading && !hasTemplates && (
          <div className="py-12">
            <EmptyComponent
              title={t("noTemplates")}
              description={t("noTemplatesDesc")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
