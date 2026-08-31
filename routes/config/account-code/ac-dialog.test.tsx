import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";
import {
  ACCOUNT_CODE_TYPE,
  ACCOUNT_NATURE,
  type AccountCode,
} from "@/types/account-code";

const createMutate = vi.fn();
const updateMutate = vi.fn();

// dialog เรียก mutation จริงผ่าน hook สองตัวนี้ — ดักไว้เพื่อดู "body ที่ส่งออก"
// ซึ่งเป็นสิ่งที่ต้องตรงกับสัญญาของ backend เป๊ะ
vi.mock("./use-account-code", () => ({
  useCreateAccountCode: () => ({ mutate: createMutate, isPending: false }),
  useUpdateAccountCode: () => ({ mutate: updateMutate, isPending: false }),
}));

import { AcDialog } from "./ac-dialog";

beforeEach(() => {
  setRuntimeConfigForTests({ BACKEND_URL: "", X_APP_ID: "app-1" });
  createMutate.mockClear();
  updateMutate.mockClear();
});

const existing: AccountCode = {
  id: "ac-1",
  doc_version: 3,
  code: "4100-002",
  description_1: "Food Revenue",
  description_2: "F&B outlets",
  nature: ACCOUNT_NATURE.CREDIT,
  type: ACCOUNT_CODE_TYPE.INCOME_STATEMENT,
  is_active: false,
};

function renderDialog(props: Partial<Parameters<typeof AcDialog>[0]> = {}) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <IntlProvider locale="en" messages={en}>
        <MemoryRouter>
          <AcDialog open onOpenChange={() => {}} {...props} />
        </MemoryRouter>
      </IntlProvider>
    </QueryClientProvider>,
  );
}

const input = (id: string) =>
  document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;

/**
 * ข้อความบนปุ่ม dropdown ตามลำดับที่ render (0 = ด้านบัญชี, 1 = ประเภท)
 * ค้นด้วย getByText ไม่ได้ — Radix ใส่ค่าไว้ทั้งบนปุ่มและใน select ที่ซ่อนอยู่
 */
const selectValues = () =>
  Array.from(document.querySelectorAll('[data-slot="select-trigger"]')).map(
    (el) => el.textContent?.trim(),
  );

const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: /save|create|add/i }));

describe("AcDialog — โหมดสร้างใหม่", () => {
  it("มีช่องรหัสบัญชีกับชื่อบัญชี ไม่มีช่อง name/description ของเดิม", () => {
    renderDialog();
    expect(input("account-code-code")).not.toBeNull();
    expect(input("account-code-description-1")).not.toBeNull();
    expect(input("account-code-description-2")).not.toBeNull();
    expect(input("account-code-name")).toBeNull();
    expect(input("account-code-description")).toBeNull();
  });

  it("ตั้งต้นที่ Debit + Balance sheet ซึ่งเป็นชุดที่กรอกบ่อยสุด", () => {
    renderDialog();
    expect(selectValues()).toEqual(["Debit", "Balance sheet"]);
  });

  it("กรอกครบแล้วส่ง body ตรงตามสัญญา", async () => {
    renderDialog();
    fireEvent.change(input("account-code-code")!, {
      target: { value: "1140-001" },
    });
    fireEvent.change(input("account-code-description-1")!, {
      target: { value: "Inventory - Food" },
    });
    submit();

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate.mock.calls[0][0]).toEqual({
      code: "1140-001",
      description_1: "Inventory - Food",
      // ไม่ได้กรอก = ส่ง null ไม่ใช่ string ว่าง
      description_2: null,
      nature: "debit",
      type: "balance_sheet",
      is_active: true,
    });
  });

  it("กรอก description_2 แล้วติดไปกับ body ด้วย", async () => {
    renderDialog();
    fireEvent.change(input("account-code-code")!, {
      target: { value: "1140-001" },
    });
    fireEvent.change(input("account-code-description-1")!, {
      target: { value: "Inventory - Food" },
    });
    fireEvent.change(input("account-code-description-2")!, {
      target: { value: "ครัวร้อน" },
    });
    submit();

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate.mock.calls[0][0].description_2).toBe("ครัวร้อน");
  });

  it("กรอกไม่ครบไม่ยิง API", async () => {
    renderDialog();
    fireEvent.change(input("account-code-code")!, {
      target: { value: "1140-001" },
    });
    submit();

    await waitFor(() =>
      expect(input("account-code-description-1")).not.toBeNull(),
    );
    expect(createMutate).not.toHaveBeenCalled();
  });
});

describe("AcDialog — โหมดแก้ไข", () => {
  it("เติมค่าจากใบเดิมครบทุกช่อง", () => {
    renderDialog({ accountCode: existing });
    expect(input("account-code-code")?.value).toBe("4100-002");
    expect(input("account-code-description-1")?.value).toBe("Food Revenue");
    expect(input("account-code-description-2")?.value).toBe("F&B outlets");
    expect(selectValues()).toEqual(["Credit", "Income statement"]);
  });

  it("ส่ง id + doc_version ไปด้วย (optimistic lock ของ backend)", async () => {
    renderDialog({ accountCode: existing });
    fireEvent.change(input("account-code-description-1")!, {
      target: { value: "Beverage Revenue" },
    });
    submit();

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    expect(updateMutate.mock.calls[0][0]).toEqual({
      id: "ac-1",
      doc_version: 3,
      code: "4100-002",
      description_1: "Beverage Revenue",
      description_2: "F&B outlets",
      nature: "credit",
      type: "income_statement",
      is_active: false,
    });
  });

  it("โหมดอ่านอย่างเดียวแก้ไม่ได้", () => {
    renderDialog({ accountCode: existing, readOnly: true });
    expect(input("account-code-code")?.disabled).toBe(true);
    expect(input("account-code-description-1")?.disabled).toBe(true);
  });
});
