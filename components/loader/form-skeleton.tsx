import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton row ของ toolbar — back + entity pill + status pill + action buttons
 */
function ToolbarSkeleton() {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between">
      <div className="flex items-center gap-2">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Skeleton ของ hero section — large name + descriptor + meta chips + hero stat card
 */
function HeroSkeleton() {
  return (
    <section className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
      <div>
        <ToolbarSkeleton />
        {/* NameField */}
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-full max-w-md" />
          <Skeleton className="h-3 w-24" />
        </div>
        {/* Descriptor */}
        <Skeleton className="mt-2 h-3 w-full max-w-lg" />
        <Skeleton className="mt-1 h-3 w-3/5 max-w-sm" />
        {/* Meta chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      {/* Hero stat card */}
      <Skeleton className="hidden h-40 w-full rounded-2xl lg:block" />
    </section>
  );
}

/**
 * Skeleton ของ glass card section — label + content placeholder
 */
function GlassCardSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border p-4">
      <Skeleton className="mb-3 h-3 w-20" />
      {children ?? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton 1 field (label + input)
 */
function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

/**
 * Skeleton ของ items section — header + 2 cards
 */
function ItemsSectionSkeleton() {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3 px-1">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-2.5 w-20" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Skeleton ของ sidebar — vendor card + summary card + tip box
 */
function SidebarSkeleton() {
  return (
    <aside className="hidden flex-col gap-3 self-start lg:flex">
      <div className="bg-card rounded-xl border p-4">
        <Skeleton className="mb-3 h-3 w-16" />
        <div className="flex items-start gap-3">
          <Skeleton className="size-9 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-full max-w-32" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
      </div>
      <div className="bg-card rounded-xl border p-4">
        <Skeleton className="mb-3 h-3 w-20" />
        <div className="space-y-2">
          <SummaryRowSkeleton />
          <SummaryRowSkeleton />
          <SummaryRowSkeleton />
          <SummaryRowSkeleton />
          <SummaryRowSkeleton />
        </div>
      </div>
    </aside>
  );
}

function SummaryRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/**
 * Skeleton ของหน้าฟอร์ม — Soft Sheet layout
 *
 * Mirrors the redesigned Soft Sheet forms (price-list, plt, rfp, vendor):
 * hero section with name + chips + hero stat card, then 1fr/22rem body grid
 * containing 2 glass cards + 1 items section on the left, and sidebar on right.
 *
 * @returns JSX element ของ form skeleton
 * @example
 * ```tsx
 * {isLoading ? <FormSkeleton /> : <EntityForm ... />}
 * ```
 */
export function FormSkeleton() {
  return (
    <div className="relative isolate -mx-3 -my-3" aria-busy="true">
      <div className="relative px-4 pt-4 pb-8 lg:p-4">
        <HeroSkeleton />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
          <div className="flex flex-col gap-4">
            <GlassCardSkeleton />
            <GlassCardSkeleton>
              <div className="grid grid-cols-1 gap-3">
                <FieldSkeleton />
                <FieldSkeleton />
              </div>
            </GlassCardSkeleton>
            <ItemsSectionSkeleton />
          </div>
          <SidebarSkeleton />
        </div>
      </div>
    </div>
  );
}
