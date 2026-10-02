import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAccountGroupingTree } from "./use-account-grouping-tree";
import type { AccountGroupMaster } from "@/types/accounting-master";
import type { ChartOfAccount } from "@/types/chart-of-accounts";

const mockGroups: AccountGroupMaster[] = [
  {
    id: "g1",
    code: "1000",
    name: "Assets",
    name_local: "สินทรัพย์",
    category: "asset",
    level: 1,
    parent_id: null,
    sort_order: 1,
    is_active: true,
    account_count: 0,
    doc_version: 1,
  },
  {
    id: "g2",
    code: "1100",
    name: "Current Assets",
    name_local: "สินทรัพย์หมุนเวียน",
    category: "asset",
    level: 2,
    parent_id: "g1",
    sort_order: 1,
    is_active: true,
    account_count: 0,
    doc_version: 1,
  },
  {
    id: "g3",
    code: "1110",
    name: "Cash & Cash Equivalents",
    name_local: "เงินสดและรายการเทียบเท่าเงินสด",
    category: "asset",
    level: 3,
    parent_id: "g2",
    sort_order: 1,
    is_active: true,
    account_count: 0,
    doc_version: 1,
  },
  {
    id: "g4",
    code: "1111",
    name: "Petty Cash Group",
    name_local: "เงินสดย่อย",
    category: "asset",
    level: 4,
    parent_id: "g3",
    sort_order: 1,
    is_active: true,
    account_count: 0,
    doc_version: 1,
  },
  {
    id: "g5",
    code: "2000",
    name: "Liabilities",
    name_local: "หนี้สิน",
    category: "liability",
    level: 1,
    parent_id: null,
    sort_order: 2,
    is_active: true,
    account_count: 0,
    doc_version: 1,
  },
];

const mockAccounts: ChartOfAccount[] = [
  {
    id: "a1",
    code: "1111-001",
    description_1: "Petty Cash Front Desk",
    description_2: "เงินสดย่อยแผนกต้อนรับ",
    account_category: "asset",
    account_type: "posting",
    is_active: true,
    account_group_id: "g4",
  } as unknown as ChartOfAccount,
  {
    id: "a2",
    code: "1111-002",
    description_1: "Petty Cash F&B",
    description_2: "เงินสดย่อยแผนกอาหารและเครื่องดื่ม",
    account_category: "asset",
    account_type: "posting",
    is_active: true,
    account_group_id: "g4",
  } as unknown as ChartOfAccount,
  {
    id: "a3",
    code: "1119-001",
    description_1: "Unassigned Bank Account",
    account_category: "asset",
    account_type: "posting",
    is_active: true,
    account_group_id: null,
  } as unknown as ChartOfAccount,
];

