
import { lazy, Suspense, useState } from "react";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { TransferItem } from "@/components/ui/transfer";
import {
  INVENTORY_TYPE,
  LOCATION_TYPE_BADGE_VARIANT,
} from "@/constant/location";
import { cn } from "@/lib/utils";
import type { UserLocationItem } from "@/hooks/use-user";
import { EmptyState, FilterChip, SectionCard } from "./user-assigned-ui";

// แทน next/dynamic ด้วย React.lazy (code-split transfer chunk เหมือนเดิม)
const Transfer = lazy(() =>
  import("@/components/ui/transfer").then((m) => ({ default: m.Transfer })),
);

/* ------------------------------------------------------------------ */
/* Location type constants — local to this section                     */
/* ------------------------------------------------------------------ */

const LOCATION_TYPE_ORDER: INVENTORY_TYPE[] = [
  INVENTORY_TYPE.INVENTORY,
  INVENTORY_TYPE.CONSIGNMENT,
  INVENTORY_TYPE.DIRECT,
];

const LOCATION_TYPE_LABEL: Record<INVENTORY_TYPE, string> = {
  [INVENTORY_TYPE.INVENTORY]: "Inventory",
  [INVENTORY_TYPE.DIRECT]: "Direct",
  [INVENTORY_TYPE.CONSIGNMENT]: "Consignment",
};

const LOCATION_TYPE_BORDER: Record<INVENTORY_TYPE, string> = {
  [INVENTORY_TYPE.INVENTORY]: "border-l-info",
  [INVENTORY_TYPE.DIRECT]: "border-l-warning",
  [INVENTORY_TYPE.CONSIGNMENT]: "border-l-muted-foreground/50",
};

const LOCATION_TYPE_DOT: Record<INVENTORY_TYPE, string> = {
  [INVENTORY_TYPE.INVENTORY]: "bg-info",
  [INVENTORY_TYPE.DIRECT]: "bg-warning",
  [INVENTORY_TYPE.CONSIGNMENT]: "bg-muted-foreground/50",
};

/* ------------------------------------------------------------------ */
/* LocationRow — single location row in view mode                      */
/* ------------------------------------------------------------------ */

