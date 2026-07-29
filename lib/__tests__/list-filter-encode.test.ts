import { describe, expect, it } from "vitest";
import { encodeFilterParam, viewMatchesCurrent } from "../list-filter-encode";
import type { FilterFieldDef } from "@/types/list-filter";
import type { SavedView } from "@/types/list-view";

const fields: FilterFieldDef[] = [
  { key: "filter", control: "status", labelKey: "common.status" },
  {
    key: "cn_status",
    control: "multi-select",
    labelKey: "x",
    options: [],
    toClause: (v) => `doc_status|enum:${v}`,
  },
  { key: "pr_date", control: "date-range", labelKey: "x", fieldKey: "pr_date" },
];

function view(overrides: Partial<SavedView>): SavedView {
  return { id: "v1", name: "test", filters: {}, created_at: "2026-07-29T00:00:00Z", ...overrides };
}

describe("encodeFilterParam", () => {
  it("ส่งผ่าน clause เต็มตรงๆ และข้าม field ว่าง", () => {
    expect(
      encodeFilterParam(fields, { filter: "is_active|bool:true", cn_status: "", pr_date: "" }),
    ).toBe("is_active|bool:true");
  });

  it("ห่อค่า CSV ด้วย toClause", () => {
    expect(encodeFilterParam(fields, { filter: "", cn_status: "draft,posted", pr_date: "" })).toBe(
      "doc_status|enum:draft,posted",
    );
  });

  it("join หลาย field ด้วย ; และ comma ใน date_range รอด", () => {
    expect(
      encodeFilterParam(fields, {
        filter: "is_active|bool:true",
        cn_status: "",
        pr_date: "pr_date|date_range:2026-01-01,2026-01-31",
      }),
    ).toBe("is_active|bool:true;pr_date|date_range:2026-01-01,2026-01-31");
  });

  it("ทุก field ว่าง → undefined", () => {
    expect(encodeFilterParam(fields, {})).toBeUndefined();
  });
});

describe("viewMatchesCurrent", () => {
  it("ค่าว่างเทียบเท่าไม่มี key (ไม่ dirty ปลอม)", () => {
    const v = view({ filters: { filter: "is_active|bool:true" } });
    expect(viewMatchesCurrent(v, { filter: "is_active|bool:true", pr_date: "" }, "")).toBe(true);
  });

  it("ค่าต่าง → dirty", () => {
    const v = view({ filters: { filter: "is_active|bool:true" } });
    expect(viewMatchesCurrent(v, { filter: "is_active|bool:false" }, "")).toBe(false);
  });

  it("sort ต่าง → dirty / sort undefined เทียบเท่า \"\"", () => {
    const v = view({ filters: {}, sort: "pr_no:desc" });
    expect(viewMatchesCurrent(v, {}, "pr_no:desc")).toBe(true);
    expect(viewMatchesCurrent(v, {}, "")).toBe(false);
    expect(viewMatchesCurrent(view({ filters: {} }), {}, "")).toBe(true);
  });
});
