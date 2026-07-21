import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field, FieldLabel } from "@/components/ui/field";
import { LookupCombobox } from "./lookup-combobox";

// t(key) → key
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

interface Item {
  id: string;
  name: string;
}

const items: Item[] = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Beta" },
];

function renderInField(over: { value?: string; readOnly?: boolean } = {}) {
  return render(
    <Field>
      <FieldLabel>Thing</FieldLabel>
      <LookupCombobox<Item>
        value={over.value ?? "a"}
        onValueChange={vi.fn()}
        items={items}
        getId={(i) => i.id}
        getLabel={(i) => i.name}
        readOnly={over.readOnly ?? true}
      />
    </Field>,
  );
}

const plainText = () =>
  document.querySelector('[data-slot="field-plain-text"]');

describe("LookupCombobox — readOnly", () => {
  // The data-slot is load-bearing, not cosmetic: Field mutes its label via
  // has-[>[data-slot=field-plain-text]], which only matches a DIRECT child.
  // Rendering a bare <span> here silently leaves the label at full emphasis.
  it("renders the value through FieldPlainText as a direct child of Field", () => {
    renderInField();

    const el = plainText();
    expect(el).not.toBeNull();
    expect(el?.textContent).toBe("Alpha");
    expect(el?.parentElement?.getAttribute("data-slot")).toBe("field");
  });

  it("falls back to an em dash when nothing is selected", () => {
    renderInField({ value: "" });
    expect(plainText()?.textContent).toBe("—");
  });

  it("renders the trigger button, not plain text, when not readOnly", () => {
    renderInField({ readOnly: false });

    expect(plainText()).toBeNull();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
