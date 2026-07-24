import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UseFormReturn } from "react-hook-form";
import PriceListExternalComponent from "./price-list-external-component";
import {
  usePriceListExternal,
  useExternalTaxProfiles,
  useUpdatePriceListExternal,
  useSubmitPriceListExternal,
  HttpError,
} from "@/hooks/use-price-list-external";
import type { PricelistExternalDto } from "@/types/price-list-external";
import { toast } from "sonner";

// คง HttpError ตัวจริงไว้ (instanceof ต้องตรง class เดียวกับที่ component import)
// แต่ stub hook ทั้งสามให้คุม return value ได้
vi.mock("@/hooks/use-price-list-external", async (importActual) => {
  const actual =
    await importActual<typeof import("@/hooks/use-price-list-external")>();
  return {
    ...actual,
    usePriceListExternal: vi.fn(),
    useExternalTaxProfiles: vi.fn(),
    useUpdatePriceListExternal: vi.fn(),
    useSubmitPriceListExternal: vi.fn(),
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// header ไม่เกี่ยวกับ flow ที่เทส
vi.mock("./price-list-external-header", () => ({ default: () => <div /> }));

// table จำลอง: register input จริงเพื่อทำให้ form dirty ได้ + ปุ่ม save/submit
vi.mock("./price-list-external-product-table", () => ({
  default: ({
    form,
    onSave,
    onSubmit,
  }: {
    form: UseFormReturn<PricelistExternalDto>;
    onSave?: () => void;
    onSubmit?: () => void;
  }) => (
    <div>
      {/* อ่าน isDirty ตอน render เหมือน table จริง เพื่อ subscribe RHF proxy */}
      <span data-dirty={String(form.formState.isDirty)} />
      <input aria-label="name" {...form.register("name")} />
      <button onClick={onSave}>Save</button>
      <button onClick={onSubmit}>Submit</button>
    </div>
  ),
}));

const DATA = {
  id: "1",
  pricelist_no: "PL-1",
  name: "List A",
  status: "draft",
  vendor_id: "v1",
  vendor_name: null,
  currency_id: "c1",
  currency_code: "THB",
  effective_from_date: "",
  effective_to_date: "",
  description: null,
  note: null,
  tb_pricelist_detail: [],
} as unknown as PricelistExternalDto;

function stubQuery() {
  vi.mocked(usePriceListExternal).mockReturnValue({
    data: DATA,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof usePriceListExternal>);
}

beforeEach(() => {
  vi.clearAllMocks();
  stubQuery();
  vi.mocked(useExternalTaxProfiles).mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useExternalTaxProfiles>);
  vi.mocked(useSubmitPriceListExternal).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  } as unknown as ReturnType<typeof useSubmitPriceListExternal>);
});

describe("PriceListExternalComponent — save error surfacing", () => {
  it("shows the backend's HttpError message when save fails", async () => {
    vi.mocked(useUpdatePriceListExternal).mockReturnValue({
      mutateAsync: vi
        .fn()
        .mockRejectedValue(new HttpError("Price is required for row 2", 400)),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdatePriceListExternal>);

    render(<PriceListExternalComponent urlToken="tok" />);

    // ทำให้ form dirty ก่อน ไม่งั้น handleSave จะ return ที่ guard "No changes"
    await userEvent.type(screen.getByLabelText("name"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Price is required for row 2"),
    );
  });

  it("falls back to a generic message for a non-HttpError failure", async () => {
    vi.mocked(useUpdatePriceListExternal).mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error("boom")),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdatePriceListExternal>);

    render(<PriceListExternalComponent urlToken="tok" />);

    await userEvent.type(screen.getByLabelText("name"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to save changes"),
    );
  });
});

describe("PriceListExternalComponent — submit error surfacing", () => {
  it("shows the backend's HttpError message when submit fails", async () => {
    vi.mocked(useUpdatePriceListExternal).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdatePriceListExternal>);
    vi.mocked(useSubmitPriceListExternal).mockReturnValue({
      mutateAsync: vi
        .fn()
        .mockRejectedValue(new HttpError("This link has expired", 401)),
      isPending: false,
    } as unknown as ReturnType<typeof useSubmitPriceListExternal>);

    render(<PriceListExternalComponent urlToken="tok" />);

    // ไม่ type — form ไม่ dirty จึงผ่าน guard ของ submit ได้
    // กด Submit ที่ตาราง → เปิด confirm dialog → กดยืนยันใน dialog
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("This link has expired"),
    );
  });
});
