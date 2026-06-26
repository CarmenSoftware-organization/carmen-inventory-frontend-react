
import { useState } from "react";
import { useRouter } from "@/lib/compat/navigation";
import { ClipboardCheck, History, MapPin, PauseCircle } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { useSpotCheckCurrent } from "@/hooks/use-spot-check-current";
import { useSpotCheck } from "@/hooks/use-spot-check";
import { ErrorState } from "@/components/ui/error-state";
import {
  SPOT_CHECK_METHODS,
  getSpotCheckMethodLabel,
} from "@/constant/spot-check-method";
import type {
  SpotCheck,
  SpotCheckLocation,
  SpotCheckLocationLatest,
  SpotCheckStatus,
} from "@/types/spot-check";
import {
  InvListShell,
  InvPageHeader,
  InvSearchBar,
  InvStatusSectionsList,
  KpiTile,
  StatusHero,
  type InvStatusSection,
  type SectionTone,
} from "../../_shared/inv-shared";
import { ScHistoryCard } from "./sc-history-card";
import { ScLocationCard } from "./sc-location-card";
import { Reveal } from "@/components/share/reveal";

type StatusKey = "resume" | "not_started";
type ViewMode = "locations" | "history";

const HISTORY_STATUS_KEYS: SpotCheckStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "void",
  "voided",
  "cancelled",
];

