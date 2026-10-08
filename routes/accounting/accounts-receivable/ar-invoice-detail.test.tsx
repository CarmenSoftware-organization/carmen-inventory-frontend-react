import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { IntlProvider } from "use-intl";
import { expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import ArInvoiceDetail from "./ar-invoice-detail";

vi.mock("@/hooks/use-accounting-master", () => ({
  useTitles: () => ({ data: [] }),
}));
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ data: undefined }),
}));
vi.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ value }: { value: string }) => <span>{value}</span>,
}));

it("keeps the workflow consistent with approval and switches the bottom summary to GL totals", () => {
  render(
    <IntlProvider locale="en" messages={messages}>
      <MemoryRouter initialEntries={["/invoice/ar-1"]}>
        <Routes>
          <Route path="/invoice/:id" element={<ArInvoiceDetail />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>,
  );
  const workflow = screen.getByRole("group", { name: "Document workflow" });
  expect(within(workflow).getByText("Submitted")).toBeInTheDocument();
  expect(screen.getByRole("table")).toHaveAttribute(
    "data-slot",
    "data-grid-table",
  );
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Journal (GL)" }), {
    button: 0,
    ctrlKey: false,
  });
  expect(screen.getByText("Base Debit")).toBeInTheDocument();
  expect(screen.getByText("Base Credit")).toBeInTheDocument();
  expect(screen.queryByText("Grand Total")).not.toBeInTheDocument();
  expect(screen.getByText("Base Debit").closest(".sticky")).toHaveClass(
    "bottom-0",
  );
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  expect(within(workflow).getByText("Posted")).toBeInTheDocument();
  expect(within(workflow).queryByText("Draft")).not.toBeInTheDocument();
});
