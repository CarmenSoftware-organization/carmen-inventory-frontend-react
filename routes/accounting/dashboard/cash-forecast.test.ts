import { describe, expect, it } from "vitest";
import { buildCashForecast } from "./cash-forecast";

describe("buildCashForecast", () => {
  it.each(["base", "best", "worst"] as const)(
    "rolls forward all 13 weeks for %s",
    (scenario) => {
      const forecast = buildCashForecast(scenario, "2026-09-08");
      expect(forecast.weeks).toHaveLength(13);
      forecast.weeks.forEach((week, index) => {
        expect(week.closingBalance).toBe(
          week.openingBalance + week.totalInflow - week.totalOutflow,
        );
        if (index > 0) {
          expect(week.openingBalance).toBe(
            forecast.weeks[index - 1].closingBalance,
          );
        }
      });
    },
  );

  it("orders scenario outcomes without hiding committed outflow", () => {
    const best = buildCashForecast("best", "2026-09-08");
    const base = buildCashForecast("base", "2026-09-08");
    const worst = buildCashForecast("worst", "2026-09-08");
    expect(best.weeks.at(-1)!.closingBalance).toBeGreaterThan(
      base.weeks.at(-1)!.closingBalance,
    );
    expect(base.weeks.at(-1)!.closingBalance).toBeGreaterThan(
      worst.weeks.at(-1)!.closingBalance,
    );
    expect(best.totalOutflow).toBe(base.totalOutflow);
    expect(worst.totalOutflow).toBe(base.totalOutflow);
  });

  it("surfaces negative liquidity and lowers confidence for incomplete data", () => {
    const forecast = buildCashForecast("worst", "2026-09-08", {
      openingCash: 100_000,
      completeness: 68,
      staleFx: true,
    });
    expect(forecast.lowestBalance).toBeLessThan(0);
    expect(forecast.confidence).toBe("low");
    expect(forecast.completeness).toBe(68);
  });
});
