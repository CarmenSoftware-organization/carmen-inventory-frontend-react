
import { useState } from "react";
import { useRouter } from "@/lib/compat/navigation";
import {
  Calendar,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  Construction,
  PauseCircle,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LookupPhysicalCountPeriod } from "@/components/lookup/lookup-physical-count-period";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  usePhysicalCountPeriodCurrent,
  usePhysicalCountPeriodDetail,
} from "@/hooks/use-physical-count-period";
import { useCreatePhysicalCount } from "@/hooks/use-physical-count";
import { useErrorToast } from "@/hooks/use-error-toast";
import { useLocale } from "@/hooks/use-locale";
import { formatDate as formatDateUtil } from "@/lib/date-utils";
import { ErrorState } from "@/components/ui/error-state";
import type {
  PhysicalCountLocation,
  PhysicalCountStatus,
} from "@/types/physical-count";
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
import { Reveal } from "@/components/share/reveal";
import { PcLocationCard } from "../../_shared/pc-location-card";

type StatusKey = PhysicalCountStatus;

const formatPeriodTitle = (periodCode: string): string => {
  const yy = periodCode.slice(0, 2);
  const mm = Number.parseInt(periodCode.slice(2), 10);
  const year = 2000 + Number.parseInt(yy, 10);
  const date = new Date(year, mm - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

interface PeriodSelectorCardProps {
  readonly title: string;
  readonly endDate: string;
  readonly hasPeriod: boolean;
  readonly isLoading: boolean;
  readonly isPreviousPeriod: boolean;
  readonly previousPeriodId: string;
  readonly onPeriodChange: (id: string) => void;
}

function PeriodSelectorCard({
  title,
  endDate,
  hasPeriod,
  isLoading,
  isPreviousPeriod,
  previousPeriodId,
  onPeriodChange,
}: PeriodSelectorCardProps) {
  const t = useTranslations("inventoryManagement.physicalCount");
  const tfl = useTranslations("field");

  const periodBadge = isPreviousPeriod ? (
    <Badge
      variant="secondary"
      size="xs"
      className="text-[0.5625rem] tracking-widest uppercase"
    >
      {t("previousPeriod")}
    </Badge>
  ) : (
    <Badge
      variant="info"
      size="xs"
      className="gap-1 text-[0.5625rem] tracking-widest uppercase"
    >
      <CheckCircle2 className="size-2.5" aria-hidden="true" />
      {t("currentPeriod")}
    </Badge>
  );

  const emptyText = isLoading ? "" : t("noPeriod");

  return (
    <div className="border-border/60 bg-card/70 hover:border-primary/40 mt-4 flex flex-col gap-3 rounded-xl border p-3 backdrop-blur-xl transition-all sm:flex-row sm:items-center sm:justify-between">
      {hasPeriod ? (
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-foreground text-sm font-semibold tracking-tight">
              {title}
            </h2>
            {periodBadge}
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[0.6875rem]">
            <Calendar className="size-2.5 shrink-0" aria-hidden="true" />
            <span>{t("periodEnds", { date: endDate })}</span>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">{emptyText}</p>
      )}
      <div>
        <label className="text-muted-foreground mb-1 flex items-center gap-1 text-[0.5625rem] font-semibold tracking-widest uppercase">
          <CalendarRange className="size-2.5" aria-hidden="true" />
          {tfl("physicalCountPeriod")}
        </label>
        <LookupPhysicalCountPeriod
          value={previousPeriodId}
          onValueChange={onPeriodChange}
        />
      </div>
    </div>
  );
}

export default function PcComponent() {
  const t = useTranslations("inventoryManagement.physicalCount");
  const tc = useTranslations("common");
  const { dateFormat } = useLocale();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [includeNotCount, setIncludeNotCount] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | StatusKey>("all");
  const [showNotImplemented, setShowNotImplemented] = useState(false);
  const [previousPeriodId, setPreviousPeriodId] = useState("");
  const errorToast = useErrorToast();

  const {
    data: currentPeriod,
    isLoading: isLoadingCurrent,
    error: errorCurrent,
    refetch,
  } = usePhysicalCountPeriodCurrent(includeNotCount);
  const {
    data: selectedPeriod,
    isLoading: isLoadingSelected,
    error: errorSelected,
  } = usePhysicalCountPeriodDetail(
    previousPeriodId || undefined,
    includeNotCount,
  );
  const createPhysicalCount = useCreatePhysicalCount();

  const period = previousPeriodId ? selectedPeriod : currentPeriod;
  const isLoading = previousPeriodId ? isLoadingSelected : isLoadingCurrent;
  const error = previousPeriodId ? errorSelected : errorCurrent;
  const isPreviousPeriod = !!previousPeriodId;

  const locations = period?.locations ?? [];

  const inProgress: PhysicalCountLocation[] = [];
  const notStarted: PhysicalCountLocation[] = [];
  const complete: PhysicalCountLocation[] = [];
  for (const l of locations) {
    if (l.physical_count_status === "in_progress") inProgress.push(l);
    else if (l.physical_count_status === "completed") complete.push(l);
    else notStarted.push(l);
  }
  const counts = {
    all: locations.length,
    inProgress: inProgress.length,
    notStarted: notStarted.length,
    complete: complete.length,
  };

  const filterByQuery = (list: PhysicalCountLocation[]) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (l) =>
        l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q),
    );
  };

  const allSections: InvStatusSection<PhysicalCountLocation>[] = [
    {
      key: "in_progress",
      title: t("tabInProgress"),
      icon: PauseCircle,
      tone: "warning" satisfies SectionTone,
      items: filterByQuery(inProgress),
    },
    {
      key: "not_started",
      title: t("tabNotStarted"),
      icon: ClipboardCheck,
      tone: "info" satisfies SectionTone,
      items: filterByQuery(notStarted),
    },
    {
      key: "completed",
      title: t("tabComplete"),
      icon: CheckCircle2,
      tone: "success" satisfies SectionTone,
      items: filterByQuery(complete),
    },
  ];
  const sections = allSections.filter(
    (s) =>
      (activeFilter === "all" || activeFilter === s.key) &&
      (s.items.length > 0 || activeFilter === s.key),
  );

  const handleAction = (item: PhysicalCountLocation) => {
    if (item.physical_count_status === "completed") {
      setShowNotImplemented(true);
      return;
    }

    if (item.physical_count_id) {
      router.push(
        `/inventory-management/physical-count/${item.physical_count_id}/entry`,
      );
      return;
    }

    if (!period) return;
    createPhysicalCount.mutate(
      { physical_count_period_id: period.id, location_id: item.id },
      {
        onSuccess: (res) => {
          const { id } = (res as { data: { id: string } }).data;
          router.push(`/inventory-management/physical-count/${id}/entry`);
        },
        onError: errorToast,
      },
    );
  };

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  const periodTitle = period ? formatPeriodTitle(period.tb_period.period) : "";
  const periodEndDate = period
    ? formatDateUtil(period.tb_period.end_at, dateFormat)
    : "";

  return (
    <InvListShell>
      <section className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
        <div>
          <Reveal>
            <InvPageHeader
              icon={ClipboardCheck}
              eyebrow={t("entity")}
              title={t("title")}
              desc={t("desc")}
            />
          </Reveal>

          <Reveal delay={60}>
            <PeriodSelectorCard
              title={periodTitle}
              endDate={periodEndDate}
              hasPeriod={!!period}
              isLoading={isLoading}
              isPreviousPeriod={isPreviousPeriod}
              previousPeriodId={previousPeriodId}
              onPeriodChange={setPreviousPeriodId}
            />
          </Reveal>

          {period && (
            <Reveal delay={120}>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <KpiTile
                  icon={ClipboardCheck}
                  label={t("tabAll")}
                  value={counts.all}
                  active={activeFilter === "all"}
                  onClick={() => setActiveFilter("all")}
                />
                <KpiTile
                  icon={PauseCircle}
                  label={t("tabInProgress")}
                  value={counts.inProgress}
                  tone="warning"
                  active={activeFilter === "in_progress"}
                  onClick={() => setActiveFilter("in_progress")}
                />
                <KpiTile
                  icon={ClipboardCheck}
                  label={t("tabNotStarted")}
                  value={counts.notStarted}
                  tone="info"
                  active={activeFilter === "not_started"}
                  onClick={() => setActiveFilter("not_started")}
                />
                <KpiTile
                  icon={CheckCircle2}
                  label={t("tabComplete")}
                  value={counts.complete}
                  tone="success"
                  active={activeFilter === "completed"}
                  onClick={() => setActiveFilter("completed")}
                />
              </div>
            </Reveal>
          )}

          {period && (
            <Reveal delay={180}>
              <InvSearchBar
                search={search}
                onSearch={setSearch}
                extras={
                  <label className="border-border/40 bg-card/40 hover:border-foreground/40 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium backdrop-blur-sm select-none">
                    <Checkbox
                      checked={includeNotCount}
                      onCheckedChange={(v) => setIncludeNotCount(v === true)}
                    />
                    {t("includeNotCount")}
                  </label>
                }
              />
            </Reveal>
          )}
        </div>

        <Reveal delay={140}>
          <StatusHero
            total={counts.all}
            done={counts.complete}
            active={counts.inProgress}
            labels={{
              progressTitle: t("checkProgress"),
              done: t("tabComplete"),
              active: t("tabInProgress"),
              pending: t("tabNotStarted"),
              heroFooter: t("heroFooter"),
            }}
          />
        </Reveal>
      </section>

      {period && (
        <InvStatusSectionsList<PhysicalCountLocation>
          sections={sections}
          emptyTitle={t("noLocationsInStatus")}
          renderItem={(item, i) => (
            <PcLocationCard item={item} index={i} onAction={handleAction} />
          )}
          getItemKey={(item) => item.id}
          isLoading={isLoading}
          skeletonWithProgress
        />
      )}

      <Dialog open={showNotImplemented} onOpenChange={setShowNotImplemented}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Construction className="size-4" aria-hidden="true" />
              {tc("comingSoon")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t("notImplemented")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button size="sm" onClick={() => setShowNotImplemented(false)}>
              {tc("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </InvListShell>
  );
}
