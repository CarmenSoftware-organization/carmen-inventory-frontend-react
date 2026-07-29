import { useState } from "react";
import { useTranslations } from "use-intl";
import { ChevronsUpDown, CircleAlert, Warehouse } from "lucide-react";
import { useUserLocation } from "@/hooks/use-user-location";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import type { Location } from "@/types/location";
import { INVENTORY_TYPE } from "@/constant/location";
import { Badge } from "@/components/ui/badge";
import { LocationTypeBadge } from "@/components/ui/location-type-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LookupCombobox } from "./lookup-combobox";

interface LookupUserLocationProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (location: Location) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  /** ความสูงของ trigger — xs=h-6 · sm=h-8 (default) · default=h-9 */
  readonly size?: "xs" | "sm" | "default";
  readonly excludeIds?: Set<string>;
  readonly popoverWidth?: string;
  readonly defaultLabel?: string;
  readonly locationTypes?: INVENTORY_TYPE[];
  readonly disableTooltip?: boolean;
  readonly error?: string;
  /**
   * Lazy mode — แสดงปุ่ม placeholder ก่อน, mount Combobox จริง (เริ่ม fetch API)
   * เมื่อผู้ใช้คลิก. ใช้ลด API call ในฟอร์มที่ผู้ใช้อาจไม่ได้เปลี่ยน location
   */
  readonly lazy?: boolean;
}

export function LookupUserLocation(props: LookupUserLocationProps) {
  const { lazy } = props;
  const [activated, setActivated] = useState(!lazy);

  if (lazy && !activated) {
    return <LazyPlaceholder {...props} onActivate={() => setActivated(true)} />;
  }

  return <LookupUserLocationInner {...props} defaultOpen={lazy} />;
}

function LazyPlaceholder({
  defaultLabel,
  placeholder,
  disabled,
  className,
  size,
  error,
  onActivate,
}: LookupUserLocationProps & { readonly onActivate: () => void }) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const label =
    defaultLabel ?? placeholder ?? tl("select", { entity: tfl("location") });

  return (
    <Button
      type="button"
      variant="outline"
      aria-invalid={!!error}
      onClick={onActivate}
      disabled={disabled}
      className={cn(
        // ต้องสูงเท่า LookupCombobox ที่จะมาแทนหลังกด — ไม่งั้นช่องเด้งขนาด
        // ตอนถูกกดครั้งแรก และไม่ตรงกับ field ข้าง ๆ ที่ตั้ง size เดียวกัน
        "flex items-center justify-between pr-1 pl-3 text-xs",
        size === "default" && "h-9",
        size === "xs" && "h-6 gap-1 px-2 text-xs",
        (!size || size === "sm") && "h-8",
        error && "border-destructive pr-7",
        className,
      )}
    >
      <span
        className={cn(
          "truncate",
          !defaultLabel && "text-muted-foreground text-xs",
        )}
      >
        {label}
      </span>
      {error ? (
        <CircleAlert
          className="text-destructive size-4 shrink-0"
          aria-hidden="true"
        />
      ) : (
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      )}
    </Button>
  );
}

// Default popover ที่กว้างพอสำหรับชื่อ location ยาว ๆ (code + name + type badge)
// — caller สามารถ override ผ่าน prop popoverWidth ได้ตามต้องการ
const DEFAULT_POPOVER_WIDTH = "w-[30rem]";

function LookupUserLocationInner({
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  size,
  excludeIds,
  popoverWidth = DEFAULT_POPOVER_WIDTH,
  defaultLabel,
  locationTypes,
  disableTooltip,
  error,
  defaultOpen,
}: LookupUserLocationProps & { readonly defaultOpen?: boolean }) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");

  const {
    items: locations,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<Location>({
    useListHook: useUserLocation,
    search,
    perpage: 30,
    filter: (l: Location) => {
      if (!l.is_active) return false;
      if (excludeIds && excludeIds.has(l.id)) return false;
      if (locationTypes && !locationTypes.includes(l.location_type))
        return false;
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
      getLabel={(l) => `${l.code} — ${l.name}`}
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
          <LocationTypeBadge
            type={l.location_type}
            size="xs"
            className="shrink-0"
          />
        </>
      )}
      placeholder={placeholder ?? tl("select", { entity: tfl("location") })}
      searchPlaceholder={tl("search", { entity: tfl("location") })}
      disabled={disabled}
      isLoading={isLoading}
      className={className}
      popoverAlign="start"
      emptyIcon={Warehouse}
      emptyTitle={tl("noDefined", { entity: tfl("location") })}
      emptyDescription={tl("noAvailable", { entity: tfl("location") })}
      popoverWidth={popoverWidth}
      defaultLabel={defaultLabel}
      disableTooltip={disableTooltip}
      error={error}
      defaultOpen={defaultOpen}
    />
  );
}
