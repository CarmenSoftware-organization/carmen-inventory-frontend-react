import { describe, it, expect } from "vitest";
import { buildProductGroups, type DetailRef } from "./pl-product-grouping";

// buildProductGroups only reads product_id / moq_qty — cast minimal fixtures.
const ref = (
  id: string,
  product_id: string,
  moq_qty: number,
): DetailRef => ({ id, product_id, moq_qty }) as unknown as DetailRef;

describe("buildProductGroups", () => {
  it("returns [] for empty/undefined input", () => {
    expect(buildProductGroups([])).toEqual([]);
    expect(buildProductGroups(undefined)).toEqual([]);
  });

  it("keeps a single-tier product as one group of one tier", () => {
    const groups = buildProductGroups([ref("a", "P1", 1)]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ productId: "P1", groupNumber: 1 });
    expect(groups[0].tiers).toHaveLength(1);
  });

  it("groups same product and numbers groups by first appearance", () => {
    const groups = buildProductGroups([
      ref("a", "P1", 10),
      ref("b", "P2", 1),
      ref("c", "P1", 1),
    ]);
    expect(groups.map((g) => g.productId)).toEqual(["P1", "P2"]);
    expect(groups.map((g) => g.groupNumber)).toEqual([1, 2]);
    expect(groups[0].tiers).toHaveLength(2);
    expect(groups[1].tiers).toHaveLength(1);
  });

  it("sorts tiers within a group by MOQ ascending", () => {
    const groups = buildProductGroups([
      ref("a", "P1", 50),
      ref("b", "P1", 1),
      ref("c", "P1", 10),
    ]);
    expect(groups[0].tiers.map((t) => t.moq_qty)).toEqual([1, 10, 50]);
  });
});
