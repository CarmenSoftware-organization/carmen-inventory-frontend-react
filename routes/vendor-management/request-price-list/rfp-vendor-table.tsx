import { useMemo } from "react";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { SettingSection } from "@/components/ui/setting-section";
import { EmptyProducts } from "../price-list/pl-empty-states";
import type { Vendor } from "@/types/vendor";
import type { RequestPriceListVendor } from "@/types/request-price-list";
import type { RfpFormValues } from "./rfp-form-schema";
import {
  ContactValue,
  EmailValue,
  PricelistCell,
  SubmissionStatusBadge,
  VendorActionsCell,
  VendorNameCell,
} from "./rfp-vendor-cells";
import { RfpVendorAddRow } from "./rfp-vendor-add-row";

type VendorAddItem = RfpFormValues["vendors"]["add"][number];
type DisplayVendor = RequestPriceListVendor | VendorAddItem;

const EMPTY = (
  <span className="text-muted-foreground text-[0.6875rem] italic">—</span>
);

interface RfpVendorTableProps {
  readonly isDisabled: boolean;
  readonly isAdding: boolean;
  readonly setIsAdding: (v: boolean) => void;
  readonly displayVendors: DisplayVendor[];
  readonly selectedVendorIds: Set<string>;
  readonly onAddVendor: (vendor: Vendor) => void;
  readonly onRemoveVendor: (vendorId: string) => void;
}

/**
 * Vendor section — TanStack DataGrid (project standard) of invited vendors.
 * Read-only rows (contact info auto-filled from the vendor's primary contact);
 * edit mode adds the remove action + an inline add row under the grid.
 */
export default function RfpVendorTable({
  isDisabled,
  isAdding,
  setIsAdding,
  displayVendors,
  selectedVendorIds,
  onAddVendor,
  onRemoveVendor,
}: RfpVendorTableProps) {
  "use no memo";
  const t = useTranslations("vendorManagement.requestPriceList");
  const tfl = useTranslations("field");
  const td = useTranslations("delete");

  const handleAddClick = () => {
    if (!isAdding) setIsAdding(true);
  };

  const columns = useMemo<ColumnDef<DisplayVendor>[]>(() => {
    return [
      {
        id: "index",
        size: 44,
        header: () => "#",
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {row.index + 1}
          </span>
        ),
        meta: { headerClassName: "text-center", cellClassName: "text-center" },
      },
      {
        id: "vendor",
        size: 200,
        header: () => tfl("vendor"),
        cell: ({ row }) => (
          <VendorNameCell
            name={row.original.vendor_name}
            code={row.original.vendor_code}
          />
        ),
      },
      {
        id: "contact",
        size: 150,
        header: () => tfl("contactPerson"),
        cell: ({ row }) => <ContactValue value={row.original.contact_person} />,
      },
      {
        id: "phone",
        size: 160,
        header: () => tfl("phone"),
        cell: ({ row }) => <ContactValue value={row.original.contact_phone} />,
      },
      {
        id: "email",
        size: 220,
        header: () => tfl("email"),
        cell: ({ row }) => <EmailValue value={row.original.contact_email} />,
      },
      {
        id: "status",
        size: 120,
        header: () => tfl("status"),
        cell: ({ row }) => {
          const v = row.original;
          return "url_token" in v ? (
            <SubmissionStatusBadge
              hasSubmitted={v.has_submitted}
              labels={{
                submitted: t("statusSubmitted"),
                pending: t("statusPending"),
              }}
            />
          ) : (
            EMPTY
          );
        },
        meta: { headerClassName: "text-center", cellClassName: "text-center" },
      },
      {
        id: "pricelist",
        size: 120,
        header: () => tfl("priceList"),
        cell: ({ row }) => {
          const v = row.original;
          return (
            <PricelistCell
              pricelist={"url_token" in v ? v.pricelist : null}
              openLabel={t("viewPricelist")}
            />
          );
        },
      },
      {
        id: "actions",
        size: 108,
        header: () => null,
        cell: ({ row }) => {
          const v = row.original;
          return (
            <VendorActionsCell
              urlToken={"url_token" in v ? v.url_token : ""}
              isDisabled={isDisabled}
              onRemove={() => onRemoveVendor(v.vendor_id)}
              labels={{
                copyUrl: t("vendors.copyUrl"),
                openUrl: t("vendors.openUrl"),
                removeVendor: t("vendors.removeVendor"),
                confirmDesc: td("confirmNamed", { name: v.vendor_name }),
              }}
            />
          );
        },
        meta: { headerClassName: "text-center", cellClassName: "text-right" },
      },
    ];
  }, [t, tfl, td, isDisabled, onRemoveVendor]);

  const table = useReactTable({
    data: displayVendors,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <SettingSection
      wide
      title={t("vendors.title")}
      description={t("vendors.noVendorsDesc")}
      count={displayVendors.length}
      action={
        !isDisabled ? (
          <Button
            type="button"
            size="xs"
            onClick={handleAddClick}
            disabled={isAdding}
          >
            <Plus />
            {t("vendors.addVendor")}
          </Button>
        ) : undefined
      }
    >
      {displayVendors.length === 0 && !isAdding ? (
        <EmptyProducts
          onAdd={handleAddClick}
          disabled={isDisabled}
          title={t("vendors.noVendors")}
          description={t("vendors.noVendorsDesc")}
          addLabel={t("vendors.addVendor")}
        />
      ) : (
        <>
          {displayVendors.length > 0 && (
            <DataGrid
              table={table}
              recordCount={displayVendors.length}
              tableLayout={{ headerSticky: true }}
            >
              <DataGridContainer>
                <DataGridTable />
              </DataGridContainer>
            </DataGrid>
          )}
          {isAdding && (
            <RfpVendorAddRow
              selectedVendorIds={selectedVendorIds}
              onCancel={() => setIsAdding(false)}
              onAddVendor={onAddVendor}
            />
          )}
        </>
      )}
    </SettingSection>
  );
}
