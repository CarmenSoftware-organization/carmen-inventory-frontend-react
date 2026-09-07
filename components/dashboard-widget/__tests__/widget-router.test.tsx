import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { WidgetRouter } from "../dashboard-widget-grid";
import { availableRenders } from "../render-support";
import type {
  DatasetShape,
  ResolvedWidgetLike,
} from "./widget-router.fixtures";
import { makeWidget, SHAPES } from "./widget-router.fixtures";

vi.mock("use-intl", () => ({
  useTranslations: () => Object.assign((key: string) => key, {
    has: () => true,
  }),
}));

// เมนูสลับกราฟเสนอชนิดไหนได้ การ์ดของชนิดนั้นต้องมีอยู่จริง — `WidgetRouter` จบด้วย
// `default: return null` ชนิดที่ไม่มี case จึงหายทั้งใบเงียบ ๆ (เกิดมาแล้วกับ gauge
// ตอนที่ยังมี switch สองตัวแล้วเพิ่ม case ไว้ตัวเดียว)
describe("WidgetRouter covers every render the menu can offer", () => {
  const cases = SHAPES.flatMap((shape) =>
    availableRenders(shape).map((type) => [shape, type] as const),
  );

  it.each(cases)("%s → %s renders a card", (shape, type) => {
    const widget = makeWidget(shape as DatasetShape, type) as ResolvedWidgetLike;
    const { container } = render(
      <WidgetRouter
        widget={widget}
        moduleName="procurement"
        subTileFor={() => "document"}
      />,
    );
    expect(container.innerHTML, `${type} on ${shape} rendered nothing`).not.toBe(
      "",
    );
  });
});
