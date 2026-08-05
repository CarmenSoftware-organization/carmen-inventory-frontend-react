import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import { toast } from "sonner";
import en from "@/messages/en.json";
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { useExportErrorToast } from "@/hooks/use-export-error-toast";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

function renderExportErrorToast() {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <IntlProvider locale="en" messages={en} timeZone="Asia/Bangkok">
      {children}
    </IntlProvider>
  );
  return renderHook(() => useExportErrorToast(), { wrapper }).result;
}

describe("useExportErrorToast", () => {
  // ปุ่ม export ดึงข้อมูลจาก API ก่อน — เน็ตหลุดตรงนั้นต้องบอกว่าเน็ตหลุด
  it("บอกสาเหตุจริงเมื่อดึงข้อมูลไม่ผ่าน ไม่ใช่ 'ส่งออกไม่สำเร็จ' ลอย ๆ", () => {
    const { current: exportErrorToast } = renderExportErrorToast();

    exportErrorToast(
      new ApiError(
        ERROR_CODES.NETWORK_ERROR,
        "Failed to fetch purchase orders",
      ),
    );

    expect(toast.error).toHaveBeenCalledWith(
      en.errors.network,
      expect.anything(),
    );
    // สตริงอังกฤษที่ dev เขียน fallback ไว้ต้องไม่โผล่ถึงผู้ใช้
    expect(toast.error).not.toHaveBeenCalledWith(
      "Failed to fetch purchase orders",
      expect.anything(),
    );
  });

  it("bug ตอนสร้างไฟล์ บอกแค่ว่าส่งออกไม่สำเร็จ", () => {
    const { current: exportErrorToast } = renderExportErrorToast();

    exportErrorToast(new TypeError("cols is not iterable"));

    expect(toast.error).toHaveBeenCalledWith(en.common.exportFailed);
    expect(toast.error).not.toHaveBeenCalledWith(
      "cols is not iterable",
      expect.anything(),
    );
  });
});
