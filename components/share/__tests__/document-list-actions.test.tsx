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

  it("hides export and print when hideExportPrint is set", () => {
    renderActions({ hideExportPrint: true, addLabel: "Add" });
    expect(screen.queryByRole("button", { name: "export" })).toBeNull();
    expect(screen.queryByRole("button", { name: "print" })).toBeNull();
    // overflow trigger ก็หายไปด้วย
    expect(
      screen.queryByRole("button", { name: "aria.moreActions" }),
    ).toBeNull();
    // ปุ่ม Add ยังอยู่
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("hides export but keeps print when showExport is false", () => {
    renderActions({ showExport: false });
    expect(screen.queryByRole("button", { name: "export" })).toBeNull();
    expect(screen.getByRole("button", { name: "print" })).toBeInTheDocument();
  });

  it("omits export when onExport is not provided", () => {
    render(<DocumentListActions onAdd={vi.fn()} addLabel="Add" />);
    expect(screen.queryByRole("button", { name: "export" })).toBeNull();
    expect(screen.getByRole("button", { name: "print" })).toBeInTheDocument();
  });

  it("marks the add button aria-disabled when addDisabled is set", () => {
    renderActions({ addDisabled: true, addLabel: "Add" });
    expect(screen.getByRole("button", { name: "Add" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("still calls onAdd when addDisabled (to dispatch permission-denied)", async () => {
    const props = renderActions({ addDisabled: true, addLabel: "Add" });
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(props.onAdd).toHaveBeenCalledOnce();
  });

  it("renders extraActions before the add button", () => {
    renderActions({
      addLabel: "Add",
      extraActions: <button type="button">Extra</button>,
    });
    expect(screen.getByRole("button", { name: "Extra" })).toBeInTheDocument();
  });
});
