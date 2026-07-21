import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import type { Report } from "@/types/report";
import ReportCard from "./report-card";

const baseReport: Report = {
  Id: 1,
  PermissionName: "report.view",
  ReportGroup: "Inventory",
  ReportName: "Stock Card Detail",
  Description: "Stock movement detail report",
  Dialog: "{}",
  IsSystem: false,
  UserModified: "",
  LastModify: "",
};

function renderCard(report: Report) {
  render(
    <IntlProvider locale="en" messages={en}>
      <ReportCard item={report} onSelect={vi.fn()} />
    </IntlProvider>,
  );
}

describe("ReportCard — template type badge", () => {
  it("shows a form badge for form templates", () => {
    renderCard({ ...baseReport, _templateType: "form" });
    expect(screen.getByText(/form/i)).toBeInTheDocument();
  });

  it("shows a list badge for list templates", () => {
    renderCard({ ...baseReport, _templateType: "list" });
    expect(screen.getByText(/list/i)).toBeInTheDocument();
  });

  it("renders no template type badge when _templateType is absent", () => {
    renderCard({ ...baseReport });
    expect(screen.queryByText(/^form$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^list$/i)).not.toBeInTheDocument();
  });
});
