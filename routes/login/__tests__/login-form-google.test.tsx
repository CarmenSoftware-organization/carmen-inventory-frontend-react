import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";
import LoginForm from "../login-form";

// The gateway status check — on by default so the button renders; the switch itself is gateway logic.
vi.mock("@/lib/auth/google-sign-in-status", () => ({
  fetchGoogleSignInEnabled: () => Promise.resolve(true),
}));

function renderLogin(entry: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <IntlProvider locale="en" messages={en}>
        <MemoryRouter initialEntries={[entry]}>
          <LoginForm />
        </MemoryRouter>
      </IntlProvider>
    </QueryClientProvider>,
  );
}

describe("LoginForm — Google sign-in", () => {
  beforeEach(() => {
    setRuntimeConfigForTests({ BACKEND_URL: "https://api.test", X_APP_ID: "app-1" });
  });

  it("offers Google next to the password form", async () => {
    renderLogin("/login");

    expect(
      await screen.findByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    ["google_no_account", /no account exists for this google email/i],
    ["google_account_conflict", /conflicts with another account/i],
    ["google_too_many_attempts", /too many sign-in attempts/i],
    ["google_disabled", /google sign-in is turned off/i],
    ["google_failed", /google sign-in failed/i],
  ])("translates the error code %s into a banner", (code, text) => {
    renderLogin(`/login?error=${code}`);

    expect(screen.getByRole("alert")).toHaveTextContent(text);
  });

  it("never renders free text from the URL: an unknown code shows the generic message", () => {
    renderLogin(
      "/login?error=Your%20account%20is%20suspended%20call%20555-0100",
    );

    const banner = screen.getByRole("alert");
    expect(banner).toHaveTextContent(/google sign-in failed/i);
    expect(banner).not.toHaveTextContent(/555-0100/);
  });
});
