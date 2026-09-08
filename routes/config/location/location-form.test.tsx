import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";
import { LocationForm } from "./location-form";

// FormToolbar → useCan() → useLicense() reads runtime config — without this it
// throws "Runtime config not loaded" on every render. enforced defaults to
// false here (shadow mode); this test only cares about layout, not license.
beforeEach(() => {
  setRuntimeConfigForTests({ BACKEND_URL: "", X_APP_ID: "app-1" });
});

function renderForm() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <IntlProvider locale="en" messages={en}>
        <MemoryRouter>
          <LocationForm />
        </MemoryRouter>
      </IntlProvider>
    </QueryClientProvider>,
  );
}

describe("LocationForm — SettingSection layout", () => {
  it("renders each section heading with its resolved description", () => {
    renderForm();

    for (const [title, description] of [
      [en.field.general, en.config.location.generalDesc],
      [en.config.location.locationUsers, en.config.location.usersDesc],
      [en.config.location.products, en.config.location.productsDesc],
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      // asserts the i18n key resolved — a missing key would render the path
      expect(screen.getByText(description)).toBeInTheDocument();
    }
  });

  it("renders the general fields", () => {
    renderForm();
    expect(document.getElementById("location-code")).not.toBeNull();
    expect(document.getElementById("location-name")).not.toBeNull();
    expect(document.getElementById("location-description")).not.toBeNull();
  });
});

/**
 * ออกจากฟอร์มด้วยลิงก์ข้างนอก (เมนู sidebar) ต้องโดนถามก่อนเสมอ —
 * `useDiscardConfirm` ดักได้แค่ปุ่มในฟอร์มเอง (Cancel/Back) คนกดเมนูจึงหลุดออกไป
 * พร้อมข้อมูลที่ยังไม่ได้เซฟ ตัวที่ดัก `<a>` คือ `useNavigationGuard`
 *
 * ต้องใช้ BrowserRouter — MemoryRouter ไม่แตะ window.history ที่ guard ใช้ดัน sentinel
 */
describe("LocationForm — ออกจากหน้าโดยไม่เซฟ", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/config/location/new");
  });

  it("ถามก่อนเมื่อกรอกค่าแล้วกดลิงก์ออกไปหน้าอื่น", async () => {
    const user = userEvent.setup();
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <IntlProvider locale="en" messages={en}>
          <BrowserRouter>
            <a href="/config/department">sidebar menu</a>
            <LocationForm />
          </BrowserRouter>
        </IntlProvider>
      </QueryClientProvider>,
    );

    const code = document.getElementById("location-code") as HTMLInputElement;
    await user.type(code, "WH-01");

    await user.click(screen.getByRole("link", { name: "sidebar menu" }));

    expect(await screen.findByText(en.form.discardTitle)).toBeInTheDocument();
  });
});
