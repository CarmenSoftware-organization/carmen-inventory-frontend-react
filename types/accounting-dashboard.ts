export type AccountingDashboardAudience = "operational" | "management";
export type AccountingDashboardRole = "accountant" | "controller" | "executive";
export type AccountingDashboardModule =
  "generalLedger" | "accountsPayable" | "accountsReceivable" | "asset";
export type CashForecastScenario = "base" | "best" | "worst";
export type DashboardTone =
  "neutral" | "primary" | "info" | "success" | "warning" | "destructive";

export interface LocalizedDashboardText {
  en: string;
  th: string;
}

export interface DashboardMetric {
  id: string;
  label: LocalizedDashboardText;
  value: number;
  format?: "currency" | "number" | "percent" | "days";
  detail: LocalizedDashboardText;
  tone?: DashboardTone;
  href?: string;
}

export interface DashboardChartPoint {
  label: string;
  value: number;
  secondary?: number;
}

export interface DashboardAnalysis {
  id: string;
  title: LocalizedDashboardText;
  description: LocalizedDashboardText;
  kind: "bar" | "line" | "donut";
  valueLabel: LocalizedDashboardText;
  secondaryLabel?: LocalizedDashboardText;
  format?: "currency" | "number" | "percent";
  data: DashboardChartPoint[];
}

export interface DashboardTask {
  id: string;
  title: LocalizedDashboardText;
  detail: LocalizedDashboardText;
  count: number;
  tone: DashboardTone;
  href?: string;
}

export interface DashboardAudienceSnapshot {
  metrics: DashboardMetric[];
  analyses: DashboardAnalysis[];
  tasks: DashboardTask[];
}

export interface CashForecastSources {
  inflow: { ar: number; gl: number; asset: number };
  outflow: { ap: number; gl: number; asset: number };
}

export interface CashForecastWeek {
  week: number;
  startsOn: string;
  label: string;
  openingBalance: number;
  sources: CashForecastSources;
  totalInflow: number;
  totalOutflow: number;
  closingBalance: number;
}

export interface CashForecastSnapshot {
  asOf: string;
  horizonWeeks: 13;
  scenario: CashForecastScenario;
  currency: string;
  generatedAt: string;
  assumptionsVersion: string;
  assumptions: LocalizedDashboardText[];
  completeness: number;
  confidence: "high" | "medium" | "low";
  openingCash: number;
  totalInflow: number;
  totalOutflow: number;
  lowestBalance: number;
  lowestBalanceWeek: number;
  weeks: CashForecastWeek[];
}

export interface AccountingDashboardSnapshot {
  module: AccountingDashboardModule;
  title: LocalizedDashboardText;
  description: LocalizedDashboardText;
  asOf: string;
  period: string;
  currency: string;
  generatedAt: string;
  reconciliationVariance: number;
  operational: DashboardAudienceSnapshot;
  management: DashboardAudienceSnapshot;
}
