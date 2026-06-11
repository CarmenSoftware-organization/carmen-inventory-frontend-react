
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  FileText,
  Lock,
  MapPin,
  PackageCheck,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "@/lib/compat/navigation";
import { useLocale, useTranslations } from "use-intl";
import { useState } from "react";
import { toast } from "sonner";
import EmptyComponent from "@/components/empty-component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PERIOD_STATUS_CONFIG } from "@/constant/period";
import { useClosePeriodEnd, usePeriodEndReview } from "@/hooks/use-period-end";
import type { ReviewTransactionKey } from "@/types/period-end";
import { formatLocalizedDate } from "@/lib/date-utils";
import type { PhysicalCountLocation } from "@/types/physical-count";
import { PeDocumentsDialog } from "./pe-documents-dialog";
import { PcLocationCard } from "../../_shared/pc-location-card";

interface ModuleConfig {
  readonly icon: LucideIcon;
  readonly color: string;
}

const MODULE_CONFIG: Record<ReviewTransactionKey, ModuleConfig> = {
  pr: { icon: FileText, color: "var(--sub-pr)" },
  po: { icon: ShoppingCart, color: "var(--sub-po)" },
  grn: { icon: PackageCheck, color: "var(--sub-grn)" },
  cn: { icon: Receipt, color: "var(--sub-cn)" },
  sr: { icon: ClipboardList, color: "var(--sub-store-requisition)" },
};

const TRANSACTION_KEYS = Object.keys(MODULE_CONFIG) as ReviewTransactionKey[];

