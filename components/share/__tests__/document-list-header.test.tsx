import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocumentListHeader } from "../document-list-header";

// ModuleTileIcon อ่าน route context — mock ออกไป ไม่ใช่สิ่งที่เทสต์ตรงนี้
vi.mock("@/components/ui/module-tile", () => ({
  ModuleTileIcon: () => <span data-testid="module-icon" />,
}));

describe("DocumentListHeader", () => {
  it("renders the title and description", () => {
    render(
      <DocumentListHeader title="Purchase Requests" description="All PRs" count={0} />,
    );
    expect(
      screen.getByRole("heading", { name: "Purchase Requests" }),
    ).toBeInTheDocument();
    expect(screen.getByText("All PRs")).toBeInTheDocument();
  });

  it("shows a formatted count badge when count > 0", () => {
    render(<DocumentListHeader title="PR" description="d" count={1234} />);
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("hides the count badge when count is 0", () => {
    render(<DocumentListHeader title="PR" description="d" count={0} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
