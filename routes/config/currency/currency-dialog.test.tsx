import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";
import { CurrencyDialog } from "./currency-dialog";

// ตัว lookup จริงเป็น popover ของ Radix + cmdk — เทสต์นี้สนใจแค่ "พอเลือก code
// แล้วเกิดอะไรขึ้น" เลยแทนด้วยปุ่มที่ยิง onValueChange ตรง ๆ
vi.mock("@/components/lookup/lookup-currency-iso", () => ({
  LookupCurrencyIso: ({
    onValueChange,
  }: {
    onValueChange: (v: string) => void;
  }) => (
    <button type="button" onClick={() => onValueChange("USD")}>
      pick usd
    </button>
  ),
}));

beforeEach(() => {
  setRuntimeConfigForTests({ BACKEND_URL: "", X_APP_ID: "app-1" });
  // /api/exchange-rate ไม่มีอยู่จริงทั้งใน SPA และ gateway — จำลองสภาพจริง
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("no such endpoint"))),
  );
});

function renderDialog() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <IntlProvider locale="en" messages={en}>
        <CurrencyDialog open onOpenChange={() => {}} />
      </IntlProvider>
    </QueryClientProvider>,
  );
}

const rateInput = () =>
  document.getElementById("currency-exchange-rate") as HTMLInputElement;

describe("CurrencyDialog — เลือก currency แล้ว auto-fill", () => {
  it("เติมชื่อกับสัญลักษณ์จาก ISO list", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "pick usd" }));

    expect(
      (document.getElementById("currency-name") as HTMLInputElement).value,
    ).toBe("US Dollar");
    expect(
      (document.getElementById("currency-symbol") as HTMLInputElement).value,
    ).toBe("$");
  });

  /**
   * ไม่มีแหล่งอัตราแลกเปลี่ยนให้ดึง (`/api/exchange-rate` ไม่มีอยู่จริง) — ห้ามเดา
   * ตัวเลขให้ผู้ใช้ ต้องปล่อยว่างไว้ให้กรอกเอง แล้วให้ schema กันตอน save
   * ค่าหลอกที่ดูเหมือนอัตราจริงคือของที่หลุดลง DB ได้เงียบ ๆ
   */
  it("ไม่ยัดอัตราแลกเปลี่ยนมั่วเมื่อดึงอัตราจริงไม่ได้", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "pick usd" }));

    expect(Number(rateInput().value)).toBe(0);
  });
});
