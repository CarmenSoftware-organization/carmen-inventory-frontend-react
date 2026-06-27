
import { ArrowRight, Clock, Star } from "lucide-react";
import { Link } from "react-router";
import { useLocale, useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { EyeBrow } from "@/components/ui/eye-brow";
import { cn } from "@/lib/utils";

const TONES = [
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-5)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--muted-foreground)",
] as const;

export default function ReportLanding() {
  return (
    <div>
      <Hero />
      <Chapter
        n="01"
        kickerKey="chapter1Kicker"
        titleKey="chapter1Title"
        ledeKey="chapter1Lede"
        bulletTitleKeys={[
          "chapter1Bullet1Title",
          "chapter1Bullet2Title",
          "chapter1Bullet3Title",
        ]}
        bulletDescKeys={[
          "chapter1Bullet1Desc",
          "chapter1Bullet2Desc",
          "chapter1Bullet3Desc",
        ]}
        ctaKey="chapter1Cta"
        shortcutKey="chapter1Shortcut"
        href="/report/list"
        visual={<MenuVisual />}
      />
      <Chapter
        n="02"
        kickerKey="chapter2Kicker"
        titleKey="chapter2Title"
        ledeKey="chapter2Lede"
        bulletTitleKeys={[
          "chapter2Bullet1Title",
          "chapter2Bullet2Title",
          "chapter2Bullet3Title",
        ]}
        bulletDescKeys={[
          "chapter2Bullet1Desc",
          "chapter2Bullet2Desc",
          "chapter2Bullet3Desc",
        ]}
        ctaKey="chapter2Cta"
        shortcutKey="chapter2Shortcut"
        href="/report/schedules"
        reverse
        tinted
        visual={<ScheduleVisual />}
      />
      <Chapter
        n="03"
        kickerKey="chapter3Kicker"
        titleKey="chapter3Title"
        ledeKey="chapter3Lede"
        bulletTitleKeys={[
          "chapter3Bullet1Title",
          "chapter3Bullet2Title",
          "chapter3Bullet3Title",
        ]}
        bulletDescKeys={[
          "chapter3Bullet1Desc",
          "chapter3Bullet2Desc",
          "chapter3Bullet3Desc",
        ]}
        ctaKey="chapter3Cta"
        shortcutKey="chapter3Shortcut"
        href="/report/history"
        visual={<HistoryVisual />}
      />
      <FooterBand />
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────

function Hero() {
  const t = useTranslations("report.intro");
  const markers = [
    { code: t("marker1Code"), name: t("marker1Name"), tag: t("marker1Tag") },
    { code: t("marker2Code"), name: t("marker2Name"), tag: t("marker2Tag") },
    { code: t("marker3Code"), name: t("marker3Name"), tag: t("marker3Tag") },
  ];

  return (
    <section className="relative p-4">
      {/* Top-right meta strip */}
      <div className="text-muted-foreground absolute top-12 right-6 hidden gap-3 text-[0.625rem] tracking-wider uppercase sm:right-12 sm:flex">
        <span>{t("moduleLabel")}</span>
        <span>·</span>
        <span>{t("version")}</span>
        <span>·</span>
        <span className="text-primary font-bold">{t("chaptersBadge")}</span>
      </div>

      <EyeBrow className="mb-6">{t("eyebrow")}</EyeBrow>

      <h1 className="text-foreground text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-7xl">
        {t("title")}
      </h1>

      {/* Lede */}
      <p className="text-foreground/80 mt-6 max-w-3xl text-sm leading-relaxed sm:text-base">
        {t("ledePrefix")}{" "}
        <strong className="text-foreground font-bold">{t("ledeMenu")}</strong>{" "}
        {t("ledeMenuDesc")}{" "}
        <strong className="text-foreground font-bold">
          {t("ledeSchedule")}
        </strong>{" "}
        {t("ledeScheduleDesc")}{" "}
        <strong className="text-foreground font-bold">
          {t("ledeHistory")}
        </strong>{" "}
        {t("ledeHistoryDesc")}
      </p>

      {/* Three-marker index */}
      <div className="border-border mt-10 grid grid-cols-1 gap-6 border-t pt-6 sm:grid-cols-3">
        {markers.map((m) => (
          <div key={m.code} className="flex items-baseline gap-3">
            <span className="text-primary text-sm font-bold tracking-wider">
              {m.code}
            </span>
            <div>
              <div className="text-foreground text-base font-bold">
                {m.name}
              </div>
              <div className="text-muted-foreground mt-0.5 text-xs">
                {m.tag}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Chapter ───────────────────────────────────────────────────────

interface ChapterProps {
  readonly n: string;
  readonly kickerKey: string;
  readonly titleKey: string;
  readonly ledeKey: string;
  readonly bulletTitleKeys: readonly [string, string, string];
  readonly bulletDescKeys: readonly [string, string, string];
  readonly ctaKey: string;
  readonly shortcutKey: string;
  readonly href: string;
  readonly visual: React.ReactNode;
  readonly reverse?: boolean;
  readonly tinted?: boolean;
}

function Chapter({
  n,
  kickerKey,
  titleKey,
  ledeKey,
  bulletTitleKeys,
  bulletDescKeys,
  ctaKey,
  shortcutKey,
  href,
  visual,
  reverse,
  tinted,
}: ChapterProps) {
  const t = useTranslations("report.intro");
  return (
    <section
      className={cn(
        "border-border border-t px-6 py-12 sm:px-12 sm:py-16",
        tinted && "bg-muted/30",
      )}
    >
      <div
        className={cn(
          "grid items-center gap-10 lg:gap-16",
          reverse ? "lg:grid-cols-[1fr_28rem]" : "lg:grid-cols-[28rem_1fr]",
        )}
      >
        <div className={cn(reverse ? "lg:order-2" : "lg:order-1")}>
          {visual}
        </div>

        <div className={cn(reverse ? "lg:order-1" : "lg:order-2")}>
          <div className="mb-4 flex items-baseline gap-4">
            <span className="text-primary text-6xl leading-none font-extrabold tracking-tight">
              {n}
            </span>
            <div className="border-primary text-primary border-t-2 pt-2 text-[0.625rem] font-bold tracking-[0.14em] uppercase">
              {t(kickerKey)}
            </div>
          </div>

          <h2 className="text-foreground mb-3 text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
            {t(titleKey)}
          </h2>

          <p className="text-foreground/80 max-w-xl text-sm leading-relaxed sm:text-base">
            {t(ledeKey)}
          </p>

          <ul className="mt-6 space-y-0 border-t border-transparent">
            {bulletTitleKeys.map((titleKey2, i) => (
              <li
                key={titleKey2}
                className={cn(
                  "border-border/40 flex gap-4 py-3",
                  i !== bulletTitleKeys.length - 1 && "border-b",
                )}
              >
                <span className="text-muted-foreground w-7 shrink-0 pt-1 text-[0.625rem] font-semibold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="text-foreground text-sm leading-snug font-semibold">
                    {t(titleKey2)}
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {t(bulletDescKeys[i])}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild size="sm" className="gap-2">
              <Link to={href}>
                {t(ctaKey)}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
            <span className="text-muted-foreground text-[0.6875rem] tracking-wider">
              {t(shortcutKey)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Visuals ───────────────────────────────────────────────────────

function MenuVisual() {
  const t = useTranslations("report.intro");
  const items = [
    { code: "PR-AGING", name: t("menuItem1"), starred: true, tone: TONES[0] },
    { code: "INV-LOWPAR", name: t("menuItem2"), starred: true, tone: TONES[1] },
    { code: "COSTPCT", name: t("menuItem3"), starred: true, tone: TONES[2] },
    { code: "VEN-SPEND", name: t("menuItem4"), starred: false, tone: TONES[3] },
    { code: "AP-AGE", name: t("menuItem5"), starred: false, tone: TONES[4] },
    { code: "AUDIT-DOC", name: t("menuItem6"), starred: false, tone: TONES[5] },
  ];
  const chips = [
    t("menuChip1"),
    t("menuChip2"),
    t("menuChip3"),
    t("menuChip4"),
    t("menuChip5"),
    t("menuChip6"),
  ];

  return (
    <div className="bg-card relative rounded-lg border p-5">
      <FloatNote className="-top-3.5 right-5 rotate-2">
        {t("menuVisualNote")}
      </FloatNote>

      <div className="border-border/50 mb-3 flex items-center gap-2 border-b pb-3">
        <span className="text-primary text-[0.625rem] font-bold tracking-[0.12em] uppercase">
          {t("menuVisualHeader")}
        </span>
        <span className="flex-1" />
        <span className="border-border text-muted-foreground rounded border px-1.5 py-0.5 text-[0.625rem]">
          {t("menuVisualBadge")}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {chips.map((c, i) => (
          <span
            key={c}
            className={cn(
              "rounded border px-2 py-0.5 text-[0.6875rem] font-semibold",
              i === 0
                ? "border-foreground text-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            {c}
          </span>
        ))}
      </div>

      <ul className="divide-border/40 divide-y">
        {items.map((r) => (
          <li
            key={r.code}
            className="grid grid-cols-[1rem_4.5rem_1fr_0.5rem] items-center gap-2 py-2"
          >
            <Star
              className={cn(
                "size-2.5",
                r.starred
                  ? "fill-amber-500 text-amber-500"
                  : "text-muted-foreground/40",
              )}
              aria-hidden="true"
            />
            <span className="text-foreground/70 text-[0.625rem] font-semibold">
              {r.code}
            </span>
            <span className="text-foreground text-xs leading-tight font-semibold">
              {r.name}
            </span>
            <span
              className="size-1.5 rounded-sm"
              style={{ backgroundColor: r.tone }}
              aria-hidden="true"
            />
          </li>
        ))}
      </ul>

      <div className="border-border/40 text-muted-foreground mt-3 border-t border-dashed pt-2 text-center text-[0.6875rem] italic">
        {t("menuVisualFooter")}
      </div>
    </div>
  );
}

function ScheduleVisual() {
  const t = useTranslations("report.intro");
  const locale = useLocale();
  // Localized short weekday names (Jan 1 2024 = Monday)
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const days = [1, 2, 3, 4, 5, 6, 7].map((d) =>
    dayFmt.format(new Date(2024, 0, d)),
  );
  const cells: {
    d: number;
    t: string;
    label: string;
    tone: string;
    paused?: boolean;
  }[] = [
    { d: 0, t: "07:00", label: t("schedItem1"), tone: TONES[0] },
    { d: 0, t: "08:00", label: t("schedItem2"), tone: TONES[2] },
    { d: 1, t: "07:30", label: t("schedItem3"), tone: TONES[1] },
    { d: 2, t: "06:00", label: t("schedItem4"), tone: TONES[0] },
    { d: 4, t: "17:00", label: t("schedItem5"), tone: TONES[3], paused: true },
    { d: 6, t: "20:00", label: t("schedItem6"), tone: TONES[1] },
  ];

  return (
    <div className="bg-card relative rounded-lg border p-5">
      <FloatNote className="-top-3.5 left-5 -rotate-2">
        {t("scheduleVisualNote")}
      </FloatNote>

      <div className="border-border/50 mb-3 flex items-center gap-2 border-b pb-3">
        <span className="text-primary text-[0.625rem] font-bold tracking-[0.12em] uppercase">
          {t("scheduleVisualHeader")}
        </span>
        <span className="flex-1" />
        <Clock className="text-muted-foreground size-3" aria-hidden="true" />
        <span className="text-muted-foreground text-[0.625rem]">
          {t("scheduleVisualNext")}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, di) => (
          <div key={d}>
            <div className="text-muted-foreground border-border/40 border-b py-1 text-center text-[0.5625rem] font-bold tracking-wider uppercase">
              {d}
            </div>
            <div className="flex min-h-34 flex-col gap-1 py-1.5">
              {cells
                .filter((c) => c.d === di)
                .map((c) => (
                  <div
                    key={`${c.d}-${c.t}`}
                    className={cn(
                      "rounded-sm px-1 py-1",
                      c.paused && "opacity-50",
                    )}
                    style={{
                      backgroundColor: `color-mix(in oklch, ${c.tone} 12%, transparent)`,
                      borderLeft: `2px solid ${c.tone}`,
                    }}
                  >
                    <div className="text-foreground/70 text-[0.5rem] font-bold">
                      {c.t}
                    </div>
                    <div className="text-foreground text-[0.5625rem] leading-tight font-semibold">
                      {c.label}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-border/40 text-muted-foreground mt-3 flex items-center gap-4 border-t pt-3 text-[0.625rem]">
        <span>
          <strong className="text-foreground">3</strong>{" "}
          {t("scheduleVisualLegendDaily", { n: "" })}
        </span>
        <span>
          <strong className="text-foreground">9</strong>{" "}
          {t("scheduleVisualLegendWeekly", { n: "" })}
        </span>
        <span>
          <strong className="text-foreground">6</strong>{" "}
          {t("scheduleVisualLegendMonthly", { n: "" })}
        </span>
        <span className="text-muted-foreground/70 ml-auto">
          {t("scheduleVisualChannels")}
        </span>
      </div>
    </div>
  );
}

function HistoryVisual() {
  const t = useTranslations("report.intro");
  const runs: {
    time: string;
    name: string;
    status: "ok" | "running" | "failed" | "partial";
    rows?: number;
    size?: string;
  }[] = [
    { time: "07:45", name: t("histItem1"), status: "running" },
    {
      time: "07:30",
      name: t("histItem2"),
      status: "ok",
      rows: 38,
      size: "0.2 MB",
    },
    {
      time: "07:10",
      name: t("histItem3"),
      status: "ok",
      rows: 184,
      size: "0.6 MB",
    },
    { time: "06:30", name: t("histItem4"), status: "failed" },
    {
      time: "06:30",
      name: t("histItem5"),
      status: "ok",
      rows: 412,
      size: "1.1 MB",
    },
    {
      time: "05:00",
      name: t("histItem6"),
      status: "ok",
      rows: 1284,
      size: "2.8 MB",
    },
    {
      time: t("histYesterday"),
      name: t("histItem7"),
      status: "partial",
      rows: 96,
    },
  ];
  const dotColor = {
    ok: "var(--positive)",
    running: "var(--primary)",
    failed: "var(--destructive)",
    partial: "var(--warning)",
  } as const;

  return (
    <div className="bg-card relative rounded-lg border p-5">
      <FloatNote className="-top-3.5 right-5 rotate-2">
        {t("historyVisualNote")}
      </FloatNote>

      <div className="border-border/50 mb-3 flex items-center gap-2 border-b pb-3">
        <span className="text-primary text-[0.625rem] font-bold tracking-[0.12em] uppercase">
          {t("historyVisualHeader")}
        </span>
        <span className="flex-1" />
        <span
          className="text-[0.625rem] font-semibold"
          style={{ color: "var(--positive)" }}
        >
          {t("historyVisualOk", { n: 7 })}
        </span>
        <span
          className="text-[0.625rem] font-semibold"
          style={{ color: "var(--warning)" }}
        >
          · {t("historyVisualPartial", { n: 1 })}
        </span>
        <span
          className="text-[0.625rem] font-semibold"
          style={{ color: "var(--destructive)" }}
        >
          · {t("historyVisualFailed", { n: 1 })}
        </span>
      </div>

      <ol className="relative pl-5">
        <span
          aria-hidden="true"
          className="bg-border absolute top-1.5 bottom-1.5 left-1.5 w-px"
        />
        {runs.map((r, i) => (
          <li
            key={`${r.time}-${r.name}`}
            className={cn(
              "border-border/40 relative py-2",
              i !== runs.length - 1 && "border-b",
            )}
          >
            <span
              aria-hidden="true"
              className="bg-card absolute top-3.5 -left-5 size-3 rounded-full border-2"
              style={{
                borderColor: dotColor[r.status],
                boxShadow:
                  r.status === "running"
                    ? `0 0 0 0.25rem color-mix(in oklch, var(--primary) 16%, transparent)`
                    : undefined,
              }}
            />
            <div className="flex items-center gap-2">
              <span className="text-foreground/70 min-w-9 text-[0.625rem] font-semibold">
                {r.time}
              </span>
              <span className="text-foreground flex-1 text-xs leading-tight font-semibold">
                {r.name}
              </span>
              {r.rows != null && (
                <span className="text-muted-foreground text-[0.625rem]">
                  {r.rows.toLocaleString()}
                  {r.size && ` · ${r.size}`}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="border-border/40 text-muted-foreground mt-3 flex justify-between border-t pt-2 text-[0.6875rem]">
        <span>{t("historyVisualRetention")}</span>
        <span>{t("historyVisualDuration")}</span>
      </div>
    </div>
  );
}

function FloatNote({
  children,
  className,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-foreground text-background absolute rounded px-2 py-1 text-[0.625rem] font-semibold whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

// ── Footer band ───────────────────────────────────────────────────

function FooterBand() {
  const t = useTranslations("report.intro");
  return (
    <section className="bg-foreground text-background px-6 py-10 sm:px-12">
      <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_auto]">
        <div>
          <EyeBrow>{t("footerKicker")}</EyeBrow>
          <h3 className="text-background text-lg leading-snug font-bold sm:text-xl">
            {t("footerTitle")}
          </h3>
          <p className="text-background/70 mt-2 text-xs sm:text-sm">
            {t("footerDesc")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-background/30 text-background hover:bg-background/10 hover:text-background bg-transparent"
          >
            {t("footerBtnTemplates")}
          </Button>
          <Button size="sm" className="gap-2">
            {t("footerBtnBuilder")}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
