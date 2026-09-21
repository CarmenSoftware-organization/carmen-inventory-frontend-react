import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";
import { useForm, useFieldArray, type UseFormReturn } from "react-hook-form";

vi.mock("@/lib/http-client", () => ({
  httpClient: {
    get: () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }),
  },
}));

// ตัวเลือกผู้ขายจริงต้องมีลิสต์จาก API ก่อนถึงจะกดเลือกได้ — แทนด้วยปุ่มที่ยิง
// onValueChange ตรง ๆ เพราะสิ่งที่เทสต์นี้สนใจคือ "เลือกแล้วฟอร์มเปลี่ยนอะไรบ้าง"
vi.mock("@/components/lookup/lookup-vendor", () => ({
  LookupVendor: ({
    onValueChange,
  }: {
    onValueChange: (value: string) => void;
  }) => (
    <button type="button" onClick={() => onValueChange("vendor-1")}>
      pick-vendor
    </button>
  ),
}));

import en from "@/messages/en.json";
import { PR_ITEM, type PrFormValues } from "./pr-form-schema";
import { PrItemExpand } from "./pr-item-expand";

/**
 * เลือกผู้ขาย ≠ อนุมัติ
 *
 * ของเดิมเลือกผู้ขายแล้วเซ็ต `current_stage_status = "approve"` ให้เลย พอกด Save
 * (stage purchase ส่ง detail เต็มผ่าน `preparePurchaseDetails`) หลังบ้าน
 * destructure ทิ้งแค่ stage_status/stage_message ส่วน current_stage_status ลอด
 * เข้า pickDetailColumns ไปเขียน DB — แถวเลยกลายเป็น approve ทั้งที่ยังไม่มีใครกด
 */
function Harness({ onForm }: { onForm: (f: UseFormReturn<PrFormValues>) => void }) {
  const form = useForm<PrFormValues>({
    defaultValues: {
      pr_date: "",
      description: "",
      workflow_id: "wf",
      requestor_id: "u",
      department_id: "d",
      items: [
        {
          ...PR_ITEM,
          current_stage_status: "pending",
          _initial_stage_status: "pending",
        } as PrFormValues["items"][number],
      ],
    },
    mode: "onChange",
  });
  onForm(form);
  const { fields } = useFieldArray({ control: form.control, name: "items" });
  if (!fields.length) return null;
  return (
    <PrItemExpand
      item={fields[0]}
      form={form}
      isDisabled={false}
      itemFields={fields}
      buCode="BU"
      baseCurrencyCode="THB"
    />
  );
}

describe("เลือกผู้ขายในแถวขยาย", () => {
  it("ไม่แตะสถานะจริงของแถว แต่บันทึกการตัดสินใจไว้ที่ stage_status", () => {
    let form!: UseFormReturn<PrFormValues>;
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    render(
      <QueryClientProvider client={qc}>
        <IntlProvider locale="en" messages={en}>
          <Harness onForm={(f) => (form = f)} />
        </IntlProvider>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByText("pick-vendor"));

    const item = form.getValues("items.0");
    expect(item.vendor_id).toBe("vendor-1");
    // การตัดสินใจของ session นี้ — resolveApproveStageStatus อ่านตัวนี้ตอนกดอนุมัติ
    expect(item.stage_status).toBe("approve");
    // สถานะจริงใน DB ต้องไม่ขยับจนกว่าจะมีคนกดอนุมัติ
    expect(item.current_stage_status).toBe("pending");
  });
});
