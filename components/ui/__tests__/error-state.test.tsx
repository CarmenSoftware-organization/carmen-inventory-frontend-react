import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { ErrorState } from "@/components/ui/error-state";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

function renderErrorState(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <IntlProvider locale="en" messages={en} timeZone="Asia/Bangkok">
        {ui}
      </IntlProvider>
    </MemoryRouter>,
  );
}

describe("ErrorState", () => {
  // สตริงใน `message` ของ ApiError คือ fallback อังกฤษที่ dev เขียนไว้ ไม่ใช่ของผู้ใช้
  it("แปล error ที่ส่งเข้ามา ไม่โชว์สตริงของ dev", () => {
    renderErrorState(
      <ErrorState
        error={new ApiError(ERROR_CODES.NETWORK_ERROR, "Failed to fetch users")}
      />,
    );

    expect(screen.getByText(en.errors.network)).toBeInTheDocument();
    expect(screen.queryByText("Failed to fetch users")).not.toBeInTheDocument();
  });

  // รหัสมีไว้ให้พนักงานกดคัดลอกไปแจ้งทีม — ต้องอยู่บนหน้าที่เขาติดอยู่ ไม่ใช่ toast ที่หายไปเอง
  it("โชว์รหัสข้อผิดพลาดเมื่อฝั่งเราพัง", () => {
    renderErrorState(
      <ErrorState
        error={new ApiError(ERROR_CODES.INTERNAL_ERROR, "boom", 500)}
      />,
    );

    expect(
      screen.getByRole("button", { name: en.errors.copyErrorId }),
    ).toBeInTheDocument();
  });

  // ของไม่เจอ ทีมงานตามให้ไม่ได้ รหัสเลยเป็นแค่ตัวอักษรรกจอ
  it("ไม่โชว์รหัสเมื่อเป็นเรื่องที่แจ้งทีมไปก็ไม่ช่วย", () => {
    renderErrorState(
      <ErrorState
        error={new ApiError(ERROR_CODES.NOT_FOUND, "PR not found", 404)}
      />,
    );

    expect(
      screen.queryByRole("button", { name: en.errors.copyErrorId }),
    ).not.toBeInTheDocument();
  });

  // 404 กดลองใหม่กี่ทีก็ไม่เจอ — ทางออกเดียวคือกลับหน้ารายการ
  it("ให้ทางกลับหน้ารายการแทนปุ่มลองใหม่", () => {
    renderErrorState(
      <ErrorState message={en.errors.notFound} backTo="/config/location" />,
    );

    expect(
      screen.getByRole("link", { name: en.errors.backToList }),
    ).toHaveAttribute("href", "/config/location");
    expect(
      screen.queryByRole("button", { name: en.errors.tryAgain }),
    ).not.toBeInTheDocument();
  });

  it("message ที่ส่งมาเองชนะ error เสมอ", () => {
    renderErrorState(
      <ErrorState
        message="ไม่พบใบขอซื้อ"
        error={new ApiError(ERROR_CODES.NOT_FOUND, "PR not found", 404)}
      />,
    );

    expect(screen.getByText("ไม่พบใบขอซื้อ")).toBeInTheDocument();
    expect(screen.queryByText(en.errors.notFound)).not.toBeInTheDocument();
  });

  // เปิด PR ด้วย id ที่ไม่มีจริง = 404 จาก backend ไม่ใช่ query ที่คืนค่าว่าง
  // ต้องได้ข้อความของโมดูล ไม่ใช่ "ไม่พบข้อมูลที่ค้นหา" กลาง ๆ
  it("404 จาก backend ใช้ข้อความเฉพาะโมดูล", () => {
    renderErrorState(
      <ErrorState
        error={
          new ApiError(
            ERROR_CODES.NOT_FOUND,
            "Failed to fetch purchase request",
            404,
          )
        }
        notFoundMessage="Purchase request not found"
        onRetry={() => {}}
        backTo="/procurement/purchase-request"
      />,
    );

    expect(screen.getByText("Purchase request not found")).toBeInTheDocument();
    expect(screen.queryByText(en.errors.notFound)).not.toBeInTheDocument();
    // ลองใหม่ไม่ช่วย — ต้องเหลือแค่ทางออกสองทาง
    expect(
      screen.queryByRole("button", { name: en.errors.tryAgain }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: en.errors.backToList }),
    ).toHaveAttribute("href", "/procurement/purchase-request");
    expect(
      screen.getByRole("link", { name: en.errors.goToDashboard }),
    ).toHaveAttribute("href", "/dashboard");
  });

  // useQuery คืน error เป็น null ตอนไม่พัง — เผลอเทียบกับ undefined แล้วพังทั้งชุด
  it("query ผ่านแต่ไม่มีข้อมูล (error = null) ยังนับเป็นของไม่เจอ", () => {
    renderErrorState(
      <ErrorState
        error={null}
        notFoundMessage="Vendor not found"
        onRetry={() => {}}
        backTo="/vendor-management/vendor"
      />,
    );

    expect(screen.getByText("Vendor not found")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: en.errors.tryAgain }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: en.errors.goToDashboard }),
    ).toBeInTheDocument();
  });

  // เซิร์ฟเวอร์พังยังลองใหม่ได้จริง อย่าไปตัดปุ่มทิ้ง
  it("5xx ยังได้ปุ่มลองใหม่ ไม่ใช่ทางตัน", () => {
    renderErrorState(
      <ErrorState
        error={new ApiError(ERROR_CODES.INTERNAL_ERROR, "boom", 500)}
        notFoundMessage="Vendor not found"
        onRetry={() => {}}
        backTo="/vendor-management/vendor"
      />,
    );

    expect(
      screen.getByRole("button", { name: en.errors.tryAgain }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: en.errors.goToDashboard }),
    ).not.toBeInTheDocument();
  });
});
