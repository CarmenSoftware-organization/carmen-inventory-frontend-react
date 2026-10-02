import { useState, useMemo, useCallback } from "react";
import type { AccountGroupMaster } from "@/types/accounting-master";
import type { ChartOfAccount } from "@/types/chart-of-accounts";
import type { AccountGroupNode, GroupTreeLevel } from "./account-grouping-types";

interface UseAccountGroupingTreeProps {
  groups: AccountGroupMaster[];
  accounts: ChartOfAccount[];
  search?: string;
}

export function useAccountGroupingTree({
  groups,
  accounts,
  search = "",
}: UseAccountGroupingTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Helper to extract assigned group ID with robust fallbacks
  const getAssignedGroupId = useCallback(
    (acc: ChartOfAccount): string | undefined => {
      if (acc.account_group_id) return acc.account_group_id;
      if (acc.account_group?.id) return acc.account_group.id;
      if (acc.group_code) {
        const matched = groups.find((g) => g.code === acc.group_code);
        if (matched) return matched.id;
      }
      if (acc.grouping_path && acc.grouping_path.length > 0) {
        const leaf = acc.grouping_path[acc.grouping_path.length - 1];
        const matched = groups.find((g) => g.code === leaf.code);
        if (matched) return matched.id;
      }
      return undefined;
    },
    [groups],
  );

  // 1. Map assigned accounts to each group ID
  const accountsByGroupId = useMemo(() => {
    const map = new Map<string, ChartOfAccount[]>();
    for (const acc of accounts) {
      const gId = getAssignedGroupId(acc);
      if (gId) {
        const list = map.get(gId) ?? [];
        list.push(acc);
        map.set(gId, list);
      }
    }
    return map;
  }, [accounts, getAssignedGroupId]);

  // 2. Unassigned accounts pool
  const unassignedAccounts = useMemo(() => {
    return accounts.filter((acc) => !getAssignedGroupId(acc));
  }, [accounts, getAssignedGroupId]);

  // 3. Build Full Hierarchy Tree (Level 1 -> 2 -> 3 -> 4)
  const fullTree = useMemo(() => {
    const nodeMap = new Map<string, AccountGroupNode>();
    for (const g of groups) {
      nodeMap.set(g.id, {
        ...g,
        children: [],
        assignedAccounts: accountsByGroupId.get(g.id) ?? [],
      });
    }

    const roots: AccountGroupNode[] = [];
    for (const g of groups) {
      const node = nodeMap.get(g.id)!;
      if (g.parent_id && nodeMap.has(g.parent_id)) {
        const parent = nodeMap.get(g.parent_id)!;
        parent.children = parent.children ?? [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Sort nodes at each level by sort_order then code
    const sortNodes = (nodes: AccountGroupNode[]) => {
      nodes.sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.code.localeCompare(b.code),
      );
      for (const node of nodes) {
        if (node.children?.length) {
          sortNodes(node.children);
        }
      }
    };
    sortNodes(roots);

    return roots;
  }, [groups, accountsByGroupId]);

  // 4. Search Matching Logic
  const nodeMatches = useCallback((node: AccountGroupNode, q: string): boolean => {
    function checkMatch(n: AccountGroupNode, query: string): boolean {
      const matchSelf =
        n.code.toLowerCase().includes(query) ||
        n.name.toLowerCase().includes(query) ||
        (n.name_local?.toLowerCase().includes(query) ?? false);
      if (matchSelf) return true;

      const matchAccount = n.assignedAccounts?.some(
        (acc) =>
          acc.code.toLowerCase().includes(query) ||
          acc.description_1.toLowerCase().includes(query) ||
          (acc.description_2?.toLowerCase().includes(query) ?? false),
      );
      if (matchAccount) return true;

      return n.children?.some((child) => checkMatch(child, query)) ?? false;
    }

    return checkMatch(node, q.toLowerCase());
  }, []);

  // 5. Filtered Tree Data
  const filteredTree = useMemo(() => {
    if (!search.trim()) return fullTree;
    const filterNodes = (nodes: AccountGroupNode[]): AccountGroupNode[] => {
      const result: AccountGroupNode[] = [];
      for (const node of nodes) {
        if (nodeMatches(node, search)) {
          const matchingChildren = node.children ? filterNodes(node.children) : [];
          result.push({
            ...node,
            children: matchingChildren,
          });
        }
      }
      return result;
    };
    return filterNodes(fullTree);
  }, [fullTree, search, nodeMatches]);

  // 6. Expand all nodes matching search
  const searchExpanded = useMemo(() => {
    if (!search.trim()) return {};
    const res: Record<string, boolean> = {};
    const walk = (nodes: AccountGroupNode[]) => {
      for (const node of nodes) {
        res[node.id] = true;
        if (node.children?.length) walk(node.children);
      }
    };
    walk(filteredTree);
    return res;
  }, [filteredTree, search]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const expandAll = useCallback(() => {
    const next: Record<string, boolean> = {};
    const walk = (nodes: AccountGroupNode[]) => {
      for (const n of nodes) {
        next[n.id] = true;
        if (n.children?.length) walk(n.children);
      }
    };
    walk(fullTree);
    setExpanded(next);
  }, [fullTree]);

  const collapseAll = useCallback(() => {
    setExpanded({});
  }, []);

  // 7. Tree Hierarchy Helpers
  const findNodeById = useCallback(
    (id: string): AccountGroupNode | null => {
      const searchIn = (nodes: AccountGroupNode[]): AccountGroupNode | null => {
        for (const n of nodes) {
          if (n.id === id) return n;
          if (n.children?.length) {
            const found = searchIn(n.children);
            if (found) return found;
          }
        }
        return null;
      };
      return searchIn(fullTree);
    },
    [fullTree],
  );

  const getBreadcrumbs = useCallback(
    (targetNode: AccountGroupNode): AccountGroupNode[] => {
      const path: AccountGroupNode[] = [];
      let curr: AccountGroupNode | null = targetNode;
      const visited = new Set<string>();
      while (curr && !visited.has(curr.id)) {
        visited.add(curr.id);
        path.unshift(curr);
        curr = curr.parent_id ? findNodeById(curr.parent_id) : null;
      }
      return path;
    },
    [findNodeById],
  );

  // Check if targetParentId is a descendant of movingNode (Circular Guard BR-GRP-007)
  const isDescendant = useCallback(
    (movingNode: AccountGroupNode, targetId: string): boolean => {
      const checkDescendants = (node: AccountGroupNode): boolean => {
        if (!node.children || node.children.length === 0) return false;
        for (const child of node.children) {
          if (child.id === targetId) return true;
          if (checkDescendants(child)) return true;
        }
        return false;
      };
      return checkDescendants(movingNode);
    },
    [],
  );

  // Max depth of children under node (for Max 4 Levels check BR-GRP-001)
  const getMaxSubDepth = useCallback((node: AccountGroupNode): number => {
    function calcDepth(n: AccountGroupNode): number {
      if (!n.children || n.children.length === 0) return 0;
      return 1 + Math.max(...n.children.map(calcDepth));
    }
    return calcDepth(node);
  }, []);

  // Preceding parent options by level (BR-GRP-002: Level > 1 must have parent with level - 1)
  const getNodesByLevel = useCallback(
    (level: GroupTreeLevel): AccountGroupNode[] => {
      const list: AccountGroupNode[] = [];
      const collect = (nodes: AccountGroupNode[]) => {
        for (const n of nodes) {
          if (n.level === level) list.push(n);
          if (n.children?.length) collect(n.children);
        }
      };
      collect(fullTree);
      return list;
    },
    [fullTree],
  );

  // Stats Breakdown
  const stats = useMemo(() => {
    let l1 = 0;
    let l2 = 0;
    let l3 = 0;
    let l4 = 0;
    for (const g of groups) {
      if (g.level === 1) l1++;
      else if (g.level === 2) l2++;
      else if (g.level === 3) l3++;
      else if (g.level === 4) l4++;
    }
    const assignedCount = accounts.length - unassignedAccounts.length;
    return {
      total: groups.length,
      l1,
      l2,
      l3,
      l4,
      assignedCount,
      unassignedCount: unassignedAccounts.length,
    };
  }, [groups, accounts.length, unassignedAccounts.length]);

  return {
    fullTree,
    filteredTree,
    unassignedAccounts,
    expanded: search.trim() ? searchExpanded : expanded,
    toggleExpand,
    expandAll,
    collapseAll,
    findNodeById,
    getBreadcrumbs,
    isDescendant,
    getMaxSubDepth,
    getNodesByLevel,
    stats,
  };
}
