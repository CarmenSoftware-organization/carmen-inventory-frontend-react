import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import { LocationForm } from "./location-form";

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
      expect(
        screen.getByRole("heading", { name: title }),
      ).toBeInTheDocument();
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
