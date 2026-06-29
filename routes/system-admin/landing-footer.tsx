import { ArrowRight } from "lucide-react";
import type { TFn } from "./landing-types";

export function LandingFooter({ t }: { readonly t: TFn }) {
  return (
    <section className="bg-foreground text-background relative overflow-hidden rounded-b-lg px-4 py-6 md:px-8 md:py-7 lg:px-10">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at top right, color-mix(in oklch, var(--primary), transparent 70%), transparent 60%)",
        }}
      />
      <div className="relative grid items-center gap-4 md:grid-cols-[1fr_auto]">
        <div>
          <div className="text-info text-[0.5625rem] font-bold tracking-wider uppercase">
            <span
              className="bg-info mr-2 inline-block h-px w-4 align-middle"
              aria-hidden
            />
            {t("footer.kicker")}
          </div>
          <div className="mt-1.5 text-sm leading-snug font-bold tracking-tight md:text-base">
            {t("footer.title")}
          </div>
          <div className="mt-1.5 text-[0.6875rem] opacity-65 md:text-xs">
            {t("footer.sub")}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-white/30 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/10"
          >
            {t("footer.handbook")}
          </button>
          <button
            type="button"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors"
          >
            {t("footer.sandbox")}
            <ArrowRight aria-hidden className="size-3" />
          </button>
        </div>
      </div>
    </section>
  );
}
