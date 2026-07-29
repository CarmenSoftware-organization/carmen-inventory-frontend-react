import { describe, it, expect } from "vitest";
import type { SubCategoryDto } from "@/types/category";
import { filterActiveSubCategories } from "./lookup-sub-category";

const items: SubCategoryDto[] = [
  { id: "s1", code: "S1", name: "Coffee", is_active: true, product_category_id: "c1", cascade_deviation: true },
  { id: "s2", code: "S2", name: "Tea", is_active: true, product_category_id: "c2", cascade_deviation: true },
  { id: "s3", code: "S3", name: "Old", is_active: false, product_category_id: "c1", cascade_deviation: true },
];

describe("filterActiveSubCategories", () => {
  it("keeps only active sub-categories of the given category", () => {
    expect(filterActiveSubCategories(items, "c1").map((s) => s.id)).toEqual(["s1"]);
  });

  it("keeps all active sub-categories when no category filter is given", () => {
    expect(filterActiveSubCategories(items, undefined).map((s) => s.id)).toEqual(["s1", "s2"]);
  });
});
