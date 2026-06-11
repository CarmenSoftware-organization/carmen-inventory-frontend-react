
import { useState } from "react";
import { useTranslations } from "use-intl";
import { usePriceListTemplate } from "@/hooks/use-price-list-template";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import type { PriceListTemplate } from "@/types/price-list-template";
import { LookupCombobox } from "./lookup-combobox";

interface LookupPrtProps {
  readonly value: string;
  readonly onValueChange: (
    value: string,
    template?: PriceListTemplate,
  ) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly error?: string;
}

/**
 * Lookup Popover สำหรับเลือก Price List Template (PRT)
 *
 * ดึงข้อมูลผ่าน `usePriceListTemplate` hook พร้อม server-side search และ infinite scroll
 * (perpage 30) filter เฉพาะ `status === "active"` onValueChange ส่งทั้ง id และ
 * object `PriceListTemplate` เต็มสำหรับ side effects
 *
 * @param value - template id ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่ง id และ object PriceListTemplate
 * @returns JSX popover element ของ PRT lookup
 * @example
 * ```tsx
 * <Controller name="template_id" control={control} render={({ field }) => (
 *   <LookupPrt value={field.value} onValueChange={field.onChange} />
 * )} />
 * ```
 */
export function LookupPrt({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  error,
}: LookupPrtProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  // Lazy: ยิง API ตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)
  const [hasOpened, setHasOpened] = useState(false);

  const { items: templates, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<PriceListTemplate>({
      useListHook: usePriceListTemplate,
      search,
      perpage: 30,
      enabled: hasOpened || !!value,
      filter: (t: PriceListTemplate) => t.status === "active",
    });

  return (
    <LookupCombobox
      value={value}
      onValueChange={(id, item) => onValueChange(id, item)}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={templates}
      getId={(t) => t.id}
      getLabel={(t) => t.name}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      placeholder={placeholder ?? tl("select", { entity: tfl("template") })}
      searchPlaceholder={tl("search", { entity: tfl("template") })}
      disabled={disabled}
      isLoading={isLoading}
      className={className}
      error={error}
    />
  );
}
