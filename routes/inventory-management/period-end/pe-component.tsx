import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useLocale, useTranslations } from "use-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { StatusIconLabel } from "@/components/ui/status-icon-label";
import {
  usePeriodEndCurrent,
  useStartPeriodCounting,
} from "./use-period-end";
import { usePhysicalCountPeriodCurrent } from "@/hooks/use-physical-count-period";
import { ApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import PeHistory from "./pe-history";
import { PeStartBlockedDialog } from "./pe-start-blocked-dialog";
import { formatLocalizedDate } from "@/lib/date-utils";
import type { StartCountingBlockers } from "@/types/period-end";

/** true เมื่อ payload หน้าตาเหมือนรายการเอกสารที่บล็อกจริง ๆ ไม่ใช่ error body อื่นที่บังเอิญมี data */
const isStartCountingBlockers = (
  value: unknown,
): value is StartCountingBlockers =>
  typeof value === "object" &&
  value !== null &&
  "documents" in value &&
  "total" in value;

export default function PeComponent() {
  const locale = useLocale();
  const navigate = useNavigate();
  const t = useTranslations("inventoryManagement.periodEnd");
  const { data, isLoading, isError } = usePeriodEndCurrent();
  const { data: countingRound } = usePhysicalCountPeriodCurrent();
  const startCounting = useStartPeriodCounting();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [blockers, setBlockers] = useState<StartCountingBlockers | null>(null);

  const statusKey = data?.status ?? "open";

  // รอบเปิดแล้ว = ปุ่มพาไปหน้า review ตรง ๆ ไม่ต้อง POST ซ้ำและไม่ต้องถามยืนยัน
  const isCounting = countingRound?.status === "counting";
  const reviewPath = "/inventory-management/period-end/review";

  const handleStart = () => {
    startCounting.mutate(undefined, {
      onSuccess: () => {
        setConfirmOpen(false);
        toast.success(t("startCountingSuccess"));
        navigate(reviewPath);
      },
      onError: (error) => {
        setConfirmOpen(false);
        // 422 พก `{ counts, total, documents }` มาใน error body ให้ลิสต์เอกสารที่ค้างได้
        // ส่วน error อื่นตกไปที่ toast ตามปกติ (5xx จะได้ undefined โดยตั้งใจ ไม่ให้ internal หลุด)
        if (error instanceof ApiError && isStartCountingBlockers(error.details)) {
          setBlockers(error.details);
          return;
        }
        toast.error(
          (error instanceof ApiError && error.userFacingServerMessage) ||
            t("startCountingFailed"),
        );
      },
    });
  };

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
            <CardDescription className="text-micro font-semibold tracking-[0.18em] uppercase">
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
              <StatusIconLabel
                status={statusKey}
                label={t(`status.${statusKey}`)}
              />
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
            <Button
              size="sm"
              onClick={() =>
                isCounting ? navigate(reviewPath) : setConfirmOpen(true)
              }
              disabled={statusKey === "closed" || startCounting.isPending}
            >
              <PlayCircle aria-hidden="true" />
              {isCounting ? t("continueCounting") : t("startClose")}
            </Button>
          </CardFooter>
        </Card>
      )}

      <PeHistory />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("startCountingConfirmTitle")}
        description={t("startCountingConfirmDesc")}
        onConfirm={handleStart}
        isPending={startCounting.isPending}
        confirmText={t("startClose")}
      />

      <PeStartBlockedDialog
        open={blockers !== null}
        onOpenChange={(open) => !open && setBlockers(null)}
        blockers={blockers}
      />
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
          "text-muted-foreground text-micro flex items-center gap-1.5 font-semibold tracking-wide uppercase",
        )}
      >
        {icon}
        {label}
      </p>
      <p className="text-foreground mt-1 text-sm font-semibold">
        {value ?? "—"}
      </p>
    </div>
  );
}
