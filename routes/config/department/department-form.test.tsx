import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import type { Department } from "@/types/department";
import { DepartmentForm } from "./department-form";

const department: Department = {
  id: "dep-1",
  doc_version: 1,
  code: "FIN",
  name: "Finance",
  description: "Handles the money",
  is_active: true,
  account_code: "ACC-900",
  department_users: [],
  hod_users: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function renderForm(props: { department?: Department } = {}) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <IntlProvider locale="en" messages={en}>
        <MemoryRouter>
          <DepartmentForm {...props} />
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

// The toolbar title and code badge repeat the name/code, so assert on the
// plain-text slots themselves rather than on page-wide text matches.
const plainTexts = () =>
  Array.from(document.querySelectorAll('[data-slot="field-plain-text"]')).map(
    (el) => el.textContent,
  );

describe("DepartmentForm — view mode", () => {
  it("shows the general fields as plain text instead of inputs", () => {
    renderForm({ department });

    expect(plainTexts()).toEqual([
      "FIN",
      "Finance",
      "ACC-900",
      "Handles the money",
    ]);
    for (const id of [
      "department-code",
      "department-name",
      "department-account-code",
      "department-description",
    ]) {
      expect(document.getElementById(id)).toBeNull();
    }
  });

  it("falls back to an em dash for an empty field", () => {
    renderForm({ department: { ...department, account_code: "" } });
    expect(plainTexts()).toContain("—");
  });
});
