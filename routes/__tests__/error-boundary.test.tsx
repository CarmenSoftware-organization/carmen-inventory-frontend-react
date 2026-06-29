import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import { createMemoryRouter, RouterProvider } from "react-router";
import en from "@/messages/en.json";
import { RouteErrorBoundaryAdapter } from "../module-error-boundary-adapter";
import { RootErrorBoundary } from "../root-error-boundary";

// RootErrorBoundary ห่อ I18nProvider เอง ซึ่งโหลด message chunk แบบ async (null
// จนกว่าจะเสร็จ) — ใน jsdom ทำให้ทดสอบยาก mock เป็น pass-through ที่ป้อน intl ตรงๆ
vi.mock("@/components/i18n-provider", async () => {
  const { IntlProvider: Provider } = await import("use-intl");
  const messages = (await import("@/messages/en.json")).default;
  return {
    I18nProvider: ({ children }: { readonly children: React.ReactNode }) => (
      <Provider locale="en" messages={messages} timeZone="Asia/Bangkok">
        {children}
      </Provider>
    ),
  };
});

function Boom(): never {
  throw new Error("kaboom");
}

describe("route error boundaries", () => {
  beforeEach(() => {
    // react-router + React โยน error ที่ตั้งใจให้พังลง console.error — เก็บเสียงไว้
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("RouteErrorBoundaryAdapter แสดง ErrorState แทน default screen ของ react-router", () => {
    const router = createMemoryRouter([
      { path: "/", Component: Boom, ErrorBoundary: RouteErrorBoundaryAdapter },
    ]);

    render(
      <IntlProvider locale="en" messages={en} timeZone="Asia/Bangkok">
        <RouterProvider router={router} />
      </IntlProvider>,
    );

    // ErrorState (on-design) ขึ้น — ไม่ใช่ข้อความ default ของ react-router
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
    expect(
      screen.queryByText(/provide your own ErrorBoundary/i),
    ).not.toBeInTheDocument();
  });

  it("RootErrorBoundary จับ error ที่หลุดจาก route ไม่มี boundary ของตัวเอง", () => {
    const router = createMemoryRouter([
      { path: "/", Component: Boom, ErrorBoundary: RootErrorBoundary },
    ]);

    render(<RouterProvider router={router} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.queryByText(/provide your own ErrorBoundary/i),
    ).not.toBeInTheDocument();
  });
});
