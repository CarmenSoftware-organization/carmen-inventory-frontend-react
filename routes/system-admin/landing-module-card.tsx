import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import {
  TONE_COLOR,
  type ModuleDef,
  type TFn,
  type Tone,
} from "./landing-types";
import { ModuleVisual } from "./landing-visuals";

export function LandingModuleCard({
  mod,
  tone,
  t,
}: {
  readonly mod: ModuleDef;
  readonly tone: Tone;
  readonly t: TFn;
}) {
  const tint = TONE_COLOR[tone];
  const Icon = mod.icon;
  return (
    <article className="bg-card border-border flex flex-col overflow-hidden rounded-md border">
      <div
        className="border-border-subtle relative h-28 overflow-hidden border-b"
        style={{ background: `color-mix(in oklch, ${tint}, var(--card) 88%)` }}
      >
        <ModuleVisual visualKey={mod.visualKey} tint={tint} />
        <div className="bg-card border-border absolute top-2 left-2 flex size-7 items-center justify-center rounded-md border">
          <Icon aria-hidden style={{ color: tint }} className="size-3.5" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <div
          className="text-[0.5625rem] font-bold tracking-[0.14em] uppercase"
          style={{ color: tint }}
        >
          {mod.key.replace(/([A-Z])/g, "-$1").toLowerCase()}
        </div>
        <h3 className="text-foreground text-sm leading-tight font-bold tracking-tight">
          {t(`modules.${mod.key}.name`)}
        </h3>
        <div className="text-foreground/75 text-xs leading-snug font-semibold">
          {t(`modules.${mod.key}.one`)}
        </div>
        <p className="text-muted-foreground mt-0.5 text-[0.6875rem] leading-relaxed">
          {t(`modules.${mod.key}.long`)}
        </p>
      </div>

      <div className="border-border-subtle flex items-center justify-between gap-2 border-t px-3 py-2">
        <div className="min-w-0">
          <div className="text-foreground text-[0.6875rem] font-bold">
            {t(`modules.${mod.key}.stat`)}
          </div>
          <div className="text-muted-foreground mt-0.5 text-[0.5625rem]">
            {t(`modules.${mod.key}.meta`)}
          </div>
        </div>
        <Link
          to={mod.href}
          className="text-foreground border-foreground hover:bg-foreground hover:text-background inline-flex shrink-0 items-center gap-1 rounded-sm border px-2 py-1 text-[0.625rem] font-semibold transition-colors"
        >
          {t("cta.open")}
          <ArrowRight aria-hidden className="size-2.5" />
        </Link>
      </div>
    </article>
  );
}
