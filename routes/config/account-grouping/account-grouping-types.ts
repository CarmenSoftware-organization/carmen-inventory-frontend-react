import type { AccountGroupMaster } from "@/types/accounting-master";
import type { ChartOfAccount } from "@/types/chart-of-accounts";

export interface AccountGroupNode extends AccountGroupMaster {
  children?: AccountGroupNode[];
  assignedAccounts?: ChartOfAccount[];
}

export type GroupTreeLevel = 1 | 2 | 3 | 4;
