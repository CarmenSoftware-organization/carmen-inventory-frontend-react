export const conditionFieldValues = [
  "total_amount",
  "department",
  "category",
] as const;

export const operatorValues = [
  "eq",
  "gt",
  "lt",
  "gte",
  "lte",
  "between",
] as const;

export const actionTypeValues = ["SKIP_STAGE", "NEXT_STAGE"] as const;

export const conditionFieldKeys: Record<string, string> = {
  total_amount: "condTotalAmount",
  department: "condDepartment",
  category: "condCategory",
};

export const operatorKeys: Record<string, string> = {
  eq: "opEquals",
  gt: "opGreaterThan",
  lt: "opLessThan",
  gte: "opGreaterOrEqual",
  lte: "opLessOrEqual",
  between: "opBetween",
};

export const actionTypeKeys: Record<string, string> = {
  SKIP_STAGE: "actionSkipStage",
  NEXT_STAGE: "actionNextStage",
};
