import { EyeBrow } from "@/components/ui/eye-brow";
import { CHAPTERS, type TFn } from "./landing-types";

export function LandingHero({ t }: { readonly t: TFn }) {
  return (
    <section className="relative p-4">
      <div className="text-muted-foreground absolute top-5 right-4 hidden gap-2 text-[0.5625rem] tracking-wider uppercase md:top-7 md:right-8 md:flex lg:right-10">
        <span>{t("meta.module")}</span>
        <span aria-hidden>·</span>
        <span>{t("meta.version")}</span>
        <span aria-hidden>·</span>
        <span className="text-primary font-bold">{t("meta.summary")}</span>
      </div>

      <EyeBrow>{t("kicker")}</EyeBrow>

      <h1 className="text-foreground mt-3 text-2xl leading-none font-extrabold tracking-[-0.03em] md:text-3xl lg:text-4xl">
        {t("title")}
      </h1>

      <p className="text-foreground/70 mt-3 max-w-2xl text-xs leading-relaxed md:text-sm">
        {t("lede")}
      </p>

      <div className="border-border-subtle mt-5 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {CHAPTERS.map((c) => (
          <div key={c.key} className="flex items-start gap-2">
            <span className="text-primary pt-0.5 text-[0.625rem] font-bold tracking-wider">
              {c.num}
            </span>
            <div>
              <div className="text-foreground text-xs font-bold tracking-tight">
                {t(`chapters.${c.key}.kicker`)}
              </div>
              <div className="text-muted-foreground mt-0.5 text-[0.625rem] leading-snug">
                {c.modules.map((m) => t(`modules.${m.key}.name`)).join(" · ")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