function LocationRow({ loc }: { readonly loc: UserLocationItem }) {
  return (
    <div
      className={cn(
        "border-border/60 bg-card hover:bg-muted/40 flex items-center gap-2 rounded-lg border border-l-[3px] p-2 text-xs transition-colors",
        LOCATION_TYPE_BORDER[loc.location_type],
      )}
    >
      <MapPin
        className="text-muted-foreground size-3.5 shrink-0"
        aria-hidden="true"
      />
      <span className="text-[0.6875rem] font-semibold">
        {loc.location_code}
      </span>
      <span className="text-muted-foreground/60">·</span>
      <span className="flex-1 truncate">{loc.location_name}</span>
      {!loc.is_active && (
        <Badge variant="secondary" size="xs">
          Inactive
        </Badge>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LocationsSection — view (grouped + filter) vs edit (Transfer)       */
/* ------------------------------------------------------------------ */

interface LocationsSectionProps {
  readonly isView: boolean;
  readonly isLoading: boolean;
  readonly isDisabled: boolean;
  readonly userLocations: UserLocationItem[];
  readonly locationSource: TransferItem[];
  readonly locationTargetKeys: string[];
  readonly onTargetKeysChange: (keys: string[]) => void;
  readonly transferLoading: boolean;
  readonly initialLocationCount: number;
}

export function LocationsSection({
  isView,
  isLoading,
  isDisabled,
  userLocations,
  locationSource,
  locationTargetKeys,
  onTargetKeysChange,
  transferLoading,
  initialLocationCount,
}: LocationsSectionProps) {
  const [typeFilter, setTypeFilter] = useState<INVENTORY_TYPE | "all">("all");

  const groupedLocations = (() => {
    const m = new Map<INVENTORY_TYPE, UserLocationItem[]>();
    for (const loc of userLocations) {
      const arr = m.get(loc.location_type) ?? [];
      arr.push(loc);
      m.set(loc.location_type, arr);
    }
    return m;
  })();

  const locationCounts = {
    all: userLocations.length,
    [INVENTORY_TYPE.INVENTORY]:
      groupedLocations.get(INVENTORY_TYPE.INVENTORY)?.length ?? 0,
    [INVENTORY_TYPE.DIRECT]:
      groupedLocations.get(INVENTORY_TYPE.DIRECT)?.length ?? 0,
    [INVENTORY_TYPE.CONSIGNMENT]:
      groupedLocations.get(INVENTORY_TYPE.CONSIGNMENT)?.length ?? 0,
  };

  const present = LOCATION_TYPE_ORDER.filter((t) => groupedLocations.has(t));
  const visibleGroups = typeFilter === "all" ? present : present.filter((t) => t === typeFilter);

  const action =
    isView && userLocations.length > 0 ? (
      <div className="flex flex-wrap items-center gap-1">
        <FilterChip
          label="All"
          count={locationCounts.all}
          active={typeFilter === "all"}
          onClick={() => setTypeFilter("all")}
        />
        {LOCATION_TYPE_ORDER.filter((t) => locationCounts[t] > 0).map((t) => (
          <FilterChip
            key={t}
            label={LOCATION_TYPE_LABEL[t]}
            count={locationCounts[t]}
            active={typeFilter === t}
            onClick={() => setTypeFilter(t)}
            accentClass={LOCATION_TYPE_DOT[t]}
          />
        ))}
      </div>
    ) : undefined;

  return (
    <SectionCard
      icon={MapPin}
      title="Locations"
      count={isView ? initialLocationCount : locationTargetKeys.length}
      action={action}
    >
      {isView ? (
        <LocationsView
          isLoading={isLoading}
          userLocations={userLocations}
          visibleGroups={visibleGroups}
          groupedLocations={groupedLocations}
        />
      ) : (
        <Suspense fallback={null}>
          <Transfer
            dataSource={locationSource}
            targetKeys={locationTargetKeys}
            onChange={onTargetKeysChange}
            disabled={isDisabled}
            loading={transferLoading}
            titles={["Available Locations", "Assigned Locations"]}
          />
        </Suspense>
      )}
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* LocationsView — sub-component to keep the parent cognitive          */
/* complexity below the SonarLint threshold                            */
/* ------------------------------------------------------------------ */

interface LocationsViewProps {
  readonly isLoading: boolean;
  readonly userLocations: UserLocationItem[];
  readonly visibleGroups: INVENTORY_TYPE[];
  readonly groupedLocations: Map<INVENTORY_TYPE, UserLocationItem[]>;
}

function LocationsView({
  isLoading,
  userLocations,
  visibleGroups,
  groupedLocations,
}: LocationsViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (userLocations.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title="No locations assigned"
        desc="Switch to edit mode to assign locations"
      />
    );
  }
  if (visibleGroups.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title="No locations match filter"
        desc="Clear filter to see all locations"
      />
    );
  }
  return (
    <div className="space-y-4">
      {visibleGroups.map((type) => {
        const items = groupedLocations.get(type) ?? [];
        return (
          <div key={type}>
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    LOCATION_TYPE_DOT[type],
                  )}
                  aria-hidden="true"
                />
                <h3 className="text-foreground text-[0.6875rem] font-semibold tracking-widest uppercase">
                  {LOCATION_TYPE_LABEL[type]}
                </h3>
              </div>
              <Badge variant={LOCATION_TYPE_BADGE_VARIANT[type]} size="xs">
                {items.length}
              </Badge>
            </div>
            <div className="space-y-1.5">
              {items.map((loc) => (
                <LocationRow key={loc.location_id} loc={loc} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
