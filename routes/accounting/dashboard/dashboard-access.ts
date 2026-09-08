import type {
  AccountingDashboardAudience,
  AccountingDashboardRole,
} from "@/types/accounting-dashboard";

export const ROLE_ACCESS: Record<
  AccountingDashboardRole,
  AccountingDashboardAudience[]
> = {
  accountant: ["operational"],
  controller: ["operational", "management"],
  executive: ["management"],
};

export function resolveDashboardAudience(
  role: AccountingDashboardRole,
  requested: AccountingDashboardAudience | null,
): AccountingDashboardAudience {
  const allowed = ROLE_ACCESS[role];
  return requested && allowed.includes(requested) ? requested : allowed[0];
}
