import { useState } from "react";
import { useTranslations } from "use-intl";
import { Warehouse } from "lucide-react";
import { useLocationsByProduct } from "@/hooks/use-locations-by-product";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import type { Location } from "@/types/location";
import { Badge } from "@/components/ui/badge";
import { LocationTypeLabel } from "@/components/share/location-type-label";
import { LookupCombobox } from "./lookup-combobox";

interface LookupProductLocationProps {
  readonly productId: string;
  /** ส่งมาแล้วจะดึง location ที่ workflow นั้นอนุญาตแทน location ตามสิทธิ์ user */
  readonly workflowId?: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (location: Location) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  /** ความสูงของ trigger — xs=h-6 · sm=h-8 (default) · default=h-9 */
  readonly size?: "xs" | "sm" | "default";
  readonly excludeIds?: string[];
  readonly modal?: boolean;
  readonly defaultLabel?: string;
  readonly error?: string;
  readonly readOnly?: boolean;
  /** เปิด popover อัตโนมัติตอน mount (เช่น auto-focus หลังเพิ่ม location ใหม่) */
  readonly defaultOpen?: boolean;
  /** คุมเปิด/ปิดจากข้างนอก — สั่งเปิดหลัง mount ได้ (ต้องคุมปิดเองด้วย) */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  /** ปิดแล้วโฟกัสไปช่องถัดไปแทนการเด้งกลับปุ่มเดิม */
  readonly nextFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Lookup Popover สำหรับเลือก location ที่มีสินค้าชิ้นนั้น ๆ อยู่ (cascading จาก productId)
 *
 * ใช้ `useLocationsByProduct(productId)` ดึงเฉพาะ location ที่ผูกกับ product นั้น
 * พร้อม server-side search และ infinite scroll (perpage 30) disabled เมื่อไม่มี `productId`
 * มี `onItemChange` ส่ง object `Location` เต็ม
 * ใส่ `workflowId` เพิ่มได้ถ้าอยากได้เฉพาะ location ที่ workflow นั้นอนุญาต (ฟอร์ม PO)
 *
 * @param value - location id ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่งเฉพาะ id
 * @returns JSX popover element ของ product-location lookup
 * @example
 * ```tsx
 * const productId = useWatch({ control, name: "product_id" });
 * <Controller name="location_id" control={control} render={({ field }) => (
 *   <LookupProductLocation productId={productId} value={field.value} onValueChange={field.onChange} />
 * )} />
 * ```
 */
export function LookupProductLocation({
  productId,
  workflowId,
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  size,
  excludeIds,
  modal,
  defaultLabel,
  error,
  readOnly,
  defaultOpen,
  open,
  onOpenChange,
  nextFocusRef,
}: LookupProductLocationProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");

  const excludedSet = excludeIds ? new Set(excludeIds) : undefined;

  const useListHook = (params: {
    search?: string;
    perpage: number;
    page?: number;
  }) => useLocationsByProduct(productId || undefined, params, workflowId);

  const {
    items: locations,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<Location>({
    useListHook,
    search,
    perpage: 30,
    filter: (l: Location) => {
      if (excludedSet && excludedSet.has(l.id)) return false;
      return true;
    },
  });

  return (
    <LookupCombobox
      size={size}
      value={value}
      onValueChange={(id, item) => {
        onValueChange(id);
        if (item) onItemChange?.(item);
      }}
      items={locations}
      getId={(l) => l.id}
      getLabel={(l) => `${l.name} - ${l.code}`}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      renderItem={(l) => (
        <>
          <Badge size="xs" variant="secondary" className="shrink-0">
            {l.code}
          </Badge>
          <span className="flex-1 truncate text-left">{l.name}</span>
          <LocationTypeLabel type={l.location_type} className="shrink-0" />
        </>
      )}
      placeholder={placeholder ?? tl("select", { entity: tfl("location") })}
      searchPlaceholder={tl("search", { entity: tfl("location") })}
      disabled={disabled || !productId}
      className={className}
      popoverAlign="start"
      popoverWidth="w-[26.25rem]"
      emptyIcon={Warehouse}
      emptyTitle={tl("noFound", { entity: tfl("location") })}
      emptyDescription={tl("noFoundDesc")}
      isLoading={isLoading}
      modal={modal}
      defaultLabel={defaultLabel}
      error={error}
      readOnly={readOnly}
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      nextFocusRef={nextFocusRef}
    />
  );
}