export default function PeReview() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("inventoryManagement.periodEnd");
  const tc = useTranslations("common");
  const { data, isLoading, isFetching, refetch } = usePeriodEndReview();
  const closeMutation = useClosePeriodEnd();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [docsKey, setDocsKey] = useState<ReviewTransactionKey | null>(null);

  const transactionEntries = data
    ? TRANSACTION_KEYS.map((key) => ({
        key,
        stat: data.details.transaction[key],
        isDone: data.details.transaction[key].is_complete,
      }))
    : [];
  const txTotal = transactionEntries.reduce((sum, e) => sum + e.stat.count, 0);
  const txDone = transactionEntries.filter((e) => e.isDone).length;

  const locations = data?.details.physical_count ?? [];
  const locationsDone = locations.filter(
    (p) => p.physical_count_status === "completed",
  ).length;
  const locationsPercent =
    locations.length === 0 ? 0 : (locationsDone / locations.length) * 100;

  const canClose =
    !!data &&
    transactionEntries.every((e) => e.isDone) &&
    locations.every((p) => p.physical_count_status === "completed");

  const handleClose = () => {
    closeMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("closeSuccess"));
        setConfirmOpen(false);
        router.push("/inventory-management/period-end");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  /* Navigate to entry page when an in-progress count is clicked.
     not_started rows (no physical_count_id) and completed rows render their
     own indicators in PcLocationCard. */
  const handleLocationAction = (item: PhysicalCountLocation) => {
    if (item.physical_count_id) {
      router.push(
        `/inventory-management/physical-count/${item.physical_count_id}/entry`,
      );
    }
  };

  return (
    <div className="animate-fade-in-up space-y-5 p-3 md:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/inventory-management/period-end")}
            aria-label={tc("goBack")}
          >
            <ArrowLeft />
          </Button>
          <span
            aria-hidden="true"
            className="inline-flex size-9 items-center justify-center rounded-xl"
            style={{
              background:
                "color-mix(in oklch, var(--module-inventory), transparent 88%)",
              color: "var(--module-inventory)",
            }}
          >
            <CalendarRange className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-foreground truncate text-xl font-semibold tracking-tight">
              {t("review")}
            </h1>
            <p className="text-muted-foreground truncate text-sm">
              {t("reviewDesc")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label={tc("refresh")}
          >
            <RefreshCw
              className={isFetching ? "animate-spin" : undefined}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">{tc("refresh")}</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={!canClose || closeMutation.isPending}
            title={!canClose ? t("notReadyToClose") : undefined}
            className="shadow-sm"
          >
            <Lock aria-hidden="true" />
            {t("closePeriod")}
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && data && (
        <>
          <Card
            className="relative overflow-hidden border-l-4"
            style={{ borderLeftColor: "var(--module-inventory)" }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-12 -right-10 size-36 rounded-full opacity-10 blur-2xl"
              style={{ background: "var(--module-inventory)" }}
            />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CalendarRange
                  className="text-muted-foreground/70 size-4"
                  aria-hidden="true"
                />
                {formatLocalizedDate(data.start_date, locale)} –{" "}
                {formatLocalizedDate(data.end_date, locale)}
              </CardTitle>
              <CardAction>
                <Badge
                  className={PERIOD_STATUS_CONFIG[data.status]?.className}
                  size="sm"
                >
                  {t(`status.${data.status}`)}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <SummaryStat
                  label={t("transactionsTotal")}
                  value={txTotal}
                  hint={`${txDone}/${TRANSACTION_KEYS.length}`}
                  tone={
                    txDone === TRANSACTION_KEYS.length ? "success" : "warning"
                  }
                />
                <SummaryStat
                  label={t("locationsAll")}
                  value={locations.length}
                  hint={t("locationsCompleted", {
                    completed: locationsDone,
                    total: locations.length,
                  })}
                  tone={
                    locations.length > 0 && locationsDone === locations.length
                      ? "success"
                      : "warning"
                  }
                />
              </div>
            </CardContent>
          </Card>

          <section className="space-y-3">
            <header className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="bg-primary/10 text-primary inline-flex size-7 items-center justify-center rounded-lg"
              >
                <Sparkles className="size-3.5" />
              </span>
              <h2 className="text-sm font-semibold">{t("transactions")}</h2>
            </header>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {transactionEntries.map(({ key, stat, isDone }, index) => {
                const moduleConfig = MODULE_CONFIG[key];
                const Icon = moduleConfig.icon;
                return (
                  <Card
                    key={key}
                    role="button"
                    tabIndex={0}
                    aria-label={t("openDocumentsLabel", {
                      module: t(`modules.${key}`),
                    })}
                    onClick={() => setDocsKey(key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDocsKey(key);
                      }
                    }}
                    className="animate-fade-in-up group focus-visible:ring-ring relative cursor-pointer overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-8 -right-6 size-20 rounded-full opacity-10 blur-xl transition-opacity group-hover:opacity-20"
                      style={{ background: moduleConfig.color }}
                    />
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          aria-hidden="true"
                          className="inline-flex size-8 items-center justify-center rounded-lg"
                          style={{
                            background: `color-mix(in oklch, ${moduleConfig.color}, transparent 86%)`,
                            color: moduleConfig.color,
                          }}
                        >
                          <Icon className="size-4" />
                        </span>
                        {isDone && (
                          <CheckCircle2
                            className="text-success size-4"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[0.6875rem] font-medium tracking-wide uppercase">
                          {t(`modules.${key}`)}
                        </p>
                        <p className="text-foreground mt-0.5 text-2xl font-semibold tabular-nums">
                          {stat.count}
                        </p>
                      </div>
                      <Badge
                        variant={isDone ? "success-light" : "warning-light"}
                        size="xs"
                      >
                        {isDone ? t("complete") : t("incomplete")}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <header className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="bg-primary/10 text-primary inline-flex size-7 items-center justify-center rounded-lg"
                >
                  <MapPin className="size-3.5" />
                </span>
                <h2 className="text-sm font-semibold">{t("physicalCount")}</h2>
              </div>
              {locations.length > 0 && (
                <Badge
                  variant={
                    locationsDone === locations.length
                      ? "success-light"
                      : "warning-light"
                  }
                  size="xs"
                >
                  {t("locationsCompleted", {
                    completed: locationsDone,
                    total: locations.length,
                  })}
                </Badge>
              )}
            </header>
            {locations.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyComponent
                    icon={ClipboardList}
                    title={t("noPhysicalCount")}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <Progress
                  value={locationsPercent}
                  variant="auto"
                  className="h-1.5"
                />
                <div className="space-y-2">
                  {locations.map((item, index) => (
                    <div
                      key={item.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <PcLocationCard
                        item={item}
                        index={index}
                        onAction={handleLocationAction}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("closeConfirmTitle")}
        description={t("closeConfirmDesc")}
        onConfirm={handleClose}
        isPending={closeMutation.isPending}
        confirmText={t("closePeriod")}
        variant="destructive"
      />

      <PeDocumentsDialog
        open={docsKey !== null}
        onOpenChange={(o) => !o && setDocsKey(null)}
        moduleKey={docsKey}
        stat={docsKey && data ? data.details.transaction[docsKey] : null}
        icon={docsKey ? MODULE_CONFIG[docsKey].icon : ClipboardList}
        color={
          docsKey ? MODULE_CONFIG[docsKey].color : "var(--module-inventory)"
        }
      />
    </div>
  );
}

interface SummaryStatProps {
  readonly label: string;
  readonly value: number;
  readonly hint: string;
  readonly tone: "success" | "warning";
}

function SummaryStat({ label, value, hint, tone }: SummaryStatProps) {
  const toneClass =
    tone === "success"
      ? "bg-success/10 text-success-foreground"
      : "bg-warning/10 text-warning-foreground";
  return (
    <div className="border-border/60 bg-muted/30 space-y-1 rounded-lg border p-3">
      <p className="text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.18em] uppercase">
        {label}
      </p>
      <p className="text-foreground text-2xl font-semibold tabular-nums">
        {value}
      </p>
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${toneClass}`}
      >
        {hint}
      </span>
    </div>
  );
}
