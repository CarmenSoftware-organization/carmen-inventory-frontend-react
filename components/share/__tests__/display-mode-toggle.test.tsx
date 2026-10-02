import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DisplayModeToggle } from "../display-mode-toggle";

// t(key) → key (แบบเดียวกับ document-list-actions.test.tsx)
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("DisplayModeToggle", () => {
  it("labels both buttons and marks the active one", () => {
    render(<DisplayModeToggle value="grid" onChange={() => {}} />);
    const list = screen.getByRole("button", { name: "aria.listView" });
    const grid = screen.getByRole("button", { name: "aria.gridView" });
    expect(list).toHaveAttribute("aria-pressed", "false");
    expect(grid).toHaveAttribute("aria-pressed", "true");
  });

  it("reports the clicked mode", async () => {
    const onChange = vi.fn();
    render(<DisplayModeToggle value="list" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "aria.gridView" }));
    expect(onChange).toHaveBeenCalledWith("grid");
  });
});
