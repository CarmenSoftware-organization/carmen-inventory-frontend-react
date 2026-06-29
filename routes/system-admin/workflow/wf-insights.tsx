
import {
  Activity,
  Clock,
  Crown,
  EyeOff,
  PackageOpen,
  Users,
} from "lucide-react";
import { useTranslations } from "use-intl";
import type { Role, Stage } from "@/types/workflows";
import { cn } from "@/lib/utils";
import { formatCycleTime } from "./wf-sla-utils";
import {
  computeWorkflowInsights,
  type ActionKey,
  type RecipientKey,
  type WorkflowInsights,
} from "./wf-insights-utils";
import { ROLE_SOLID } from "./wf-role-colors";

interface WfInsightsProps {
  readonly stages: Stage[];
  readonly productCount?: number;
  readonly routingCount?: number;
}

const ROLE_LABEL: Record<Role, string> = {
  create: "roleCreate",
  approve: "roleApprove",
  purchase: "rolePurchase",
  issue: "roleIssue",
};

const ACTION_BG: Record<ActionKey, string> = {
  submit: "bg-primary",
  approve: "bg-success",
  reject: "bg-destructive",
  sendback: "bg-warning",
};

const ACTION_LABEL: Record<ActionKey, string> = {
  submit: "actionSubmit",
  approve: "actionApprove",
  reject: "actionReject",
  sendback: "actionSendBack",
};

const RECIPIENT_LABEL: Record<RecipientKey, string> = {
  requestor: "recipientRequestor",
  current_approve: "recipientCurrentApprove",
  next_step: "recipientNextStep",
};

