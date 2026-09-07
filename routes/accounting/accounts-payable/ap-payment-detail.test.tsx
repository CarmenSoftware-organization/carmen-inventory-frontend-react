import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import ApPaymentDetail from "./ap-payment-detail";
import {
  createApMockRepository,
  clearApMockStorage,
} from "./ap-mock-repository";
import type { ApPayment } from "@/types/accounts-payable";
import { IntlProvider } from "use-intl";
import messages from "@/messages/en.json";

const state = vi.hoisted(() => ({
  payment: null as ApPayment | null,
  loading: false,
  error: false,
}));
vi.mock("./use-accounts-payable", () => ({
  useApPayment: () => ({
    data: state.payment,
    isLoading: state.loading,
    isError: state.error,
    error: new Error("Test load failure"),
    refetch: vi.fn(),
  }),
  useApInvoices: () => ({
    data: { data: [] },
    isLoading: false,
    isError: false,
  }),
  useSaveApPayment: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useApPaymentAction: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
vi.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ value }: { value: string }) => <span>{value}</span>,
}));

function mount(path: string) {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/payment/:id" element={<ApPaymentDetail />} />
          <Route
            path="/accounting/accounts-payable/payment"
            element={<h1>Payment directory</h1>}
          />
        </Routes>
      </MemoryRouter>
    </IntlProvider>,
  );
}

beforeEach(() => {
  state.payment = null;
  state.loading = false;
  state.error = false;
  clearApMockStorage("AP-UI-TEST");
});
describe("Payment document interaction", () => {
  it("shows a recoverable missing document state", () => {
    mount("/payment/missing");
    expect(screen.getByText("Payment not found")).toBeInTheDocument();
  });
  it("cancels a new payment back to the directory", () => {
    mount("/payment/new");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.getByRole("heading", { name: "Payment directory" }),
    ).toBeInTheDocument();
  });
  it("restores saved fields when cancelling edits", async () => {
    const repository = createApMockRepository("AP-UI-TEST");
    state.payment = await repository.paymentAction("pv-1", "return", 1);
    mount("/payment/pv-1");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Description" }), {
      target: { value: "Unsaved change" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue(
      "Supplier settlement",
    );
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });
  it("keeps posted payments read-only", async () => {
    state.payment =
      await createApMockRepository("AP-UI-TEST").getPayment("pv-3");
    mount("/payment/pv-3");
    expect(
      screen.queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add method" }),
    ).not.toBeInTheDocument();
  });
  it("renders recoverable loading errors", () => {
    state.error = true;
    mount("/payment/pv-1");
    expect(screen.getByText("Unable to load AP payment")).toBeInTheDocument();
  });
});
