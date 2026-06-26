import { ArrowLeft } from "lucide-react";
import { useTranslations } from "use-intl";
import Link from "@/lib/compat/link";
import { Button } from "@/components/ui/button";
import { CarmenLogo } from "./icons/carmen-logo";

// next-intl/server getTranslations (async server component) → use-intl
// useTranslations client hook (SPA has no server components)
export function NotFoundComponent() {
  const t = useTranslations("notFound");
  const year = new Date().getFullYear();

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="flex items-center px-6 py-5">
        <CarmenLogo variant="lockup" size={26} />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">
          <div
            aria-hidden="true"
            className="text-foreground mb-2 text-[5.5rem] leading-none font-bold tracking-tight"
          >
            404
          </div>

          <span className="text-muted-foreground text-[0.5625rem] font-bold tracking-widest uppercase">
            {t("eyebrow")}
          </span>

          <h1 className="text-foreground mt-3 text-xl font-semibold tracking-tight">
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

      <footer className="text-muted-foreground border-border border-t px-6 py-3 text-center text-[0.6875rem]">
        {t("footer", { year })}
      </footer>
    </div>
  );
}