export default function WfInsights({
  stages,
  productCount = 0,
  routingCount = 0,
}: WfInsightsProps) {
  const t = useTranslations("systemAdmin.workflow");

  if (!stages || stages.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-xs">
        {t("noStages")}
      </p>
    );
  }

  const insights = computeWorkflowInsights(stages);

  return (
    <div className="space-y-4 pt-3">
      <QuickStats
        insights={insights}
        productCount={productCount}
        routingCount={routingCount}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SlaBreakdown insights={insights} />
        <RoleDistribution insights={insights} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ActionCoverage insights={insights} />
        <RecipientCoverage insights={insights} />
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  empty,
}: {
  readonly title: string;
  readonly icon: typeof Clock;
  readonly children?: React.ReactNode;
  readonly empty?: boolean;
}) {
  return (
    <section className="bg-card rounded border p-3">
      <h3 className="text-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold">
        <Icon className="text-muted-foreground size-3.5" aria-hidden="true" />
        {title}
      </h3>
      {empty ? <p className="text-muted-foreground text-xs">—</p> : children}
    </section>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  readonly label: string;
  readonly value: string | number;
  readonly icon: typeof Clock;
}) {
  return (
    <div className="bg-card rounded border px-3 py-2">
      <div className="text-muted-foreground flex items-center gap-1.5 text-[0.6875rem]">
        <Icon className="size-3" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-0.5 text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function QuickStats({
  insights,
  productCount,
  routingCount,
}: {
  readonly insights: WorkflowInsights;
  readonly productCount: number;
  readonly routingCount: number;
}) {
  const t = useTranslations("systemAdmin.workflow");
  const { stats, totalCycleMinutes } = insights;
  const cycle = formatCycleTime(totalCycleMinutes) || "—";

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <StatTile label={t("statCycleTime")} value={cycle} icon={Clock} />
      <StatTile
        label={t("statApprovers")}
        value={stats.approverStages}
        icon={Users}
      />
      <StatTile label={t("statHod")} value={stats.hodStages} icon={Crown} />
      <StatTile
        label={t("statTotalUsers")}
        value={stats.totalUsers}
        icon={Users}
      />
      <StatTile
        label={t("statRoutingRules")}
        value={routingCount}
        icon={Activity}
      />
      <StatTile
        label={t("statProducts")}
        value={productCount}
        icon={PackageOpen}
      />
    </div>
  );
}

function SlaBreakdown({ insights }: { readonly insights: WorkflowInsights }) {
  const t = useTranslations("systemAdmin.workflow");
  const { stageSla, maxStageMinutes } = insights;
  const middleRows = stageSla.filter((r) => !r.isLast);

  if (middleRows.length === 0 || maxStageMinutes === 0) {
    return <SectionCard title={t("insightsSlaTitle")} icon={Clock} empty />;
  }

  return (
    <SectionCard title={t("insightsSlaTitle")} icon={Clock}>
      <ul className="space-y-1.5">
        {middleRows.map((row) => {
          const pct = maxStageMinutes
            ? Math.max(4, Math.round((row.minutes / maxStageMinutes) * 100))
            : 0;
          const cycle = formatCycleTime(row.minutes) || "0";
          return (
            <li key={`sla-${row.index}-${row.name}`} className="space-y-0.5">
              <div className="flex items-center justify-between gap-2 text-[0.6875rem]">
                <span className="truncate" title={row.name}>
                  {row.name}
                </span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {cycle}
                </span>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className={cn("h-full rounded-full", ROLE_SOLID[row.role])}
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={row.minutes}
                  aria-valuemax={maxStageMinutes}
                  aria-label={`${row.name} SLA`}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function RoleDistribution({
  insights,
}: {
  readonly insights: WorkflowInsights;
}) {
  const t = useTranslations("systemAdmin.workflow");
  const { roleDistribution } = insights;
  const total = roleDistribution.reduce((sum, r) => sum + r.count, 0);

  return (
    <SectionCard
      title={t("insightsRoleTitle")}
      icon={Users}
      empty={total === 0}
    >
      <ul className="space-y-1.5">
        {roleDistribution.map((row) => {
          const pct = total ? Math.round((row.count / total) * 100) : 0;
          return (
            <li key={row.role} className="space-y-0.5">
              <div className="flex items-center justify-between gap-2 text-[0.6875rem]">
                <span className="capitalize">{t(ROLE_LABEL[row.role])}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {row.count} ({pct}%)
                </span>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className={cn("h-full rounded-full", ROLE_SOLID[row.role])}
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={row.count}
                  aria-valuemax={total}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function ActionCoverage({ insights }: { readonly insights: WorkflowInsights }) {
  const t = useTranslations("systemAdmin.workflow");
  const { actionCoverage } = insights;
  const empty = actionCoverage.every((r) => r.totalStages === 0);

  return (
    <SectionCard title={t("insightsActionTitle")} icon={Activity} empty={empty}>
      <ul className="space-y-1.5">
        {actionCoverage.map((row) => {
          const pct = row.totalStages
            ? Math.round((row.activeCount / row.totalStages) * 100)
            : 0;
          return (
            <li key={row.action} className="space-y-0.5">
              <div className="flex items-center justify-between gap-2 text-[0.6875rem]">
                <span>{t(ACTION_LABEL[row.action])}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {row.activeCount}/{row.totalStages}
                </span>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className={cn("h-full rounded-full", ACTION_BG[row.action])}
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={row.activeCount}
                  aria-valuemax={row.totalStages}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function RecipientCoverage({
  insights,
}: {
  readonly insights: WorkflowInsights;
}) {
  const t = useTranslations("systemAdmin.workflow");
  const { recipientCoverage } = insights;
  const empty = recipientCoverage.every((r) => r.totalActiveActions === 0);

  return (
    <SectionCard
      title={t("insightsRecipientTitle")}
      icon={EyeOff}
      empty={empty}
    >
      <ul className="space-y-1.5">
        {recipientCoverage.map((row) => {
          const pct = row.totalActiveActions
            ? Math.round((row.count / row.totalActiveActions) * 100)
            : 0;
          return (
            <li key={row.recipient} className="space-y-0.5">
              <div className="flex items-center justify-between gap-2 text-[0.6875rem]">
                <span>{t(RECIPIENT_LABEL[row.recipient])}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {row.count}/{row.totalActiveActions}
                </span>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={row.count}
                  aria-valuemax={row.totalActiveActions}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
