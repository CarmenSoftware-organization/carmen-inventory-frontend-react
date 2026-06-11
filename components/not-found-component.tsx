import { ArrowLeft } from "lucide-react";
import { useTranslations } from "use-intl";
import Link from "@/lib/compat/link";
import { CarmenLogo } from "@/components/icons/carmen-logo";
import { Button } from "@/components/ui/button";

// next-intl/server getTranslations (async server component) → use-intl
// useTranslations client hook (SPA has no server components)
export function NotFoundComponent() {
  const t = useTranslations("notFound");
  const year = new Date().getFullYear();

  return (
    <div className="bg-background relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 50rem 28rem at 50% 22%, color-mix(in oklch, var(--primary), transparent 92%), transparent 70%)",
        }}
      />

      <header className="relative flex items-center px-6 py-5">
        <CarmenLogo variant="lockup" size={26} />
      </header>

      <main className="relative flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">
          <div
            aria-hidden="true"
            className="from-primary to-chart-3 mb-2 bg-linear-to-br bg-clip-text text-[5.5rem] leading-none font-bold tracking-tight text-transparent"
          >
            404
          </div>

          <span className="border-border/60 bg-muted/40 text-muted-foreground mb-5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.625rem] font-semibold tracking-[0.18em] uppercase">
            <span
              aria-hidden
              className="bg-destructive size-1.5 rounded-full"
            />
            {t("eyebrow")}
          </span>

          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {t("description")}
          </p>

          <div className="mt-6">
            <Button asChild size="sm">
              <Link href="/dashboard">
                <ArrowLeft />
                {t("backToDashboard")}
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="text-muted-foreground/70 border-border/40 relative border-t px-6 py-3 text-center text-[0.6875rem]">
        {t("footer", { year })}
      </footer>
    </div>
  );
}
