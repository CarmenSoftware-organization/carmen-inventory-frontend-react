import { describe, expect, it } from "vitest";
import { ACCOUNT_NATURE, CHART_OF_ACCOUNT_TYPE } from "@/types/chart-of-accounts";
import { createCoaSchema, natureFor } from "./coa-form-schema";

const translate = (key: string) => key;

describe("COA editor rules", () => {
  it("requires category and type; grouping is read-only until the API supports it", () => {
    const schema = createCoaSchema(translate, translate);
    const result = schema.safeParse({
      code: "1000",
      description_1: "Cash",
      description_2: "",
      category: "",
      nature: ACCOUNT_NATURE.DEBIT,
      type: "",
      account_group_id: "", dimension_rules: {},
      is_active: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(["category", "type"]),
      );
    }
    expect(schema.safeParse({
      code: "1000", description_1: "Cash", description_2: "",
      category: "asset", nature: ACCOUNT_NATURE.DEBIT,
      type: CHART_OF_ACCOUNT_TYPE.BALANCE_SHEET,
      account_group_id: "", dimension_rules: {}, is_active: true,
    }).success).toBe(true);
  });

  it("derives nature from category", () => {
    expect(natureFor("asset")).toBe(ACCOUNT_NATURE.DEBIT);
    expect(natureFor("expense")).toBe(ACCOUNT_NATURE.DEBIT);
    expect(natureFor("liability")).toBe(ACCOUNT_NATURE.CREDIT);
    expect(natureFor("equity")).toBe(ACCOUNT_NATURE.CREDIT);
    expect(natureFor("revenue")).toBe(ACCOUNT_NATURE.CREDIT);
    expect(natureFor("statistic")).toBe(ACCOUNT_NATURE.DEBIT);
  });

  it("rejects blank code and English description", () => {
    const schema = createCoaSchema(translate, translate);
    const valid = {
      code: "1000", description_1: "Cash", description_2: "",
      category: "asset", nature: ACCOUNT_NATURE.DEBIT,
      type: CHART_OF_ACCOUNT_TYPE.BALANCE_SHEET,
      account_group_id: "", dimension_rules: {}, is_active: true,
    };
    expect(schema.safeParse({ ...valid, code: "" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, description_1: "" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, description_2: "เงินสด" }).success).toBe(true);
    expect(schema.safeParse({ ...valid, nature: "Debit" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, type: "pl" }).success).toBe(false);
  });
});

it("allows an explicit credit nature for an asset category", () => {
  expect(createCoaSchema(translate, translate).safeParse({
    code: "1000", description_1: "Account", description_2: "",
    category: "asset", nature: ACCOUNT_NATURE.CREDIT,
    type: CHART_OF_ACCOUNT_TYPE.BALANCE_SHEET,
    account_group_id: "", dimension_rules: {}, is_active: true,
  }).success).toBe(true);
});
