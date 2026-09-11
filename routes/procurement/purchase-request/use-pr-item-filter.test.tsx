import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";

import { usePrItemFilter, type PrItemFilter } from "./use-pr-item-filter";
import type { PrFormValues } from "./pr-form-schema";

const ITEMS = [
  {
    location_id: "loc-a",
    location_name: "Kitchen",
    product_id: "prd-1",
    product_name: "Tomato",
    currency_id: "cur-thb",
    currency_code: "THB",
    delivery_point_id: "dp-1",
    delivery_point_name: "Dock A",
  },
  {
    location_id: "loc-b",
    location_name: "Bar",
    product_id: "prd-2",
    product_name: "Lime",
    currency_id: "cur-usd",
    currency_code: "USD",
    delivery_point_id: "dp-2",
    delivery_point_name: "Dock B",
  },
  {
    // แถวเดียวกับแถวแรกทุกอย่าง ยกเว้นสินค้า — ใช้ดูว่าตัวเลือกตัดซ้ำจริง
    location_id: "loc-a",
    location_name: "Kitchen",
    product_id: "prd-3",
    product_name: "Olive Oil",
    currency_id: "cur-thb",
    currency_code: "THB",
    delivery_point_id: "dp-1",
    delivery_point_name: "Dock A",
  },
];

function renderFilter(items: unknown[] = ITEMS) {
  return renderHook(() => {
    const form = useForm<PrFormValues>({
      defaultValues: { items } as unknown as PrFormValues,
    });
    return usePrItemFilter(form);
  });
}

describe("usePrItemFilter — ตัวเลือกมาจากแถวในใบ", () => {
  /** อ่าน options ที่ field ส่งให้ MultiSelectFilter (render คืน element ตรง ๆ) */
  function optionsOfField(fields: PrItemFilter["fields"], key: string) {
    const field = fields.find((f) => f.key === key);
    if (!field || field.control !== "custom" || !field.render) return [];
    const el = field.render("", () => {}) as {
      props: { options: { label: string; value: string }[] };
    };
    return el.props.options;
  }

  it("มีสี่ช่องตามที่ตกลง เรียงตามลำดับที่ประกาศ", () => {
    const { result } = renderFilter();
    expect(result.current.fields.map((f) => f.key)).toEqual([
      "location_id",
      "product_id",
      "currency_id",
      "delivery_point_id",
    ]);
  });

  it("ตัดค่าซ้ำและเรียงตามชื่อ", () => {
    const { result } = renderFilter();
    expect(optionsOfField(result.current.fields, "location_id")).toEqual([
      { label: "Bar", value: "loc-b" },
      { label: "Kitchen", value: "loc-a" },
    ]);
    expect(optionsOfField(result.current.fields, "product_id")).toEqual([
      { label: "Lime", value: "prd-2" },
      { label: "Olive Oil", value: "prd-3" },
      { label: "Tomato", value: "prd-1" },
    ]);
  });

  it("แถวที่ยังไม่ได้เลือกค่า ไม่กลายเป็นตัวเลือกว่าง ๆ", () => {
    const { result } = renderFilter([
      ...ITEMS,
      { location_id: "", product_id: null, currency_id: "", delivery_point_id: "" },
    ]);
    expect(optionsOfField(result.current.fields, "location_id")).toHaveLength(2);
    expect(optionsOfField(result.current.fields, "product_id")).toHaveLength(3);
  });

  it("ยังไม่เลือกอะไร → ทุกแถวผ่าน และ activeCount = 0", () => {
    const { result } = renderFilter();
    expect(result.current.activeCount).toBe(0);
    expect(result.current.signature).toBe("");
    expect([0, 1, 2].map(result.current.matches)).toEqual([true, true, true]);
  });

  it("เลือกคลังเดียว → เหลือเฉพาะแถวของคลังนั้น", () => {
    const { result } = renderFilter();
    act(() => result.current.setValue("location_id", "loc-a"));
    expect(result.current.activeCount).toBe(1);
    expect([0, 1, 2].map(result.current.matches)).toEqual([true, false, true]);
  });

  it("เลือกหลายค่าในช่องเดียว = OR", () => {
    const { result } = renderFilter();
    act(() => result.current.setValue("currency_id", "cur-thb,cur-usd"));
    expect([0, 1, 2].map(result.current.matches)).toEqual([true, true, true]);
  });

  it("เลือกข้ามช่อง = AND", () => {
    const { result } = renderFilter();
    act(() => {
      result.current.setValue("location_id", "loc-a");
    });
    act(() => {
      result.current.setValue("product_id", "prd-3");
    });
    expect(result.current.activeCount).toBe(2);
    expect([0, 1, 2].map(result.current.matches)).toEqual([false, false, true]);
  });

  it("กรองจนไม่เหลือแถวได้ (ไม่ใช่ fallback เป็นโชว์ทั้งหมด)", () => {
    const { result } = renderFilter();
    act(() => {
      result.current.setValue("location_id", "loc-b");
    });
    act(() => {
      result.current.setValue("product_id", "prd-1");
    });
    expect([0, 1, 2].map(result.current.matches)).toEqual([
      false,
      false,
      false,
    ]);
  });

  it("clearAll ล้างทุกช่องพร้อมกัน", () => {
    const { result } = renderFilter();
    act(() => {
      result.current.setValue("location_id", "loc-a");
    });
    act(() => {
      result.current.setValue("currency_id", "cur-thb");
    });
    expect(result.current.activeCount).toBe(2);
    act(() => result.current.clearAll());
    expect(result.current.activeCount).toBe(0);
    expect(result.current.signature).toBe("");
    expect([0, 1, 2].map(result.current.matches)).toEqual([true, true, true]);
  });

  it("signature เปลี่ยนเมื่อค่าเปลี่ยน — ตัวที่บอก table ให้คำนวณใหม่", () => {
    const { result } = renderFilter();
    const before = result.current.signature;
    act(() => result.current.setValue("product_id", "prd-2"));
    expect(result.current.signature).not.toBe(before);
    expect(result.current.signature).toContain("prd-2");
  });
});
