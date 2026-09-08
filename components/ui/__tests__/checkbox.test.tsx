import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Checkbox } from "../checkbox";

/**
 * เดิม indeterminate ไม่มี style ของตัวเองเลย — Radix render Indicator ให้ด้วย
 * แต่กล่องพื้นใส ไอคอนสี primary-foreground (เกือบขาวใน light) = มองไม่เห็นอะไร
 * เทสต์นี้กันไม่ให้ style ชุดนั้นหายไปอีก
 */
describe("Checkbox", () => {
  const box = (c: HTMLElement) => c.querySelector('[data-slot="checkbox"]')!;

  it("ทาพื้นทึบทั้งตอน checked และ indeterminate", () => {
    const { container: checked } = render(
      <Checkbox checked onCheckedChange={() => {}} />,
    );
    const { container: mixed } = render(
      <Checkbox checked="indeterminate" onCheckedChange={() => {}} />,
    );

    expect(box(checked).className).toContain("data-[state=checked]:bg-primary");
    expect(box(mixed).className).toContain(
      "data-[state=indeterminate]:bg-primary",
    );
  });

  it("indeterminate ได้ data-state ของตัวเอง ไม่ปนกับ checked", () => {
    const { container } = render(
      <Checkbox checked="indeterminate" onCheckedChange={() => {}} />,
    );
    expect(box(container).getAttribute("data-state")).toBe("indeterminate");
  });

  it("render ทั้งขีดและเครื่องหมายถูก แล้วซ่อนตัวที่ไม่ตรง state ด้วย CSS", () => {
    const { container } = render(
      <Checkbox checked="indeterminate" onCheckedChange={() => {}} />,
    );
    const icons = container.querySelectorAll("svg");
    expect(icons).toHaveLength(2);

    const hidden = Array.from(icons).map((i) => i.getAttribute("class") ?? "");
    // ถูก: ซ่อนตอน indeterminate · ขีด: ซ่อนตอน checked
    expect(
      hidden.some((c) => c.includes("group-data-[state=indeterminate]:hidden")),
    ).toBe(true);
    expect(
      hidden.some((c) => c.includes("group-data-[state=checked]:hidden")),
    ).toBe(true);
  });

  it("unchecked ไม่ render indicator เลย", () => {
    const { container } = render(
      <Checkbox checked={false} onCheckedChange={() => {}} />,
    );
    expect(container.querySelectorAll("svg")).toHaveLength(0);
  });
});
