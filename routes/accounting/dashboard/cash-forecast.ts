import type {
  CashForecastScenario,
  CashForecastSnapshot,
  CashForecastSources,
  LocalizedDashboardText,
} from "@/types/accounting-dashboard";

const DAY = 86_400_000;
const openingCash = 12_800_000;
const ar = [
  1.9, 2.4, 2.1, 2.8, 2.35, 2.7, 2.55, 3.05, 2.65, 2.9, 2.75, 3.2, 3.1,
];
const ap = [
  2.35, 2.1, 2.8, 2.45, 3.0, 2.2, 2.7, 2.55, 2.85, 2.4, 3.15, 2.6, 2.95,
];
const recurringGl = [
  0.42, 0.18, 0.16, 0.48, 0.19, 0.17, 0.45, 0.2, 0.18, 0.5, 0.2, 0.18, 0.46,
];
const assetOutflow = [0.25, 0, 0.7, 0, 0.35, 0, 0.9, 0, 0.28, 0, 0.55, 0, 0.2];
const disposalInflow = [0, 0.12, 0, 0, 0.18, 0, 0, 0.14, 0, 0, 0.22, 0, 0];

const assumptions: Record<CashForecastScenario, LocalizedDashboardText[]> = {
  base: [
    {
      en: "Collections follow expected dates and normal collection rates.",
      th: "รับชำระตามวันที่คาดและอัตราการเก็บเงินปกติ",
    },
    {
      en: "Approved and committed payments remain on their scheduled dates.",
      th: "รายการจ่ายที่อนุมัติและผูกพันยังคงตามกำหนด",
    },
  ],
  best: [
    {
      en: "Collections improve by 12% and arrive earlier in the cycle.",
      th: "ยอดรับเพิ่มขึ้น 12% และเข้ามาเร็วขึ้นในรอบ",
    },
    {
      en: "Committed payments remain on schedule.",
      th: "รายการจ่ายที่ผูกพันยังคงตามกำหนด",
    },
  ],
  worst: [
    {
      en: "Collections fall to 72% of base and are weighted toward later weeks.",
      th: "ยอดรับลดเหลือ 72% ของกรณีฐานและเลื่อนไปปลายช่วงมากขึ้น",
    },
    {
      en: "Committed payments remain on schedule.",
      th: "รายการจ่ายที่ผูกพันยังคงตามกำหนด",
    },
  ],
};

function round(value: number): number {
  return Math.round(value);
}

function scenarioInflow(
  value: number,
  week: number,
  scenario: CashForecastScenario,
) {
  if (scenario === "best") return value * (week < 5 ? 1.16 : 1.08);
  if (scenario === "worst") return value * (week < 5 ? 0.64 : 0.78);
  return value;
}

export function buildCashForecast(
  scenario: CashForecastScenario,
  asOf = new Date().toISOString().slice(0, 10),
  options: {
    openingCash?: number;
    completeness?: number;
    staleFx?: boolean;
  } = {},
): CashForecastSnapshot {
  const startingCash = options.openingCash ?? openingCash;
  let opening = startingCash;
  const start = new Date(`${asOf}T00:00:00Z`);
  const weeks = ar.map((arMillions, index) => {
    const startsOn = new Date(start.getTime() + index * 7 * DAY)
      .toISOString()
      .slice(0, 10);
    const sources: CashForecastSources = {
      inflow: {
        ar: round(scenarioInflow(arMillions * 1_000_000, index, scenario)),
        gl: round((index % 4 === 0 ? 0.16 : 0.08) * 1_000_000),
        asset: round(disposalInflow[index] * 1_000_000),
      },
      outflow: {
        ap: round(ap[index] * 1_000_000),
        gl: round(recurringGl[index] * 1_000_000),
        asset: round(assetOutflow[index] * 1_000_000),
      },
    };
    const totalInflow = Object.values(sources.inflow).reduce(
      (sum, value) => sum + value,
      0,
    );
    const totalOutflow = Object.values(sources.outflow).reduce(
      (sum, value) => sum + value,
      0,
    );
    const closingBalance = opening + totalInflow - totalOutflow;
    const week = {
      week: index + 1,
      startsOn,
      label: `W${index + 1}`,
      openingBalance: opening,
      sources,
      totalInflow,
      totalOutflow,
      closingBalance,
    };
    opening = closingBalance;
    return week;
  });
  const totalInflow = weeks.reduce((sum, week) => sum + week.totalInflow, 0);
  const totalOutflow = weeks.reduce((sum, week) => sum + week.totalOutflow, 0);
  const lowest = weeks.reduce((current, week) =>
    week.closingBalance < current.closingBalance ? week : current,
  );

  const completeness = options.completeness ?? (scenario === "worst" ? 88 : 96);
  const confidence =
    options.staleFx || completeness < 80
      ? "low"
      : completeness < 95 || scenario === "worst"
        ? "medium"
        : "high";

  return {
    asOf,
    horizonWeeks: 13,
    scenario,
    currency: "THB",
    generatedAt: new Date().toISOString(),
    assumptionsVersion: "mock-2026.09-v1",
    assumptions: assumptions[scenario],
    completeness,
    confidence,
    openingCash: startingCash,
    totalInflow,
    totalOutflow,
    lowestBalance: lowest.closingBalance,
    lowestBalanceWeek: lowest.week,
    weeks,
  };
}
