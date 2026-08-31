import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { TableCard } from "../dashboard-widget-grid";
import type { ResolvedWidget } from "../dashboard-widget-grid";
import type { TableData } from "@/types/dashboard-widget";

// t(key) → key (covers TableCard + WidgetHeader subtree)
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

function makeWidget(data: TableData): ResolvedWidget {
  return {
    id: "w1",
    dataset_id: "document.pr-table",
    widget_type: "table",
    title: "SENT BACK PRs",
    order_index: 0,
    params: {},
    meta: {
      id: "document.pr-table",
      name: "Purchase Request table",
      shape: "table",
      category: "workflow",
    },
    data,
  } as ResolvedWidget;
}

const noop = () => "purchaseRequest";

describe("TableCard", () => {
  it("renders data-driven column headers and a cell value", () => {
    const data: TableData = {
      columns: [
        { key: "pr_number", label: "PR Number", type: "text" },
        { key: "item_name", label: "Item Name", type: "text" },
        { key: "amount", label: "Amount", type: "number" },
      ],
      rows: [
        {
          pr_number: "PR-2503001",
          item_name: "Singha Beer 320ml",
          amount: 1250,
        },
      ],
    };
    const { container } = render(
      <TableCard
        widget={makeWidget(data)}
        moduleName="procurement"
        subTileFor={noop}
      />,
    );
    expect(container.textContent).toContain("PR Number");
    expect(container.textContent).toContain("Item Name");
    expect(container.textContent).toContain("Amount");
    expect(container.textContent).toContain("PR-2503001");
    expect(container.textContent).toContain("1,250"); // numeric formatting
  });

  it("renders an icon column value as a lucide icon (undo-2)", () => {
    const data: TableData = {
      columns: [
        { key: "action_icon", label: "", type: "icon" },
        { key: "item_name", label: "Item's Name", type: "text" },
      ],
      rows: [{ action_icon: "undo-2", item_name: "Dishwashing Liquid" }],
    };
    const { container } = render(
      <TableCard
        widget={makeWidget(data)}
        moduleName="procurement"
        subTileFor={noop}
      />,
    );
    // lucide renders an <svg class="lucide lucide-undo-2 ...">
    expect(container.querySelector("svg.lucide-undo-2")).not.toBeNull();
    expect(container.textContent).toContain("Dishwashing Liquid");
  });

  it("renders the rejected icon (circle-x) from the allowlist", () => {
    const data: TableData = {
      columns: [
        { key: "action_icon", label: "", type: "icon" },
        { key: "item_name", label: "Item's Name", type: "text" },
      ],
      rows: [{ action_icon: "circle-x", item_name: "MOOZE VODKA 700ml." }],
    };
    const { container } = render(
      <TableCard
        widget={makeWidget(data)}
        moduleName="procurement"
        subTileFor={noop}
      />,
    );
    expect(container.querySelector("svg.lucide-circle-x")).not.toBeNull();
    expect(container.textContent).toContain("MOOZE VODKA 700ml.");
  });

  it("renders nothing for an icon name outside the allowlist", () => {
    const data: TableData = {
      columns: [{ key: "action_icon", label: "", type: "icon" }],
      rows: [{ action_icon: "not-a-real-icon" }],
    };
    const { container } = render(
      <TableCard
        widget={makeWidget(data)}
        moduleName="procurement"
        subTileFor={noop}
      />,
    );
    expect(container.querySelector("svg.lucide")).toBeNull();
  });

  it("shows the noData message when there are no columns", () => {
    const { container } = render(
      <TableCard
        widget={makeWidget({ columns: [], rows: [] })}
        moduleName="procurement"
        subTileFor={noop}
      />,
    );
    expect(container.textContent).toContain("noData");
  });
});
