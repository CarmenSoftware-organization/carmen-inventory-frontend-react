import type { ChapterDef, TFn } from "./landing-types";
import { LandingModuleCard } from "./landing-module-card";

export function LandingChapter({
  chapter,
  alt,
  t,
}: {
  readonly chapter: ChapterDef;
  readonly alt: boolean;
  readonly t: TFn;
}) {
  const cols =
    chapter.modules.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";
  return (
    <section
      className={`border-border-subtle border-t px-4 py-6 md:px-8 md:py-7 lg:px-10 lg:py-8 ${
        alt ? "bg-muted/40" : "bg-card"
      }`}
    >
      <div className="grid gap-4 md:grid-cols-[10rem_1fr] md:gap-8 lg:grid-cols-[12rem_1fr]">
        {/* เลข chapter + kicker เป็นของประดับ ไม่ใช่ของกด — DESIGN.md สงวน
            primary ไว้ให้ interactive เท่านั้น ("and nothing else") ลำดับชั้น
            มาจากขนาดกับความจาง ไม่ใช่จากสี */}
        <div>
          <div className="text-foreground/25 text-3xl leading-[0.85] font-semibold tracking-tight md:text-4xl lg:text-5xl">
            {chapter.num}
          </div>
          <div className="border-border text-muted-foreground mt-2 inline-block border-t-[1.5px] pt-1.5 text-[0.5625rem] font-semibold tracking-[0.14em] uppercase">
            {t(`chapters.${chapter.key}.kicker`)}
          </div>
        </div>
        <div>
          <h2 className="text-foreground m-0 text-xl leading-tight font-semibold tracking-tight md:text-2xl">
            {t(`chapters.${chapter.key}.title`)}
          </h2>
          <p className="text-foreground/70 mt-2 mb-0 max-w-[42rem] text-xs leading-relaxed md:text-sm">
            {t(`chapters.${chapter.key}.lede`)}
          </p>
        </div>
      </div>

      <div className={`mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 ${cols}`}>
        {chapter.modules.map((m) => (
          <LandingModuleCard key={m.key} mod={m} t={t} />
        ))}
      </div>
    </section>
  );
}
