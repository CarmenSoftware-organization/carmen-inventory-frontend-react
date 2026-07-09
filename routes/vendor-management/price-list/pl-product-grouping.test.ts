import { describe, it, expect } from "vitest";
import { buildGroupedRows, type DetailRef } from "./pl-product-grouping";

// buildGroupedRows only reads id / product_id / moq_qty — cast minimal fixtures.
const ref = (
  id: string,
  product_id: string,
  moq_qty: number,
): DetailRef => ({ id, product_id, moq_qty }) as unknown as DetailRef;

describe("buildGroupedRows", () => {
  it("returns [] for empty/undefined input", () => {
    expect(buildGroupedRows([])).toEqual([]);
    expect(buildGroupedRows(undefined)).toEqual([]);
  });

  it("keeps a single-tier product as one first+last row", () => {
    const rows = buildGroupedRows([ref("a", "P1", 1)]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      groupNumber: 1,
      isFirstInGroup: true,
      isLastInGroup: true,
    });
  });

  it("groups same product across tiers and numbers groups by first appearance", () => {
    const rows = buildGroupedRows([
      ref("a", "P1", 10),
      ref("b", "P2", 1),
      ref("c", "P1", 1),
    ]);
    // P1 group (2 tiers) first, then P2 group
    expect(rows.map((r) => r.ref.product_id)).toEqual(["P1", "P1", "P2"]);
    expect(rows.map((r) => r.groupNumber)).toEqual([1, 1, 2]);
  });

  it("sorts tiers within a group by MOQ ascending", () => {
    const rows = buildGroupedRows([
      ref("a", "P1", 50),
      ref("b", "P1", 1),
      ref("c", "P1", 10),
    ]);
    expect(rows.map((r) => r.ref.moq_qty)).toEqual([1, 10, 50]);
  });

  it("marks first/last tier of each group correctly", () => {
    const rows = buildGroupedRows([
      ref("a", "P1", 1),
      ref("b", "P1", 10),
      ref("c", "P1", 50),
    ]);
    expect(rows.map((r) => r.isFirstInGroup)).toEqual([true, false, false]);
    expect(rows.map((r) => r.isLastInGroup)).toEqual([false, false, true]);
  });
});