export default function ScComponent() {
  const t = useTranslations("inventoryManagement.spotCheck");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("locations");
  const [search, setSearch] = useState("");
  const [includeNotCount, setIncludeNotCount] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | StatusKey>("all");
  const [historyLocation, setHistoryLocation] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [historyMethod, setHistoryMethod] = useState("");

  const {
    data: locations = [],
    isLoading: isLoadingLocations,
    error: locationsError,
    refetch: refetchLocations,
  } = useSpotCheckCurrent(includeNotCount);

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    error: historyError,
    refetch: refetchHistory,
  } = useSpotCheck({ perpage: -1 }, { enabled: view === "history" });

  const resume: SpotCheckLocation[] = [];
  const notStarted: SpotCheckLocation[] = [];
  for (const l of locations) {
    if (l.latest_spot_check === null) {
      notStarted.push(l);
    } else {
      resume.push(l);
    }
  }
  const counts = {
    all: locations.length,
    resume: resume.length,
    notStarted: notStarted.length,
  };

  const filterLocationByQuery = (list: SpotCheckLocation[]) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (l) =>
        l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q),
    );
  };

  const allSections: InvStatusSection<SpotCheckLocation>[] = [
    {
      key: "resume",
      title: t("tabResume"),
      icon: PauseCircle,
      tone: "warning" satisfies SectionTone,
      items: filterLocationByQuery(resume),
    },
    {
      key: "not_started",
      title: t("tabNotStarted"),
      icon: ClipboardCheck,
      tone: "info" satisfies SectionTone,
      items: filterLocationByQuery(notStarted),
    },
  ];
  const sections = allSections.filter(
    (s) =>
      (activeFilter === "all" || activeFilter === s.key) &&
      (s.items.length > 0 || activeFilter === s.key),
  );

  const historyItems: SpotCheck[] = historyData?.data ?? [];

  const locationOptions = (() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    for (const sc of historyItems) {
      if (seen.has(sc.location_id)) continue;
      seen.add(sc.location_id);
      opts.push({
        value: sc.location_id,
        label: `${sc.location_code} · ${sc.location_name}`,
      });
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  })();

  const statusOptions = HISTORY_STATUS_KEYS.map((key) => ({
    value: key,
    label: ts(key),
  }));

  const methodOptions = SPOT_CHECK_METHODS.map((m) => ({
    value: m,
    label: getSpotCheckMethodLabel(t, m),
  }));

  const filteredHistory = (() => {
    const q = search.trim().toLowerCase();
    const locSet = historyLocation ? new Set(historyLocation.split(",")) : null;
    const statSet = historyStatus ? new Set(historyStatus.split(",")) : null;
    const methSet = historyMethod ? new Set(historyMethod.split(",")) : null;
    return historyItems.filter((sc) => {
      if (q) {
        const hay =
          `${sc.spot_check_no} ${sc.location_name} ${sc.location_code}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (locSet && !locSet.has(sc.location_id)) return false;
      if (statSet && !statSet.has(sc.doc_status)) return false;
      if (methSet && !methSet.has(sc.method)) return false;
      return true;
    });
  })();

  const historySections: InvStatusSection<SpotCheck>[] = [
    {
      key: "history",
      title: t("viewHistory"),
      icon: History,
      tone: "info" satisfies SectionTone,
      items: filteredHistory,
    },
  ];

  const handleStart = (item: SpotCheckLocation) => {
    router.push(
      `/inventory-management/spot-check/location/${item.location_id}`,
    );
  };

  const handleResume = (
    _item: SpotCheckLocation,
    latest: SpotCheckLocationLatest,
  ) => {
    router.push(`/inventory-management/spot-check/${latest.id}`);
  };

  const handleHistoryClick = (sc: SpotCheck) => {
    router.push(`/inventory-management/spot-check/${sc.id}`);
  };

  const isLocationsView = view === "locations";
  const error = isLocationsView ? locationsError : historyError;
  const refetch = isLocationsView ? refetchLocations : refetchHistory;

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <InvListShell>
      <section className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
        <div>
          <Reveal>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <InvPageHeader
                  icon={ClipboardCheck}
                  eyebrow={t("entity")}
                  title={t("title")}
                  desc={t("desc")}
                />
              </div>
              <ViewToggle view={view} setView={setView} t={t} />
            </div>
          </Reveal>

          {isLocationsView && (
            <Reveal delay={80}>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <KpiTile
                  icon={ClipboardCheck}
                  label={t("tabAll")}
                  value={counts.all}
                  active={activeFilter === "all"}
                  onClick={() => setActiveFilter("all")}
                />
                <KpiTile
                  icon={PauseCircle}
                  label={t("tabResume")}
                  value={counts.resume}
                  tone="warning"
                  active={activeFilter === "resume"}
                  onClick={() => setActiveFilter("resume")}
                />
                <KpiTile
                  icon={ClipboardCheck}
                  label={t("tabNotStarted")}
                  value={counts.notStarted}
                  tone="info"
                  active={activeFilter === "not_started"}
                  onClick={() => setActiveFilter("not_started")}
                />
              </div>
            </Reveal>
          )}

          <Reveal delay={160}>
            <InvSearchBar
              search={search}
              onSearch={setSearch}
              extras={
                isLocationsView ? (
                  <label className="border-border/40 bg-card hover:border-foreground/40 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold select-none">
                    <Checkbox
                      checked={includeNotCount}
                      onCheckedChange={(v) => setIncludeNotCount(v === true)}
                    />
                    {t("includeNotCount")}
                  </label>
                ) : (
                  <HistoryFilters
                    locationValue={historyLocation}
                    onLocationChange={setHistoryLocation}
                    locationOptions={locationOptions}
                    statusValue={historyStatus}
                    onStatusChange={setHistoryStatus}
                    statusOptions={statusOptions}
                    methodValue={historyMethod}
                    onMethodChange={setHistoryMethod}
                    methodOptions={methodOptions}
                    labels={{
                      location: tfl("location"),
                      status: tfl("status"),
                      method: tfl("method"),
                    }}
                  />
                )
              }
            />
          </Reveal>
        </div>

        <Reveal delay={120}>
          <StatusHero
            total={isLocationsView ? counts.all : historyItems.length}
            done={0}
            active={isLocationsView ? counts.resume : 0}
            labels={{
              progressTitle: t("checkProgress"),
              done: t("tabCompleted"),
              active: isLocationsView ? t("tabResume") : t("viewHistory"),
              pending: t("tabNotStarted"),
              heroFooter: t("heroFooter"),
            }}
          />
        </Reveal>
      </section>

      {isLocationsView && (
        <InvStatusSectionsList<SpotCheckLocation>
          sections={sections}
          emptyTitle={t("noLocationsInStatus")}
          renderItem={(item, i) => (
            <ScLocationCard
              item={item}
              index={i}
              onStart={handleStart}
              onResume={handleResume}
            />
          )}
          getItemKey={(item) => item.location_id}
          isLoading={isLoadingLocations}
        />
      )}

      {!isLocationsView && (
        <InvStatusSectionsList<SpotCheck>
          sections={historySections}
          emptyTitle={t("noHistory")}
          renderItem={(sc) => (
            <ScHistoryCard spotCheck={sc} onClick={handleHistoryClick} />
          )}
          getItemKey={(sc) => sc.id}
          isLoading={isLoadingHistory}
          showGlobalEmpty={false}
        />
      )}
    </InvListShell>
  );
}

interface FilterOption {
  readonly value: string;
  readonly label: string;
}

function HistoryFilters({
  locationValue,
  onLocationChange,
  locationOptions,
  statusValue,
  onStatusChange,
  statusOptions,
  methodValue,
  onMethodChange,
  methodOptions,
  labels,
}: {
  readonly locationValue: string;
  readonly onLocationChange: (v: string) => void;
  readonly locationOptions: readonly FilterOption[];
  readonly statusValue: string;
  readonly onStatusChange: (v: string) => void;
  readonly statusOptions: readonly FilterOption[];
  readonly methodValue: string;
  readonly onMethodChange: (v: string) => void;
  readonly methodOptions: readonly FilterOption[];
  readonly labels: { location: string; status: string; method: string };
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <MultiSelectFilter
        value={locationValue}
        onChange={onLocationChange}
        placeholder={labels.location}
        options={[...locationOptions]}
        searchable
      />
      <MultiSelectFilter
        value={statusValue}
        onChange={onStatusChange}
        placeholder={labels.status}
        options={[...statusOptions]}
      />
      <MultiSelectFilter
        value={methodValue}
        onChange={onMethodChange}
        placeholder={labels.method}
        options={[...methodOptions]}
      />
    </div>
  );
}

function ViewToggle({
  view,
  setView,
  t,
}: {
  readonly view: ViewMode;
  readonly setView: (v: ViewMode) => void;
  readonly t: (key: string) => string;
}) {
  return (
    <div className="border-border/40 bg-card inline-flex items-center gap-0.5 rounded-full border p-0.5">
      <Button
        type="button"
        size="sm"
        variant={view === "locations" ? "default" : "ghost"}
        onClick={() => setView("locations")}
        className="h-7 rounded-full px-3 text-[0.6875rem] font-semibold tracking-wide"
      >
        <MapPin className="size-3" aria-hidden="true" />
        {t("viewLocations")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={view === "history" ? "default" : "ghost"}
        onClick={() => setView("history")}
        className="h-7 rounded-full px-3 text-[0.6875rem] font-semibold tracking-wide"
      >
        <History className="size-3" aria-hidden="true" />
        {t("viewHistory")}
      </Button>
    </div>
  );
}
