import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimationStyles, Reveal, useCountUp } from "@/components/share/reveal";
import EmptyComponent from "@/components/empty-component";
import SearchInput from "@/components/search-input";
import { cn } from "@/lib/utils";

const SKELETON_KEYS = Array.from({ length: 30 }, (_, i) => `skl-${i}`);

type KpiTone = "primary" | "info" | "warning" | "success";

// FLAT (DESIGN.md "avoid neon"): neutral icon box (bg-muted), the tone color
// appears once — as the icon glyph (single signal), never as a tinted box.
const KPI_TONE_MAP: Record<KpiTone, { iconBg: string; text: string }> = {
  primary: { iconBg: "bg-muted text-primary", text: "text-primary" },
  info: { iconBg: "bg-muted text-info", text: "text-info" },
  warning: {
    iconBg: "bg-muted text-warning",
    text: "text-warning-foreground",
  },
  success: { iconBg: "bg-muted text-success", text: "text-success" },
};

export function KpiTile({
  icon: Icon,
  label,
  value,
  tone = "primary",
  active,
  onClick,
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly label: string;
  readonly value: number;
  readonly tone?: KpiTone;
  readonly active?: boolean;
  readonly onClick?: () => void;
}) {
  const display = useCountUp(value);
  const tones = KPI_TONE_MAP[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-border/40 bg-card hover:bg-card group relative flex items-center gap-3 rounded-xl border p-2 transition-all",
        active && "border-primary",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          tones.iconBg,
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="text-muted-foreground text-[0.5625rem] font-semibold tracking-widest uppercase">
          {label}
        </div>
        <div
          className={cn(
            "text-lg font-semibold tracking-tight tabular-nums",
            tones.text,
          )}
        >
          {display}
        </div>
      </div>
    </button>
  );
}

/* ── Hero stat card ──────────────────────────── */

export function StatusHero({
  total,
  done,
  active,
  labels,
}: {
  readonly total: number;
  readonly done: number;
  readonly active: number;
  readonly labels: {
    readonly progressTitle: string;
    readonly done: string;
    readonly active: string;
    readonly pending: string;
    readonly heroFooter: string;
  };
}) {
  const pending = Math.max(0, total - done - active);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const doneDisplay = useCountUp(done);
  const totalDisplay = useCountUp(total);

  return (
    <div className="bg-card hidden rounded-lg border p-4 lg:block">
      <div className="text-muted-foreground text-[0.5625rem] font-semibold tracking-widest uppercase">
        {labels.progressTitle}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-foreground text-3xl leading-none font-semibold tracking-tight tabular-nums">
          {doneDisplay}
        </span>
        <span className="text-muted-foreground text-sm">/ {totalDisplay}</span>
        <span className="bg-primary/10 text-primary ml-auto rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold tabular-nums">
          {pct}%
        </span>
      </div>

      <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="bg-border mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-md">
        <HeroCell k={labels.active} v={active} />
        <HeroCell k={labels.pending} v={pending} />
        <HeroCell k={labels.done} v={done} />
      </div>

      <div className="text-muted-foreground mt-2 text-[0.6875rem]">
        {labels.heroFooter}
      </div>
    </div>
  );
}

function HeroCell({ k, v }: { readonly k: string; readonly v: number }) {
  return (
    <div className="bg-card px-2 py-1.5">
      <div className="text-muted-foreground text-[0.5rem] font-semibold tracking-widest uppercase">
        {k}
      </div>
      <div
        className={cn(
          "mt-0.5 text-[0.6875rem] font-semibold tabular-nums",
          v ? "text-foreground" : "text-muted-foreground/60",
        )}
      >
        {v}
      </div>
    </div>
  );
}

export type SectionTone = "warning" | "info" | "success";

export function SectionDot({ tone }: { readonly tone: SectionTone }) {
  const TONE_CLASSES: Record<SectionTone, string> = {
    warning: "bg-warning",
    info: "bg-info",
    success: "bg-success",
  };

  const cls = TONE_CLASSES[tone];
  return (
    <span className="relative flex size-2 items-center justify-center">
      <span
        className={cn(
          "absolute inline-flex size-full rounded-full opacity-50",
          cls,
        )}
        style={{ animation: "inv-ping 2s cubic-bezier(0,0,.2,1) infinite" }}
      />
      <span className={cn("relative inline-flex size-1.5 rounded-full", cls)} />
    </span>
  );
}

export function SectionEmpty({
  icon: Icon,
  title,
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly title: string;
}) {
  return (
    <div className="border-border/40 bg-card flex items-center justify-center gap-2 rounded-xl border border-dashed py-6">
      <Icon className="text-muted-foreground/60 size-4" />
      <span className="text-muted-foreground text-xs">{title}</span>
    </div>
  );
}

