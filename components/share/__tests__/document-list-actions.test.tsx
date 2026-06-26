import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentListActions } from "../document-list-actions";

// t(key) → key
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("print", vi.fn());
});

function renderActions(over: Partial<Parameters<typeof DocumentListActions>[0]> = {}) {
  const props = {
    onExport: vi.fn(),
    isExporting: false,
    onAdd: vi.fn(),
    addLabel: "Add PR",
    ...over,
  };
  render(<DocumentListActions {...props} />);
  return props;
}

describe("DocumentListActions", () => {
  it("renders export, print, and the module-specific add label", () => {
    renderActions({ addLabel: "Add PR" });
    expect(screen.getByRole("button", { name: "export" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "print" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add PR" })).toBeInTheDocument();
  });

  it("calls onExport when the export button is clicked", async () => {
    const props = renderActions();
    await userEvent.click(screen.getByRole("button", { name: "export" }));
    expect(props.onExport).toHaveBeenCalledOnce();
  });

  it("calls onAdd when the add button is clicked", async () => {
    const props = renderActions({ addLabel: "New" });
    await userEvent.click(screen.getByRole("button", { name: "New" }));
    expect(props.onAdd).toHaveBeenCalledOnce();
  });

  it("invokes window.print when the print button is clicked", async () => {
    renderActions();
    await userEvent.click(screen.getByRole("button", { name: "print" }));
    expect(globalThis.print).toHaveBeenCalledOnce();
  });

  it("disables export and shows the exporting label while exporting", () => {
    renderActions({ isExporting: true });
    expect(screen.getByRole("button", { name: "exporting" })).toBeDisabled();
  });
});
