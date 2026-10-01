import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "use-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { buildGoogleAuthorizeUrl } from "@/lib/auth/google-authorize-url";

describe("buildGoogleAuthorizeUrl", () => {
  it("targets the gateway authorize endpoint for the App with the UI language", () => {
    const url = new URL(buildGoogleAuthorizeUrl("https://api.test", "th"));

    expect(url.origin + url.pathname).toBe(
      "https://api.test/api/auth/google/authorize",
    );
    expect(url.searchParams.get("app")).toBe("app");
    expect(url.searchParams.get("locale")).toBe("th");
    expect(url.searchParams.has("next")).toBe(false);
  });

  it("tolerates a trailing slash on the backend URL", () => {
    expect(buildGoogleAuthorizeUrl("https://api.test/", "en")).toMatch(
      /^https:\/\/api\.test\/api\/auth\/google\/authorize\?/,
    );
  });

  it("carries a deep link as `next`, encoded", () => {
    const url = new URL(
      buildGoogleAuthorizeUrl("https://api.test", "en", "/invitations/abc?x=1"),
    );
    expect(url.searchParams.get("next")).toBe("/invitations/abc?x=1");
  });
});

describe("GoogleSignInButton", () => {
  const originalLocation = window.location;
  const assign = vi.fn();

  beforeEach(() => {
    setRuntimeConfigForTests({ BACKEND_URL: "https://api.test", X_APP_ID: "app-1" });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign },
    });
    assign.mockClear();
  });
  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  const renderButton = (next?: string) =>
    render(
      <IntlProvider locale="en" messages={en}>
        <GoogleSignInButton next={next} />
      </IntlProvider>,
    );

  it("sends the browser to the gateway when clicked", async () => {
    renderButton();

    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    expect(assign).toHaveBeenCalledTimes(1);
    const url = new URL(assign.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe(
      "https://api.test/api/auth/google/authorize",
    );
    expect(url.searchParams.get("locale")).toBe("en");
  });

  it("passes the page to return to", async () => {
    renderButton("/invitations/tok-1");

    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    const url = new URL(assign.mock.calls[0][0] as string);
    expect(url.searchParams.get("next")).toBe("/invitations/tok-1");
  });
});
