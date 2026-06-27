
import { useTranslations } from "use-intl";
import { LandingChapter } from "./landing-chapter";
import { LandingFooter } from "./landing-footer";
import { LandingHero } from "./landing-hero";
import { CHAPTERS } from "./landing-types";

export default function SystemAdminLanding() {
  const t = useTranslations("systemAdmin.landing");

  return (
    <div>
      <LandingHero t={t} />
      {CHAPTERS.map((c, i) => (
        <LandingChapter key={c.key} chapter={c} alt={i % 2 === 1} t={t} />
      ))}
      <LandingFooter t={t} />
    </div>
  );
}
