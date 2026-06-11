export enum STAGE_ROLE {
  CREATE = "create",
  APPROVE = "approve",
  PURCHASE = "purchase",
  ISSUE = "issue",
  VIEW_ONLY = "view_only",
}

export type ActionPr =
  | "save"
  | "submit"
  | "approve"
  | "purchase"
  | "review"
  | "reject"
  | "send_back";
