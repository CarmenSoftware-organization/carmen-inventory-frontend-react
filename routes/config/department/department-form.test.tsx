import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import { DepartmentForm } from "./department-form";

function renderForm() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <IntlProvider locale="en" messages={en}>
        <MemoryRouter>
          <DepartmentForm />
        </MemoryRouter>
      </IntlProvider>
    </QueryClientProvider>,
  );
}

describe("DepartmentForm — account_code", () => {
  it("renders the account_code input in add mode", () => {
    renderForm();
    expect(document.getElementById("department-account-code")).not.toBeNull();
  });
});
