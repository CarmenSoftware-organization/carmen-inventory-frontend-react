
import { useState } from "react";
import { useTranslations } from "use-intl";
import { ClipboardList } from "lucide-react";
import { useGoodsReceiveNoteByVendorForCn } from "@/hooks/use-goods-receive-note";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import type { GoodsReceiveNote } from "@/types/goods-receive-note";
import { Badge } from "@/components/ui/badge";
import { LookupCombobox } from "./lookup-combobox";

interface LookupGrnByVendorForCnProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (grn: GoodsReceiveNote) => void;
  readonly vendorId?: string;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly error?: string;
  readonly readOnly?: boolean;
}

/**
 * Lookup Popover สำหรับเลือก GRN ของ vendor ที่ใช้ออก Credit Note ได้
 *
 * ใช้ `useGoodsReceiveNoteByVendorForCn(vendorId)` เรียก endpoint
 * `/good-received-note/vendor/:vendor_id/cn` ซึ่งคืนเฉพาะ GRN ที่ออก CN ได้
 * (commit/saved + ยังไม่ credit เต็มจำนวน) พร้อม server-side search และ
 * infinite scroll (perpage 30) disabled เมื่อไม่มี `vendorId`
 *
 * @param value - id ของ GRN ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่งเฉพาะ id
 * @returns JSX popover element ของ GRN-for-CN lookup
 * @example
 * ```tsx
 * const vendorId = useWatch({ control, name: "vendor_id" });
 * <Controller name="grn_id" control={control} render={({ field }) => (
 *   <LookupGrnByVendorForCn
 *     value={field.value}
 *     onValueChange={field.onChange}
 *     vendorId={vendorId}
 *   />
 * )} />
 * ```
 */
export function LookupGrnByVendorForCn({
  value,
  onValueChange,
  onItemChange,
  vendorId,
  disabled,
  placeholder,
  className,
  error,
  readOnly,
}: LookupGrnByVendorForCnProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");

  const useListByVendor = (params: { search?: string; perpage: number; page?: number }) =>
    useGoodsReceiveNoteByVendorForCn(vendorId, params);

  const { items: grns, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<GoodsReceiveNote>({
      useListHook: useListByVendor,
      search,
      perpage: 30,
      resetDeps: [vendorId],
    });

  return (
    <LookupCombobox
      value={value}
      onValueChange={(id, item) => {
        onValueChange(id);
        if (item) onItemChange?.(item);
      }}
      items={grns}
      getId={(g) => g.id}
      getLabel={(g) => g.invoice_no || g.grn_no}
      getSearchValue={(g) => `${g.grn_no} ${g.invoice_no ?? ""}`}
      renderItem={(g) => (
        <>
          <Badge size="xs" variant="secondary" className="shrink-0">
            {g.grn_no}
          </Badge>
          <span className="flex-1 truncate text-left">{g.invoice_no}</span>
        </>
      )}
      renderSelected={(g) => `${g.grn_no} - ${g.invoice_no ?? ""}`}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      placeholder={placeholder ?? tl("select", { entity: tfl("grn") })}
      searchPlaceholder={tl("search", { entity: tfl("grn") })}
      disabled={disabled || !vendorId}
      isLoading={isLoading}
      className={className}
      popoverWidth="w-90"
      popoverAlign="start"
      emptyIcon={ClipboardList}
      emptyTitle={tl("noFound", { entity: tfl("grn") })}
      emptyDescription={tl("noFoundDesc")}
      error={error}
      readOnly={readOnly}
    />
  );
}
