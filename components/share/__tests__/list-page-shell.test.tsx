import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ListPageShell } from "../list-page-shell";
import { listGridMaxH } from "../list-grid-max-h";

// ModuleTileIcon ใน DocumentListHeader อ่าน pathname → ต้องมี router
function renderShell(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={["/procurement/purchase-request"]}>
      {ui}
    </MemoryRouter>,
  );
}

const mobile = vi.hoisted(() => ({ value: false }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => mobile.value }));

const pull = {
  containerRef: { current: null },
  distance: 40,
  isRefreshing: false,
  progress: 0.5,
};

describe("ListPageShell", () => {
  it("renders header, count, actions, toolbar and content", () => {
    renderShell(
      <ListPageShell
        title="Purchase Requests"
        description="All PRs"
        count={12}
        actions={<button type="button">Add</button>}
        toolbar={<input aria-label="search" />}
      >
        <p>rows</p>
      </ListPageShell>,
    );
    expect(
      screen.getByRole("heading", { name: "Purchase Requests" }),
    ).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByLabelText("search")).toBeInTheDocument();
    expect(screen.getByText("rows")).toBeInTheDocument();
  });

  it("leaves the header row with a single child when actions is omitted", () => {
    renderShell(
      <ListPageShell title="T" description="D">
        <p>rows</p>
      </ListPageShell>,
    );
    expect(screen.getByTestId("list-page-header").childElementCount).toBe(1);
  });

  it("shows the pull-refresh indicator only on mobile", () => {
    mobile.value = false;
    const { unmount } = renderShell(
      <ListPageShell title="T" description="D" pullRefresh={pull}>
        <p>rows</p>
      </ListPageShell>,
    );
    expect(
      screen.queryByTestId("pull-refresh-indicator"),
    ).not.toBeInTheDocument();
    unmount();

    mobile.value = true;
    renderShell(
      <ListPageShell title="T" description="D" pullRefresh={pull}>
        <p>rows</p>
      </ListPageShell>,
    );
    expect(screen.getByTestId("pull-refresh-indicator")).toBeInTheDocument();
  });
});

describe("listGridMaxH", () => {
  it("adds a row of height when filters are active", () => {
    expect(listGridMaxH(false)).toBe("max-h-[calc(100vh-10rem-3rem)]");
    expect(listGridMaxH(true)).toBe("max-h-[calc(100vh-13rem-3rem)]");
  });
});
