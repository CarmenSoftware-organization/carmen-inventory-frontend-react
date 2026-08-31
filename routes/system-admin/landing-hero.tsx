import { EyeBrow } from "@/components/ui/eye-brow";
import { CHAPTERS, type TFn } from "./landing-types";

export function LandingHero({ t }: { readonly t: TFn }) {
  return (
    <section className="relative px-4 py-12 md:px-8 md:py-16 lg:px-10 lg:py-24">
      <div className="text-muted-foreground text-micro-eyebrow absolute top-5 right-4 hidden gap-2 tracking-wider uppercase md:top-7 md:right-8 md:flex lg:right-10">
        <span>{t("meta.module")}</span>
        <span aria-hidden>·</span>
        <span>{t("meta.version")}</span>
        <span aria-hidden>·</span>
        <span className="text-primary font-bold">{t("meta.summary")}</span>
      </div>

      <EyeBrow>{t("kicker")}</EyeBrow>

      <h1 className="text-foreground mt-4 text-3xl leading-tight font-extrabold tracking-tight md:text-5xl lg:text-6xl">
        {t("title")}
      </h1>

      <p className="text-muted-foreground mt-5 max-w-3xl text-sm leading-relaxed md:text-base lg:text-lg">
        {t("lede")}
      </p>

      <div className="border-border-subtle mt-10 grid grid-cols-1 gap-4 border-t pt-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {CHAPTERS.map((c) => (
          <div key={c.key} className="flex items-start gap-2">
            <span className="text-primary text-micro-legal pt-0.5 font-bold tracking-wider">
              {c.num}
            </span>
            <div>
              <div className="text-foreground text-xs font-bold tracking-tight">
                {t(`chapters.${c.key}.kicker`)}
              </div>
              <div className="text-muted-foreground text-micro-legal mt-0.5 leading-snug">
                {c.modules.map((m) => t(`modules.${m.key}.name`)).join(" · ")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