describe("useAccountGroupingTree", () => {
  it("builds a 4-level hierarchy tree correctly with assigned accounts", () => {
    const { result } = renderHook(() =>
      useAccountGroupingTree({
        groups: mockGroups,
        accounts: mockAccounts,
        search: "",
      }),
    );

    const { fullTree, stats } = result.current;

    // Root nodes: Assets (g1) and Liabilities (g5)
    expect(fullTree).toHaveLength(2);
    expect(fullTree[0].id).toBe("g1");
    expect(fullTree[0].level).toBe(1);
    expect(fullTree[1].id).toBe("g5");
    expect(fullTree[1].level).toBe(1);

    // L2: Current Assets under Assets
    expect(fullTree[0]!.children).toHaveLength(1);
    const l2Node = fullTree[0]!.children![0]!;
    expect(l2Node.id).toBe("g2");
    expect(l2Node.level).toBe(2);

    // L3: Cash & Cash Equivalents
    expect(l2Node.children).toHaveLength(1);
    const l3Node = l2Node.children![0]!;
    expect(l3Node.id).toBe("g3");
    expect(l3Node.level).toBe(3);

    // L4: Petty Cash Group (Leaf)
    expect(l3Node.children).toHaveLength(1);
    const l4Node = l3Node.children![0]!;
    expect(l4Node.id).toBe("g4");
    expect(l4Node.level).toBe(4);
    expect(l4Node.children).toHaveLength(0);

    // Assigned accounts bound to L4
    expect(l4Node.assignedAccounts).toHaveLength(2);
    expect(l4Node.assignedAccounts![0]!.code).toBe("1111-001");
    expect(l4Node.assignedAccounts![1]!.code).toBe("1111-002");

    // Stats
    expect(stats.total).toBe(5);
    expect(stats.assignedCount).toBe(2);
    expect(stats.unassignedCount).toBe(1);
    expect(stats.l1).toBe(2);
    expect(stats.l2).toBe(1);
    expect(stats.l3).toBe(1);
    expect(stats.l4).toBe(1);
  });

  it("filters unassigned accounts pool correctly (BR-GRP-005)", () => {
    const { result } = renderHook(() =>
      useAccountGroupingTree({
        groups: mockGroups,
        accounts: mockAccounts,
        search: "",
      }),
    );

    const { unassignedAccounts } = result.current;
    expect(unassignedAccounts).toHaveLength(1);
    expect(unassignedAccounts[0].id).toBe("a3");
    expect(unassignedAccounts[0].code).toBe("1119-001");
  });

  it("calculates max sub-depth for BR-GRP-001 Max 4 Levels check", () => {
    const { result } = renderHook(() =>
      useAccountGroupingTree({
        groups: mockGroups,
        accounts: mockAccounts,
        search: "",
      }),
    );

    const { fullTree, getMaxSubDepth } = result.current;
    const g1 = fullTree[0]!; // L1 -> L2 -> L3 -> L4 (sub-depth = 3)
    const g2 = g1.children![0]!; // L2 -> L3 -> L4 (sub-depth = 2)
    const g3 = g2.children![0]!; // L3 -> L4 (sub-depth = 1)
    const g4 = g3.children![0]!; // L4 leaf (sub-depth = 0)

    expect(getMaxSubDepth(g1)).toBe(3);
    expect(getMaxSubDepth(g2)).toBe(2);
    expect(getMaxSubDepth(g3)).toBe(1);
    expect(getMaxSubDepth(g4)).toBe(0);
  });

  it("detects descendants correctly for circular hierarchy guard (BR-GRP-007)", () => {
    const { result } = renderHook(() =>
      useAccountGroupingTree({
        groups: mockGroups,
        accounts: mockAccounts,
        search: "",
      }),
    );

    const { fullTree, isDescendant } = result.current;
    const g1 = fullTree[0]!; // L1
    const g2 = g1.children![0]!; // L2

    // g2, g3, g4 are descendants of g1
    expect(isDescendant(g1, "g2")).toBe(true);
    expect(isDescendant(g1, "g3")).toBe(true);
    expect(isDescendant(g1, "g4")).toBe(true);

    // g5 is not descendant of g1
    expect(isDescendant(g1, "g5")).toBe(false);

    // g1 is not descendant of g2
    expect(isDescendant(g2, "g1")).toBe(false);
  });

  it("filters tree correctly when searching by code, group name, or assigned account", () => {
    // 1. Search by group code "1110"
    const { result: resGroup } = renderHook(() =>
      useAccountGroupingTree({
        groups: mockGroups,
        accounts: mockAccounts,
        search: "1110",
      }),
    );
    expect(resGroup.current.filteredTree).toHaveLength(1);
    expect(resGroup.current.filteredTree[0].id).toBe("g1");

    // 2. Search by Thai name "เงินสดย่อย"
    const { result: resTh } = renderHook(() =>
      useAccountGroupingTree({
        groups: mockGroups,
        accounts: mockAccounts,
        search: "เงินสดย่อย",
      }),
    );
    expect(resTh.current.filteredTree).toHaveLength(1);

    // 3. Search by assigned account code "1111-001"
    const { result: resAcc } = renderHook(() =>
      useAccountGroupingTree({
        groups: mockGroups,
        accounts: mockAccounts,
        search: "1111-001",
      }),
    );
    expect(resAcc.current.filteredTree).toHaveLength(1);
    expect(resAcc.current.filteredTree[0].id).toBe("g1");

    // 4. Search not found
    const { result: resNone } = renderHook(() =>
      useAccountGroupingTree({
        groups: mockGroups,
        accounts: mockAccounts,
        search: "XYZ9999",
      }),
    );
    expect(resNone.current.filteredTree).toHaveLength(0);
  });

  it("supports expand, collapse, and selection state toggling", () => {
    const { result } = renderHook(() =>
      useAccountGroupingTree({
        groups: mockGroups,
        accounts: mockAccounts,
        search: "",
      }),
    );

    // Initial: none expanded
    expect(Boolean(result.current.expanded["g1"])).toBe(false);

    // Toggle expand g1
    act(() => {
      result.current.toggleExpand("g1");
    });
    expect(result.current.expanded["g1"]).toBe(true);

    // Expand all
    act(() => {
      result.current.expandAll();
    });
    expect(result.current.expanded["g1"]).toBe(true);
    expect(result.current.expanded["g2"]).toBe(true);
    expect(result.current.expanded["g3"]).toBe(true);

    // Collapse all
    act(() => {
      result.current.collapseAll();
    });
    expect(Object.keys(result.current.expanded).length).toBe(0);

    // Verify findNodeById and getBreadcrumbs
    const g3 = result.current.findNodeById("g3");
    expect(g3).toBeDefined();
    expect(g3?.code).toBe("1110");
    const crumbs = result.current.getBreadcrumbs(g3!);
    expect(crumbs.map((b) => b.id)).toEqual(["g1", "g2", "g3"]);
  });
});
