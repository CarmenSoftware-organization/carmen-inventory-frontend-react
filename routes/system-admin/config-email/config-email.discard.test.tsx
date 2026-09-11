import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/messages/en.json";
import {
  fakeMutation,
  renderForm,
} from "@/lib/test-utils/form-characterization";

const upsertMut = fakeMutation();

/** config ที่บันทึกไว้แล้ว — ช่องบังคับครบ เทสต์จะได้โฟกัสที่เรื่อง dirty ล้วน ๆ */
const SAVED = {
  value: {
    smtp: {
      host: "smtp.old",
      port: 587,
      username: "user",
      password: "secret",
      from: "noreply@carmen.test",
    },
    recipients: ["admin@carmen.test"],
    cc: [],
    subject_prefix: "[Carmen]",
  },
};

vi.mock("@/hooks/use-app-config", () => ({
  useAppConfigByKey: () => ({ data: SAVED, isLoading: false }),
  useUpsertAppConfig: () => upsertMut,
  useTestEmail: () => fakeMutation(),
}));

const ConfigEmailComponent = (await import("./config-email-component")).default;

/** ยิง beforeunload แล้วบอกว่าเบราว์เซอร์จะเตือนไหม */
function browserWouldWarn(): boolean {
  const e = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(e);
  return e.defaultPrevented;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ConfigEmailComponent — โหลดค่าที่บันทึกไว้", () => {
  /**
   * regression: React Compiler memo คอมโพเนนต์นี้ไว้ effect ที่ reset ฟอร์มจาก
   * config ที่โหลดมาเลยไม่ทำงาน ทุกช่องขึ้นว่างทุกครั้งที่เปิดหน้า ทั้งที่ตั้งค่าไว้แล้ว
   */
  it("เปิดหน้ามาต้องเห็น SMTP host ที่เคยตั้งไว้ ไม่ใช่ช่องว่าง", () => {
    renderForm(<ConfigEmailComponent />);
    const host = screen.getByPlaceholderText(
      "smtp.gmail.com",
    ) as HTMLInputElement;
    expect(host.value).toBe("smtp.old");
  });
});

describe("ConfigEmailComponent — กันข้อมูลหายตอนออกจากหน้า", () => {
  it("ยังไม่แก้อะไร ปิดแท็บได้เงียบ ๆ", () => {
    renderForm(<ConfigEmailComponent />);
    expect(browserWouldWarn()).toBe(false);
  });

  it("แก้แล้วยังไม่เซฟ ปิดแท็บต้องโดนเตือน", async () => {
    renderForm(<ConfigEmailComponent />);
    await userEvent.type(
      screen.getByPlaceholderText("smtp.gmail.com"),
      "-changed",
    );
    expect(browserWouldWarn()).toBe(true);
  });

  /**
   * หน้านี้ไม่เคย reset ฟอร์มหลังเซฟ ถ้าไม่แก้ guard จะเตือนค้างตลอด
   * ทั้งที่บันทึกไปแล้ว — ซึ่งน่ารำคาญกว่าไม่มี guard
   */
  it("เซฟแล้วเลิกเตือน", async () => {
    renderForm(<ConfigEmailComponent />);
    await userEvent.type(
      screen.getByPlaceholderText("smtp.gmail.com"),
      "-changed",
    );
    await act(async () => {
      await userEvent.click(
        screen.getByRole("button", { name: new RegExp(en.common.save) }),
      );
    });

    expect(upsertMut.mutate).toHaveBeenCalledTimes(1);
    expect(browserWouldWarn()).toBe(false);
  });
});
