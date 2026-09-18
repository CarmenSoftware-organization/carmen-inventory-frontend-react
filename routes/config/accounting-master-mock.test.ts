import { describe, expect, it } from "vitest";
import {
  deleteAccountGroupState,
  saveAccountGroupState,
  saveTitleState,
  type AccountGroupMaster,
  type TitleMaster,
} from "./accounting-master-mock";

const title: TitleMaster = {
  id: "title-dr",
  code: "DR",
  description: "Dr.",
  is_active: true,
  is_system: false,
  reference_count: 2,
};
const root: AccountGroupMaster = {
  id: "assets",
  code: "1000",
  name: "Assets",
  level: 1,
  parent_id: null,
  is_active: true,
  account_count: 0,
};
const child: AccountGroupMaster = {
  id: "cash",
  code: "1100",
  name: "Cash",
  level: 2,
  parent_id: root.id,
  is_active: true,
  account_count: 0,
};
const state = { titles: [title], accountGroups: [root, child] };

describe("accounting master mock guardrails", () => {
  it("keeps codes immutable and blocks invalid hierarchy changes", () => {
    const renamed = saveTitleState(
      state,
      { code: "CHANGED", description: "Doctor", is_active: true },
      title.id,
    );
    expect(renamed.titles[0]).toMatchObject({
      code: "DR",
      description: "Doctor",
    });

    const regrouped = saveAccountGroupState(
      state,
      { ...child, code: "CHANGED", name: "Cash and bank" },
      child.id,
    );
    expect(regrouped.accountGroups[1]).toMatchObject({
      code: "1100",
      name: "Cash and bank",
    });

    expect(() =>
      saveAccountGroupState(
        state,
        {
          code: child.code,
          name: child.name,
          level: 3,
          parent_id: root.id,
          is_active: true,
        },
        child.id,
      ),
    ).toThrow("Level 3 requires a level 2 parent.");
    expect(() => deleteAccountGroupState(state, root)).toThrow(
      "1000 still has child groups.",
    );
  });
});
