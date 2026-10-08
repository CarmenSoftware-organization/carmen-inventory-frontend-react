import { describe, expect, it } from "vitest";
import { parseScheduleDialog } from "./parse-schedule-dialog";

describe("parseScheduleDialog", () => {
  it("keeps fields inside <Group> (and nested groups) in document order", () => {
    const fields = parseScheduleDialog(`<Dialog Cols="2">
      <Label Text="Status"/><Lookup Name="Status" Items="ALL~Open" Values="ALL~O"/>
      <Group ColSpan="2">
        <Label Text="Date From"/><Date Name="DateFrom"/>
        <Group><Label Text="Date To"/><Date Name="DateTo"/></Group>
      </Group>
    </Dialog>`);

    expect(fields.map((f) => [f.name, f.label])).toEqual([
      ["Status", "Status"],
      ["DateFrom", "Date From"],
      ["DateTo", "Date To"],
    ]);
  });

  it("uses a control's own Label before the preceding <Label>, and Name when it is blank", () => {
    const fields = parseScheduleDialog(`<Dialog>
      <Label Text="Ignored"/><Lookup Name="Vendor" Label="Supplier" Items="ALL" Values="ALL"/>
      <Label Text="Ignored too"/><Date Name="AsAt" Label=" "/>
      <Label Text="Location"/><Lookup Name="Location" Items="ALL" Values="ALL"/>
    </Dialog>`);

    expect(fields.map((f) => [f.name, f.label])).toEqual([
      ["Vendor", "Supplier"],
      ["AsAt", "AsAt"],
      ["Location", "Location"],
    ]);
  });
});
