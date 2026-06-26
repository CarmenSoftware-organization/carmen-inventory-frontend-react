
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import Link from "@/lib/compat/link";
import { useLocale, useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PERIOD_STATUS_CONFIG } from "@/constant/period";
import { usePeriodEndCurrent } from "@/hooks/use-period-end";
import { cn } from "@/lib/utils";
import PeHistory from "./pe-history";
import { formatLocalizedDate } from "@/lib/date-utils";

export default function PeComponent() {
  const locale = useLocale();
  const t = useTranslations("inventoryManagement.periodEnd");
  const { data, isLoading, isError } = usePeriodEndCurrent();

  const statusKey = data?.status ?? "open";
  const statusConfig = PERIOD_STATUS_CONFIG[statusKey];

  return (
    <div className="animate-fade-in-up space-y-5 p-3 md:p-4">
      <section className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="bg-primary/10 text-primary inline-flex size-9 items-center justify-center rounded-xl"
          style={{ color: "var(--module-inventory)" }}
        >
          <CalendarRange className="size-5" />
        </span>
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            {t("current")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("currentDesc")}</p>
        </div>
      </section>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && (isError || !data) && (
        <Card aria-live="polite" className="border-dashed">
          <CardContent className="text-muted-foreground flex items-center gap-2 text-sm">
            <CalendarClock className="size-4" aria-hidden="true" />
            {t("noCurrent")}
          </CardContent>
        </Card>
      )}

      {!isLoading && data && (
        <Card
          className="border-l-4"
          style={{ borderLeftColor: "var(--module-inventory)" }}
        >
          <CardHeader>
            <CardDescription className="text-[0.6875rem] font-semibold tracking-[0.18em] uppercase">
              {t("fields.period")}
            </CardDescription>
            <CardTitle className="text-3xl tracking-tight md:text-4xl">
              {data.period}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Sparkles
                className="text-muted-foreground/70 size-3.5"
                aria-hidden="true"
              />
              <span>
                {t("fields.fiscalYear")} {data.fiscal_year} ·{" "}
                {t("fields.fiscalMonth")} {data.fiscal_month}
              </span>
            </CardDescription>
            <CardAction>
              <Badge className={statusConfig?.className} size="sm">
                {t(`status.${statusKey}`)}
              </Badge>
            </CardAction>
          </CardHeader>

          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <RangeField
              icon={<CalendarDays className="size-3.5" />}
              label={t("fields.startAt")}
              value={formatLocalizedDate(data.start_at, locale)}
            />
            <RangeField
              icon={<CalendarClock className="size-3.5" />}
              label={t("fields.endAt")}
              value={formatLocalizedDate(data.end_at, locale)}
            />
            {data.note && (
              <div className="col-span-2">
                <RangeField label={t("fields.note")} value={data.note} />
              </div>
            )}
          </CardContent>

          <CardFooter className="justify-end border-t">
            <Button asChild size="sm">
              <Link href="/inventory-management/period-end/review">
                <PlayCircle aria-hidden="true" />
                {t("startClose")}
              </Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      <PeHistory />
    </div>
  );
}

interface RangeFieldProps {
  readonly icon?: React.ReactNode;
  readonly label: string;
  readonly value: string | undefined | null;
}

function RangeField({ icon, label, value }: RangeFieldProps) {
  return (
    <div className="border-border/60 bg-card rounded-lg border p-3">
      <p
        className={cn(
          "text-muted-foreground flex items-center gap-1.5 text-[0.6875rem] font-semibold tracking-wide uppercase",
        )}
      >
        {icon}
        {label}
      </p>
      <p className="text-foreground mt-1 text-sm font-semibold">{value ?? "—"}</p>
    </div>
  );
}
