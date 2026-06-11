import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { DeliveryPointDialog } from "../delivery-point-dialog";
import type { DeliveryPoint } from "@/types/delivery-point";

// Mock hooks
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/hooks/use-delivery-point", () => ({
  useCreateDeliveryPoint: () => ({
    mutate: mockCreate,
    isPending: false,
  }),
  useUpdateDeliveryPoint: () => ({
    mutate: mockUpdate,
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ buCode: "BU001" }),
}));

vi.mock("@/lib/compat/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("use-intl", () => {
  const translations: Record<string, Record<string, string>> = {
    "config.deliveryPoint": {
      entity: "Delivery Point",
      namePlaceholder: "e.g. หลังคลังสินค้า",
    },
    common: { cancel: "Cancel", save: "Save", create: "Create" },
    form: {
      editTitle: "Edit {entity}",
      addTitle: "Add {entity}",
      saving: "Saving...",
      creating: "Creating...",
    },
    field: { name: "Name", active: "Active" },
    toast: {
      updateSuccess: "{entity} updated successfully",
      createSuccess: "{entity} created successfully",
    },
    validation: { required: "{field} is required" },
  };
  return {
    useTranslations: (ns: string) => {
      const t = translations[ns] ?? {};
      return (key: string, params?: Record<string, string>) => {
        let val = t[key] ?? key;
        if (params) {
          for (const [k, v] of Object.entries(params))
            val = val.replace(`{${k}}`, String(v));
        }
        return val;
      };
    },
  };
});

const mockDeliveryPoint: DeliveryPoint = {
  id: "1",
  name: "Main Warehouse",
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function getDialog() {
  return within(screen.getByRole("dialog"));
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = "TestQueryClientWrapper";
  return Wrapper;
}

function renderDialog(props: Partial<Parameters<typeof DeliveryPointDialog>[0]> = {}) {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    deliveryPoint: null,
    ...props,
  };

  return render(
    createElement(
      createWrapper(),
      null,
      createElement(DeliveryPointDialog, defaultProps),
    ),
  );
}

describe("DeliveryPointDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Add Delivery Point" title in create mode', () => {
    renderDialog();
    expect(screen.getByText("Add Delivery Point")).toBeInTheDocument();
  });

  it('shows "Edit Delivery Point" title in edit mode', () => {
    renderDialog({ deliveryPoint: mockDeliveryPoint });
    expect(screen.getByText("Edit Delivery Point")).toBeInTheDocument();
  });

  it("pre-fills form with delivery point data in edit mode", async () => {
    renderDialog({ deliveryPoint: mockDeliveryPoint });

    const dialog = getDialog();
    await waitFor(() => {
      expect(dialog.getByPlaceholderText("e.g. หลังคลังสินค้า")).toHaveValue(
        "Main Warehouse",
      );
    });
  });

  it("shows empty form in create mode", () => {
    renderDialog();

    const dialog = getDialog();
    expect(dialog.getByPlaceholderText("e.g. หลังคลังสินค้า")).toHaveValue("");
  });

  it('shows "Create" button in create mode', () => {
    renderDialog();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it('shows "Save" button in edit mode', () => {
    renderDialog({ deliveryPoint: mockDeliveryPoint });
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("calls create mutation on submit in create mode", async () => {
    const user = userEvent.setup();
    renderDialog();

    const dialog = getDialog();
    const nameInput = dialog.getByPlaceholderText("e.g. หลังคลังสินค้า");
    await user.type(nameInput, "New Delivery Point");

    const submitButton = screen.getByRole("button", { name: "Create" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        { name: "New Delivery Point", is_active: true },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });
  });

  it("calls update mutation on submit in edit mode", async () => {
    const user = userEvent.setup();
    renderDialog({ deliveryPoint: mockDeliveryPoint });

    const dialog = getDialog();
    const nameInput = dialog.getByPlaceholderText("e.g. หลังคลังสินค้า");

    await waitFor(() => {
      expect(nameInput).toHaveValue("Main Warehouse");
    });

    await user.clear(nameInput);
    await user.type(nameInput, "Updated Warehouse");

    const submitButton = screen.getByRole("button", { name: "Save" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        { id: "1", name: "Updated Warehouse", is_active: true },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });
  });

  it("shows validation error when name is empty", async () => {
    const user = userEvent.setup();
    renderDialog();

    const submitButton = screen.getByRole("button", { name: "Create" });
    await user.click(submitButton);

    const dialog = getDialog();
    await waitFor(() => {
      expect(dialog.getByPlaceholderText("e.g. หลังคลังสินค้า")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("calls onOpenChange when cancel is clicked", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    renderDialog({ onOpenChange });

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
