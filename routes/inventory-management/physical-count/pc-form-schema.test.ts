import { describe, it, expect } from "vitest";
import {
  EMPTY_FORM,
  createPhysicalCountSchema,
  getDefaultValues,
} from "./pc-form-schema";
import type { PhysicalCount } from "@/types/physical-count";

const tv = ((k: string) => k) as never;
const tf = ((k: string) => k) as never;
const schema = createPhysicalCountSchema(tv, tf);

describe("createPhysicalCountSchema", () => {
  it("ต้องเลือกแผนก — ใบนับผูกกับแผนกที่รับผิดชอบเสมอ", () => {
    expect(schema.safeParse({ department_id: "dep-1" }).success).toBe(true);
    expect(schema.safeParse({ department_id: "" }).success).toBe(false);
  });

  it("รอบนับไม่บังคับ — ตอนสร้างใบยังไม่รู้ว่าจะผูกรอบไหน", () => {
    expect(
      schema.safeParse({ department_id: "dep-1", physical_count_period_id: "" })
        .success,
    ).toBe(true);
    expect(schema.safeParse({ department_id: "dep-1" }).success).toBe(true);
  });
});

describe("getDefaultValues", () => {
  it("ไม่มี entity = ฟอร์มเปล่า", () => {
    expect(getDefaultValues()).toEqual(EMPTY_FORM);
  });

  it("โหมดแก้ไข: เอาแผนกจากใบเดิม ส่วนรอบนับเริ่มใหม่เสมอ", () => {
    // รอบนับของใบเดิมจบไปแล้ว การพารอบเก่ามาด้วยทำให้ผูกใบใหม่เข้ารอบที่ปิดแล้ว
    const d = getDefaultValues({
      department_id: "dep-9",
      physical_count_period_id: "period-เก่า",
    } as unknown as PhysicalCount);
    expect(d.department_id).toBe("dep-9");
    expect(d.physical_count_period_id).toBe("");
  });

  it("แผนกที่ API ส่งเป็น null กลายเป็นค่าว่าง ไม่ใช่ null ไหลเข้า select", () => {
    const d = getDefaultValues({
      department_id: null,
    } as unknown as PhysicalCount);
    expect(d.department_id).toBe("");
  });
});
