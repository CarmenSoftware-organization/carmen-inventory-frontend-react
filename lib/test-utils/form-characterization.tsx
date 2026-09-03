import type { ReactElement } from "react";
import { vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";

/**
 * เครื่องมือสำหรับ characterization test ของฟอร์ม entity
 *
 * **เทสต์พวกนี้ไม่ได้บอกว่าพฤติกรรม "ถูก" — มันบอกว่าพฤติกรรม "เป็นแบบนี้อยู่"**
 * มีไว้เป็นตาข่ายก่อนยุบฟอร์มเข้า hook กลาง เพราะแต่ละใบตัดสินใจไม่เหมือนกันจริง ๆ
 * (เซฟแล้วอยู่หน้าเดิม vs กลับ list · create แล้ว replace vs กลับ list) ถ้ายุบแล้ว
 * เผลอเลือกทางเดียวให้ทุกใบ ครึ่งแอปจะเปลี่ยนพฤติกรรมโดยไม่มีใครขอ
 *
 * จับผ่าน `navigate` กับ payload ของ mutation ซึ่งเป็นสิ่งที่ผู้ใช้กับ backend
 * เห็นจริง — ไม่ผูกกับรูปร่างของโค้ด เทสต์จึงรอดข้ามการ refactor ไปได้
 */

/** mutation ปลอมที่เรียก onSuccess ทันที — ไม่ต้องรอ network */
export function fakeMutation(result: unknown = { data: { id: "new-id" } }) {
  return {
    mutate: vi.fn(
      (
        _payload: unknown,
        opts?: { onSuccess?: (res: unknown) => void; onError?: () => void },
      ) => {
        opts?.onSuccess?.(result);
      },
    ),
    mutateAsync: vi.fn(async () => result),
    isPending: false,
  };
}

/** อ่าน payload ของการเรียก mutate ครั้งแรก */
export function firstPayload(mut: {
  mutate: ReturnType<typeof vi.fn>;
}): Record<string, unknown> | undefined {
  return mut.mutate.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
}

export function renderForm(ui: ReactElement) {
  setRuntimeConfigForTests({ BACKEND_URL: "", X_APP_ID: "app-1" });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <IntlProvider locale="en" messages={en}>
        <MemoryRouter>{ui}</MemoryRouter>
      </IntlProvider>
    </QueryClientProvider>,
  );
}

/** ยิง submit ผ่าน <form id> ตรง ๆ — ผ่าน handleSubmit จริง validation จึงยังทำงาน */
export function submitForm(formId: string) {
  const el = document.getElementById(formId);
  if (!el) throw new Error(`ไม่พบ <form id="${formId}">`);
  el.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}
