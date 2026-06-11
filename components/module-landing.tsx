
import Link from "@/lib/compat/link";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "use-intl";
import { getModule } from "@/constant/module-list";
import { getModuleColor } from "@/constant/module-color-map";
import { useVisibleModules } from "@/hooks/use-visible-modules";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { cn } from "@/lib/utils";

interface ModuleLandingProps {
  modulePath: string;
  description: string;
}

export function ModuleLanding({ modulePath, description }: ModuleLandingProps) {
  const t = useTranslations("modules");
  const mod = getModule(modulePath);
  const Icon = mod.icon;
  const moduleColor = getModuleColor(modulePath);
  const visibleSubs = useVisibleModules(mod.subModules);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-[0_0.5rem_1rem_-0.25rem_rgba(0,0,0,0.08)]"
          style={{
            background: `linear-gradient(135deg, color-mix(in oklch, ${moduleColor}, transparent 75%) 0%, color-mix(in oklch, ${moduleColor}, transparent 88%) 100%)`,
          }}
        >
          <div
            className="pointer-events-none absolute -top-3 -right-3 size-8 rounded-full opacity-40"
            style={{
              background: `radial-gradient(circle, color-mix(in oklch, ${moduleColor}, transparent 60%) 0%, transparent 70%)`,
            }}
          />
          <Icon className="relative size-5" style={{ color: moduleColor }} />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h1 className="text-foreground text-xl leading-tight font-semibold tracking-tight md:text-[1.5rem]">
            {t(mod.name)}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-xs leading-relaxed">
            {t(description)}
          </p>
          <div className="text-muted-foreground/80 mt-1 flex items-center gap-1 text-[0.625rem] tracking-wide">
            <span
              className="inline-block size-1 rounded-full"
              style={{ backgroundColor: moduleColor }}
            />
            <span>{t("subModuleCount", { count: visibleSubs.length })}</span>
          </div>
        </div>
      </div>

      {/* Sub-module grid */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {visibleSubs.map((sub) => {
          const subColor = getModuleColor(sub.path);
          const cardClass = cn(
            "group border-border/60 bg-card/70 hover:border-primary/40 relative flex items-center gap-3 overflow-hidden rounded-xl border py-2.5 pr-3 pl-4 text-left shadow-[0_0.125rem_0.5rem_-0.25rem_rgba(0,0,0,0.06)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_0.5rem_1.25rem_-0.25rem_color-mix(in_oklch,var(--primary),transparent_85%)]",
            sub.denied && "opacity-50",
          );

          const cardContent = (
            <>
              {/* Left accent bar — subtle by default, full on hover */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-2 left-0 w-0.5 rounded-r-full opacity-60 transition-all group-hover:inset-y-0 group-hover:w-1 group-hover:opacity-100"
                style={{ backgroundColor: subColor }}
              />

              {/* Icon pill — muted by default, color on hover */}
              <div
                className="bg-muted/60 relative flex size-10 shrink-0 items-center justify-center rounded-xl transition-all group-hover:scale-105"
                style={{
                  backgroundColor: `color-mix(in oklch, ${subColor}, transparent 90%)`,
                }}
              >
                <sub.icon
                  className="size-4 transition-transform"
                  style={{ color: subColor }}
                  aria-hidden="true"
                />
              </div>

              {/* Name + optional description */}
              <div className="min-w-0 flex-1">
                <div className="text-foreground truncate text-sm font-medium tracking-tight">
                  {t(sub.name)}
                </div>
              </div>

              {/* Chevron — only on hover */}
              <ChevronRight
                className="text-primary size-3.5 shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                aria-hidden="true"
              />
            </>
          );

          // Denied → button (no anchor → NextTopLoader doesn't trigger)
          if (sub.denied) {
            return (
              <button
                key={sub.path}
                type="button"
                onClick={() => dispatchPermissionDenied(sub.permission)}
                aria-disabled
                className={cardClass}
              >
                {cardContent}
              </button>
            );
          }

          return (
            <Link key={sub.path} href={sub.path} className={cardClass}>
              {cardContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
