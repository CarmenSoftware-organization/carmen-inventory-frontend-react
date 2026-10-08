import { describe, expect, it } from "vitest";
import { parseReportDialog } from "./parse-report-dialog";

// Stock Card / Inventory Balance: ป้ายของทั้งสองฝั่ง ("Location From" / "Location To") — เคยขึ้นเป็นสี่แถวแยกกัน
const CURRENT_DIALOG = `<Dialog>
  <Label Text="Date From"/><Date Name="DateFrom"/>
  <Label Text="Date To"/><Date Name="DateTo"/>
  <Label Text="Location From"/><Lookup Name="LocationFrom" DataSource="@location_list"/>
  <Label Text="Location To"/><Lookup Name="LocationTo" DataSource="@location_list"/>
  <Label Text="Group By"/><Lookup Name="GroupBy" Items="Product~Location" Values="Product~Location"/>
</Dialog>`;

describe("parseReportDialog", () => {
  it("pairs <X>From with <X>To into one range, whatever the second label says", () => {
    const { cells: fields } = parseReportDialog(CURRENT_DIALOG);

    expect(fields.map((f) => f.kind)).toEqual(["range", "range", "single"]);
    expect(fields[0]).toMatchObject({
      label: "Date From",
      from: { name: "DateFrom" },
      to: { name: "DateTo" },
    });
    expect(fields[1]).toMatchObject({
      label: "Location From",
      from: { name: "LocationFrom", dataSource: "location" },
      to: { name: "LocationTo", dataSource: "location" },
    });
  });

  it("does not pair controls of different fields", () => {
    const { cells: fields } = parseReportDialog(`<Dialog>
      <Label Text="Product From"/><Lookup Name="ProductFrom" DataSource="@product_list"/>
      <Label Text="Location To"/><Lookup Name="LocationTo" DataSource="@location_list"/>
    </Dialog>`);

    expect(fields.map((f) => f.kind)).toEqual(["single", "single"]);
  });

  it("still pairs the legacy layout with a hidden second label", () => {
    const { cells: fields } = parseReportDialog(`<Dialog>
      <Label Text="Vendor"/><Lookup Name="VendorFrom" DataSource="@vendor_list"/>
      <Label Text="to" Visible="false"/><Lookup Name="VendorTo" DataSource="@vendor_list"/>
    </Dialog>`);

    expect(fields).toEqual([
      expect.objectContaining({ kind: "range", label: "Vendor" }),
    ]);
  });
});
