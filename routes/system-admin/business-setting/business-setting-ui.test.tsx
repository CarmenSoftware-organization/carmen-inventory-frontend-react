import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { ConfigField } from "./business-setting-ui";
import type { BusinessSettingFormValues } from "./business-setting-form-schema";
import type { BusinessUnitConfigItem } from "@/types/business-unit";

const boolItem: BusinessUnitConfigItem = {
  key: "pr.allow-duplicate.product",
  label: "Allow selecting duplicate products",
  datatype: "boolean",
  value: "true",
};

const textItem: BusinessUnitConfigItem = {
  key: "pr.some.text",
  label: "Some text setting",
  datatype: "string",
  value: "hello",
};

const enumItem: BusinessUnitConfigItem = {
  key: "si.cost-from",
  label: "Default price for added items",
  datatype: "enum",
  value: "last_cost",
};
const enumOptions = [
  { value: "last_receiving", label: "Last receiving" },
  { value: "last_cost", label: "Last cost" },
];

/** harness: RHF form ที่มี config[0] = item ที่ส่งเข้ามา */
function Harness({
  editing,
  item,
  label,
  options,
}: {
  readonly editing: boolean;
  readonly item: BusinessUnitConfigItem;
  readonly label?: string;
  readonly options?: readonly { value: string; label: string }[];
}) {
  const form = useForm<BusinessSettingFormValues>({
    defaultValues: { config: [item] },
  });
  return (
    <ConfigField
      editing={editing}
      form={form}
      index={0}
      item={item}
      yesLabel="Yes"
      noLabel="No"
      label={label}
      options={options}
    />
  );
}

describe("ConfigField", () => {
  it("view: renders the label override instead of item.label", () => {
    render(
      <Harness
        editing={false}
        item={boolItem}
        label="อนุญาตให้เลือก product ซ้ำกันได้"
      />,
    );
    expect(
      screen.getByText("อนุญาตให้เลือก product ซ้ำกันได้"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Allow selecting duplicate products"),
    ).not.toBeInTheDocument();
    // value "true" → yesLabel
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("edit: boolean item renders a Switch", () => {
    render(<Harness editing item={boolItem} label="X" />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("falls back to item.label when no override is given", () => {
    render(<Harness editing={false} item={boolItem} />);
    expect(
      screen.getByText("Allow selecting duplicate products"),
    ).toBeInTheDocument();
  });

  it("edit: non-boolean item renders a text input under the label override", () => {
    render(<Harness editing item={textItem} label="ข้อความ" />);
    // label override shows on the text branch too
    expect(screen.getByText("ข้อความ")).toBeInTheDocument();
    expect(screen.queryByText("Some text setting")).not.toBeInTheDocument();
    // text branch renders an <input> bound to the config value (not a switch)
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("hello");
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});

describe("ConfigField — enum", () => {
  it("view: shows the label of the current value (not the raw value)", () => {
    render(<Harness editing={false} item={enumItem} options={enumOptions} />);
    expect(screen.getByText("Last cost")).toBeInTheDocument();
    expect(screen.queryByText("last_cost")).not.toBeInTheDocument();
  });

  it("edit: renders a Select (combobox), not a text input", () => {
    render(<Harness editing item={enumItem} options={enumOptions} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("enum without options falls back to a text input", () => {
    render(<Harness editing item={enumItem} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
