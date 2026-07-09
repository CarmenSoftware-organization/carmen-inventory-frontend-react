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

/** harness: RHF form ที่มี config[0] = item ที่ส่งเข้ามา */
function Harness({
  editing,
  item,
  label,
}: {
  readonly editing: boolean;
  readonly item: BusinessUnitConfigItem;
  readonly label?: string;
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
});