export function LocationCardSkeleton({
  withProgress = false,
}: {
  readonly withProgress?: boolean;
}) {
  return (
    <div className="border-border/60 bg-card relative space-y-3 rounded-xl border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-32 rounded" />
              <Skeleton className="h-2.5 w-12 rounded" />
              <Skeleton className="h-3 w-10 rounded-full" />
            </div>
            <Skeleton className="h-2.5 w-24 rounded" />
          </div>
        </div>
        <Skeleton className="h-7 w-20 shrink-0 rounded-full" />
      </div>

      {withProgress && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-2.5 w-16 rounded" />
            <Skeleton className="h-2.5 w-20 rounded" />
          </div>
          <Skeleton className="h-1 w-full rounded-full" />
        </div>
      )}

      <div className="border-border/40 flex items-center gap-4 border-t pt-2">
        <Skeleton className="h-2.5 w-16 rounded" />
        <Skeleton className="h-2.5 w-24 rounded" />
      </div>
    </div>
  );
}

export function LocationListSkeleton({
  count = 4,
  withProgress = false,
  withSectionHeader = true,
}: {
  readonly count?: number;
  readonly withProgress?: boolean;
  readonly withSectionHeader?: boolean;
}) {
  return (
    <div className="mt-5 space-y-3" aria-busy="true" aria-live="polite">
      {withSectionHeader && (
        <div className="mb-3 flex items-center gap-2 px-1">
          <Skeleton className="size-2 rounded-full" />
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-3 w-6 rounded-full" />
        </div>
      )}
      <div className="flex flex-col gap-2">
        {SKELETON_KEYS.slice(0, count).map((id) => (
          <LocationCardSkeleton key={id} withProgress={withProgress} />
        ))}
      </div>
    </div>
  );
}

export function ItemCardSkeleton() {
  return (
    <div className="border-border/60 bg-card relative space-y-2 rounded-xl border p-3">
      <div className="flex items-start gap-3">
        <Skeleton className="size-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3 w-44 rounded" />
          <Skeleton className="h-2.5 w-24 rounded" />
        </div>
      </div>
      <div className="border-border/40 flex items-center justify-between gap-2 border-t pt-2">
        <Skeleton className="h-2.5 w-20 rounded" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-7 w-32 rounded-lg" />
          <Skeleton className="h-2.5 w-10 rounded" />
        </div>
      </div>
      <Skeleton className="h-2.5 w-28 rounded" />
    </div>
  );
}

export function ItemListSkeleton({ count = 5 }: { readonly count?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      {SKELETON_KEYS.slice(0, count).map((id) => (
        <ItemCardSkeleton key={id} />
      ))}
    </div>
  );
}

export function SectionHeader({
  tone,
  title,
  count,
}: {
  readonly tone: SectionTone;
  readonly title: string;
  readonly count: number;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-1">
      <div className="flex items-center gap-2">
        <SectionDot tone={tone} />
        <h2 className="text-foreground text-sm font-semibold tracking-tight">
          {title}
        </h2>
        <span className="text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold tabular-nums">
          {count}
        </span>
      </div>
    </div>
  );
}

export function LocationAvatar({
  letter,
  index,
}: {
  readonly letter: string;
  readonly index?: number;
}) {
  return (
    <div className="relative shrink-0">
      <div
        className="relative size-9 overflow-hidden rounded-lg shadow-[inset_0_0_0_0.0625rem_color-mix(in_oklch,var(--warning),black_25%)]"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklch, var(--warning), white 52%) 0%, color-mix(in oklch, var(--warning), white 28%) 100%)",
        }}
      >
        <svg
          viewBox="0 0 40 40"
          className="absolute inset-0 size-full opacity-25"
          aria-hidden="true"
        >
          <circle cx="32" cy="8" r="14" fill="#fff" />
          <circle cx="6" cy="34" r="10" fill="#000" />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center font-serif text-base font-semibold"
          style={{
            color: "color-mix(in oklch, var(--warning), black 72%)",
            letterSpacing: "-0.02em",
          }}
        >
          {letter}
        </div>
      </div>
      {typeof index === "number" && (
        <div className="bg-foreground text-background absolute -top-1 -left-1 flex size-4 items-center justify-center rounded-full text-[0.5625rem] font-semibold">
          {String(index + 1).padStart(2, "0")}
        </div>
      )}
    </div>
  );
}

