import { describe, it, expect } from "vitest";
import { getSubmitLabel } from "../form-utils";

const tc = (k: string) => `common.${k}`;
const tform = (k: string) => `form.${k}`;

describe("getSubmitLabel", () => {
  it("บอกสถานะที่กำลังเกิดขึ้นจริง ไม่ใช่คำเดียวทุกกรณี", () => {
    expect(getSubmitLabel(false, true, tc, tform)).toBe("common.create");
    expect(getSubmitLabel(true, true, tc, tform)).toBe("form.creating");
    expect(getSubmitLabel(false, false, tc, tform)).toBe("common.save");
    expect(getSubmitLabel(true, false, tc, tform)).toBe("form.saving");
  });
});
