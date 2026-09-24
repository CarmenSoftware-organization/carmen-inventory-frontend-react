import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";
import type { CreditNoteDetail } from "@/types/credit-note";
import { CnForm } from "./cn-form";

beforeEach(() => {
  setRuntimeConfigForTests({ BACKEND_URL: "", X_APP_ID: "app-1" });
});

const draftCn = {
  id: "00000000-0000-4000-8000-000000000001",
  doc_version: 1,
  doc_status: "draft",
  credit_note_type: "quantity_return",
  cn_no: "CN26020001",
  cn_date: "2026-09-24T00:00:00.000Z",
  tax_invoice_no: null,
  tax_invoice_date: null,
  credit_note_detail: [],
} as unknown as CreditNoteDetail;

/**
 * ใบที่เปิดจาก DB เข้าโหมด view ก่อน → `form.reset()` ล้าง `_fields` ของ RHF แล้ว
 * ช่องต้อง register ใหม่ ถ้าคอมไพเลอร์แช่ผล `form.register()` ไว้ ref callback
 * ตัวเดิมไม่ถูกเรียกซ้ำ RHF จะอ่านค่าจาก placeholder แทน `<input>` จริง พิมพ์เท่าไร
 * ค่าในฟอร์มก็ยังเป็น "" แล้ว Submit ฟ้อง "Tax Invoice # is required"
 */
describe("CnGeneralFields — ช่อง register ของใบที่เปิดจาก DB", () => {
  it("Edit → พิมพ์ Tax Invoice # → Submit แล้วช่องนั้นไม่โดนฟ้องว่าว่าง", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <IntlProvider locale="en" messages={en} onError={() => {}}>
          <MemoryRouter>
            <CnForm creditNote={draftCn} />
          </MemoryRouter>
        </IntlProvider>
      </QueryClientProvider>,
    );
    const input = () =>
      document.getElementById("cn-tax-invoice-no") as HTMLInputElement;

    await user.click(screen.getByRole("button", { name: en.common.edit }));
    await user.type(input(), "TAX-2026-09-24");

    const submit = screen.getAllByRole("button", { name: en.common.submit });
    await user.click(submit[submit.length - 1]);
    const confirm = await screen.findAllByRole("button", {
      name: en.common.submit,
    });
    await user.click(confirm[confirm.length - 1]);

    // ฟอร์มนี้ยังขาดช่องบังคับอื่น — รอให้ validation รอบ submit ทำงานจบก่อน
    await waitFor(() =>
      expect(
        document.querySelector('[aria-invalid="true"]'),
      ).not.toBeNull(),
    );
    expect(input().value).toBe("TAX-2026-09-24");
    expect(input().getAttribute("aria-invalid")).toBe("false");
  });
});