export function LocationHeading({
  href,
  name,
  code,
  countBadge,
}: {
  readonly href: string;
  readonly name: string;
  readonly code: string;
  readonly countBadge: {
    readonly className: string;
    readonly label: string;
  };
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Link
        to={href}
        className="text-foreground text-sm leading-tight font-semibold tracking-tight hover:underline"
      >
        {name}
      </Link>
      <Link
        to={href}
        className="text-muted-foreground hover:text-foreground shrink-0 text-[0.625rem] tracking-wide uppercase transition-colors"
      >
        {code}
      </Link>
      <Badge size="xs" className={countBadge.className}>
        {countBadge.label}
      </Badge>
    </div>
  );
}

export function ProductAvatar({
  letter,
  index,
}: {
  readonly letter: string;
  readonly index?: number;
}) {
  return (
    <div className="relative shrink-0">
      <div
        className="relative size-9 overflow-hidden rounded-lg shadow-[inset_0_0_0_0.0625rem_color-mix(in_oklch,var(--success),black_30%)]"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklch, var(--success), black 45%) 0%, color-mix(in oklch, var(--success), black 65%) 100%)",
        }}
      >
        <svg
          viewBox="0 0 40 40"
          className="absolute inset-0 size-full opacity-20"
          aria-hidden="true"
        >
          <circle cx="32" cy="8" r="14" fill="#fff" />
          <circle cx="6" cy="34" r="10" fill="#000" />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center font-serif text-base font-semibold"
          style={{
            color: "color-mix(in oklch, var(--success), white 70%)",
            letterSpacing: "-0.02em",
          }}
        >
          {letter}
        </div>
      </div>
      {typeof index === "number" && (
        <div className="bg-foreground text-background absolute -top-1 -left-1 flex size-4 items-center justify-center rounded-full text-[0.5625rem] font-semibold">
          {String(index + 1).padStart(2, "0")}
        </div>
      )}
    </div>
  );
}

export function LocationCardShell({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <div className="border-border/60 bg-card hover:border-primary/40 relative space-y-3 rounded-xl border p-3 transition-colors">
      {children}
    </div>
  );
}

export function InvListShell({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <div className="relative isolate -mx-3 -my-3">
      <AnimationStyles />
      <div className="relative px-4 pt-4 pb-8 lg:p-4">{children}</div>
    </div>
  );
}

export function InvSearchBar({
  search,
  onSearch,
  extras,
}: {
  readonly search: string;
  readonly onSearch: (v: string) => void;
  readonly extras?: React.ReactNode;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <div className="min-w-40 flex-1 [&>div]:w-full">
        <SearchInput
          defaultValue={search}
          onSearch={onSearch}
          onInputChange={onSearch}
          containerClassName="w-full"
          inputClassName="border-border/40 hover:border-foreground/50 focus-visible:border-primary bg-card h-9 rounded-lg border pr-9 text-sm shadow-none transition-colors focus-visible:ring-0"
        />
      </div>
      {extras}
    </div>
  );
}

export interface InvStatusSection<T> {
  readonly key: string;
  readonly title: string;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly tone: SectionTone;
  readonly items: readonly T[];
}

interface InvStatusSectionsListProps<T> {
  readonly sections: ReadonlyArray<InvStatusSection<T>>;
  readonly emptyTitle: string;
  readonly renderItem: (item: T, index: number) => React.ReactNode;
  readonly getItemKey: (item: T) => string;
  readonly isLoading?: boolean;
  readonly skeletonCount?: number;
  readonly skeletonWithProgress?: boolean;
  readonly showGlobalEmpty?: boolean;
}

export function InvStatusSectionsList<T>({
  sections,
  emptyTitle,
  renderItem,
  getItemKey,
  isLoading,
  skeletonCount = 4,
  skeletonWithProgress,
  showGlobalEmpty = true,
}: InvStatusSectionsListProps<T>) {
  if (isLoading) {
    return (
      <LocationListSkeleton
        count={skeletonCount}
        withProgress={skeletonWithProgress}
      />
    );
  }

  const allEmpty = sections.every((s) => s.items.length === 0);

  return (
    <>
      {sections.map((section) => (
        <Reveal key={section.key}>
          <section className="mt-5">
            <SectionHeader
              tone={section.tone}
              title={section.title}
              count={section.items.length}
            />
            {section.items.length === 0 ? (
              <SectionEmpty icon={section.icon} title={emptyTitle} />
            ) : (
              <div className="flex flex-col gap-2">
                {section.items.map((item, i) => (
                  <Reveal key={getItemKey(item)} delay={Math.min(i * 40, 200)}>
                    {renderItem(item, i)}
                  </Reveal>
                ))}
              </div>
            )}
          </section>
        </Reveal>
      ))}
      {showGlobalEmpty && allEmpty && <EmptyComponent />}
    </>
  );
}
