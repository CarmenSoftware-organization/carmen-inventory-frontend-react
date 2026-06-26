import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrDocumentActions } from "../pr-document-actions";

// t(key) → key
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("print", vi.fn());
});

describe("PrDocumentActions", () => {
  it("renders export, print, and add controls", () => {
    render(
      <PrDocumentActions onExport={vi.fn()} isExporting={false} onAdd={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "export" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "print" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "add" })).toBeInTheDocument();
  });

  it("calls onExport when the export button is clicked", async () => {
    const onExport = vi.fn();
    render(
      <PrDocumentActions onExport={onExport} isExporting={false} onAdd={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "export" }));
    expect(onExport).toHaveBeenCalledOnce();
  });

  it("calls onAdd when the add button is clicked", async () => {
    const onAdd = vi.fn();
    render(
      <PrDocumentActions onExport={vi.fn()} isExporting={false} onAdd={onAdd} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "add" }));
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it("invokes window.print when the print button is clicked", async () => {
    render(
      <PrDocumentActions onExport={vi.fn()} isExporting={false} onAdd={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "print" }));
    expect(globalThis.print).toHaveBeenCalledOnce();
  });

  it("disables export and shows the exporting label while exporting", () => {
    render(
      <PrDocumentActions onExport={vi.fn()} isExporting={true} onAdd={vi.fn()} />,
    );
    const exportBtn = screen.getByRole("button", { name: "exporting" });
    expect(exportBtn).toBeDisabled();
  });
});
