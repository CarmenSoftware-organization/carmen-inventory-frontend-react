import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import type { PurchaseRequestTemplate } from "@/types/purchase-request";
import { PrtForm } from "./prt-form";

const template: PurchaseRequestTemplate = {
  id: "prt-1",
  name: "Weekly Produce",
  description: "Standing order for the kitchen",
  department_id: "dep-1",
  department_name: "Kitchen",
  workflow_id: "wf-1",
  workflow_name: "PR Approval",
  info: {},
  is_active: true,
  doc_version: 1,
  purchase_request_template_detail: [],
};

function renderForm(props: { template?: PurchaseRequestTemplate } = {}) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <IntlProvider locale="en" messages={en}>
        <MemoryRouter>
          <PrtForm {...props} />
        </MemoryRouter>
      </IntlProvider>
    </QueryClientProvider>,
  );
}

// The toolbar title repeats the template name, so assert on the plain-text
// slots themselves rather than on page-wide text matches.
const plainTexts = () =>
  Array.from(document.querySelectorAll('[data-slot="field-plain-text"]')).map(
    (el) => el.textContent,
  );

describe("PrtForm — SettingSection layout", () => {
  it("renders each section heading with its resolved description", () => {
    renderForm();

    const prt = en.procurement.purchaseRequestTemplate;
    for (const [title, description] of [
      [en.field.general, prt.generalDesc],
      [en.field.items, prt.itemsDesc],
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      // asserts the i18n key resolved — a missing key would render the path
      expect(screen.getByText(description)).toBeInTheDocument();
    }
  });

  it("renders the general inputs in add mode", () => {
    renderForm();
    expect(document.getElementById("prt-name")).not.toBeNull();
    expect(document.getElementById("prt-description")).not.toBeNull();
    expect(plainTexts()).toEqual([]);
  });
});

describe("PrtForm — view mode", () => {
  // Guards the label muting too, indirectly: Field only mutes its label when a
  // FieldPlainText is a DIRECT child, so the workflow value going back to
  // LookupWorkflow's own readOnly <span> would drop it from this list AND leave
  // its label at full emphasis. Asserting the muting directly is not possible
  // here — it is a Tailwind has-[] selector and jsdom loads no stylesheet.
  it("shows workflow, name and description as plain text instead of inputs", () => {
    renderForm({ template });

    expect(plainTexts()).toEqual([
      "PR Approval",
      "Weekly Produce",
      "Standing order for the kitchen",
    ]);
    expect(document.getElementById("prt-name")).toBeNull();
    expect(document.getElementById("prt-description")).toBeNull();
  });

  it("falls back to an em dash for an empty description", () => {
    renderForm({ template: { ...template, description: "" } });
    expect(plainTexts()).toContain("—");
  });
});
