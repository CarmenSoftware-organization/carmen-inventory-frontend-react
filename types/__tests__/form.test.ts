import { describe, it, expect } from "vitest";
import { getModeLabels } from "../form";

describe("getModeLabels", () => {
  it('returns add labels with entity name', () => {
    const labels = getModeLabels("add", "Delivery Point");
    expect(labels).toEqual({
      title: "Add Delivery Point",
      submit: "Create",
      pending: "Creating...",
    });
  });

  it('returns edit labels with entity name', () => {
    const labels = getModeLabels("edit", "Delivery Point");
    expect(labels).toEqual({
      title: "Edit Delivery Point",
      submit: "Save",
      pending: "Saving...",
    });
  });

  it('returns view labels with entity name', () => {
    const labels = getModeLabels("view", "Delivery Point");
    expect(labels).toEqual({
      title: "Delivery Point",
      submit: "",
      pending: "",
    });
  });
});
