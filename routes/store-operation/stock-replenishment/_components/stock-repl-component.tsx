
import { useState } from "react";
import { useTranslations } from "use-intl";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  FileText,
  MapPin,
  Package,
  RefreshCcw,
  ShoppingCart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import DisplayTemplate from "@/components/display-template";
import SearchInput from "@/components/search-input";
import { useStockReplenishment } from "@/hooks/use-stock-replenishment";
import type { Location, ProductLocation } from "@/types/stock-replenishment";
import { StockReplLocation } from "./stock-repl-location";

/**
 * กรอง locations และรายการสินค้าภายในด้วยคำค้น (ชื่อ, หมวดหมู่, กลุ่มสินค้า)
 * คืนเฉพาะ location ที่มี products_location ที่ตรงกับคำค้น
 *
 * @param locations - รายการ location ทั้งหมด
 * @param search - คำค้น (case-insensitive)
 * @returns รายการ location ที่ตรงกับคำค้น
 * @example
 * const result = filterLocations(locations, "milk");
 */
const filterLocations = (locations: Location[], search: string): Location[] => {
  if (!search) return locations;
  const term = search.toLowerCase();
  return locations
    .map((loc) => ({
      ...loc,
      products_location: loc.products_location.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.category.name.toLowerCase().includes(term) ||
          p.sub_category.name.toLowerCase().includes(term) ||
          p.item_group.name.toLowerCase().includes(term),
      ),
    }))
    .filter((loc) => loc.products_location.length > 0);
};

/**
 * คอมโพเนนต์หลักของหน้า Stock Replenishment
 * แสดงสรุปยอดสินค้าที่ต้องเติม แบ่งตาม location, สถานะ critical/warning/low
 * และรองรับเลือกสินค้าเพื่อสร้าง PR/SR
 *
 * @returns คอมโพเนนต์หน้า stock replenishment
 * @example
 * // ใช้ใน app/(root)/store-operation/stock-replenishment/page.tsx
 * import StockReplComponent from "./_components/stock-repl-component";
 * export default function Page() { return <StockReplComponent />; }
 */
export default function StockReplComponent() {
  const t = useTranslations("storeOperation.stockReplenishment");
  const tc = useTranslations("common");
  const {
    data: locations,
    isLoading,
    error,
    refetch,
  } = useStockReplenishment();
  const [selections, setSelections] = useState<Map<string, Set<string>>>(
    new Map(),
  );
  const [search, setSearch] = useState("");
  const [openLocations, setOpenLocations] = useState<Set<string>>(new Set());

  const handleOpenChange = (locationId: string, open: boolean) => {
    setOpenLocations((prev) => {
      const next = new Set(prev);
      if (open) {
        next.add(locationId);
      } else {
        next.delete(locationId);
      }
      return next;
    });
  };

  const filteredLocations = filterLocations(locations ?? [], search);

  const allExpanded =
    filteredLocations.length > 0 &&
    filteredLocations.every((l) => openLocations.has(l.location_id));

  const handleExpandAll = () => {
    setOpenLocations(new Set(filteredLocations.map((l) => l.location_id)));
  };

  const handleCollapseAll = () => {
    setOpenLocations(new Set());
  };

  const allProducts = filteredLocations.flatMap((l) => l.products_location);
  const summary = {
    locations: filteredLocations.length,
    totalItems: allProducts.length,
    critical: allProducts.filter((p) => p.status === "critical").length,
    warning: allProducts.filter((p) => p.status === "warning").length,
    low: allProducts.filter((p) => p.status === "low").length,
    totalNeed: allProducts.reduce((sum, p) => sum + p.need, 0),
  };

  const handleSelectionChange = (locationId: string, ids: Set<string>) => {
    setSelections((prev) => {
      const next = new Map(prev);
      if (ids.size === 0) {
        next.delete(locationId);
      } else {
        next.set(locationId, ids);
      }
      return next;
    });
  };

  const totalSelected = Array.from(selections.values()).reduce(
    (sum, ids) => sum + ids.size,
    0,
  );
  const hasSelection = totalSelected > 0;

  const getSelectedProducts = (): ProductLocation[] => {
    if (!locations) return [];
    const result: ProductLocation[] = [];
    for (const loc of locations) {
      const ids = selections.get(loc.location_id);
      if (ids) {
        for (const product of loc.products_location) {
          if (ids.has(product.id)) {
            result.push(product);
          }
        }
      }
    }
    return result;
  };

  const handleCreatePR = () => {
    getSelectedProducts();
  };

  const handleCreateSR = () => {
    getSelectedProducts();
  };

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <DisplayTemplate
      title={t("title")}
      description={t("desc")}
      toolbar={<SearchInput defaultValue={search} onSearch={setSearch} />}
      actions={
        <>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCcw />
            {tc("refresh")}
          </Button>
          {hasSelection && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={!hasSelection}
                onClick={handleCreatePR}
              >
                <FileText />
                {t("createPr")}{hasSelection && ` (${totalSelected})`}
              </Button>
              <Button
                size="sm"
                disabled={!hasSelection}
                onClick={handleCreateSR}
              >
                <ShoppingCart />
                {t("createSr")}{hasSelection && ` (${totalSelected})`}
              </Button>
            </>
          )}
        </>
      }
    >
      {isLoading && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {tc("loading")}
        </div>
      )}
      {!isLoading && locations && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden="true" />
              {t("nLocations", { count: summary.locations })}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="size-3.5" aria-hidden="true" />
              {t("nItems", { count: summary.totalItems })}
            </span>
            <span className="text-muted-foreground/40">|</span>
            <Badge variant="destructive" size="xs">
              {t("nCritical", { count: summary.critical })}
            </Badge>
            <Badge variant="warning" size="xs">
              {t("nWarning", { count: summary.warning })}
            </Badge>
            <Badge variant="secondary" size="xs">
              {t("nLow", { count: summary.low })}
            </Badge>
            <span className="text-muted-foreground/40">|</span>
            <span className="font-semibold">
              {t("totalNeed")}{" "}
              <span className="tabular-nums">
                {summary.totalNeed.toLocaleString()}
              </span>
            </span>
            <span className="ml-auto">
              <Button
                size="xs"
                variant="ghost"
                onClick={allExpanded ? handleCollapseAll : handleExpandAll}
                aria-label={allExpanded ? tc("collapseAll") : tc("expandAll")}
              >
                {allExpanded ? (
                  <ChevronsDownUp className="size-3.5" />
                ) : (
                  <ChevronsUpDown className="size-3.5" />
                )}
                {allExpanded ? tc("collapseAll") : tc("expandAll")}
              </Button>
            </span>
          </div>

          {filteredLocations.map((location) => (
            <StockReplLocation
              key={location.location_id}
              location={location}
              open={openLocations.has(location.location_id)}
              onOpenChange={(open) =>
                handleOpenChange(location.location_id, open)
              }
              selectedIds={
                selections.get(location.location_id) ?? new Set<string>()
              }
              onSelectionChange={handleSelectionChange}
            />
          ))}
        </div>
      )}
    </DisplayTemplate>
  );
}
