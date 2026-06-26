
import { useState } from "react";
import { ChevronRight, Search, Folder, Box, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

interface TreeNode {
  id: string;
  name: string;
  type: "category" | "sub_category" | "item_group" | "product";
  children: TreeNode[];
}

const buildTree = (products: Product[]): TreeNode[] => {
  const categoryMap = new Map<string, TreeNode>();

  for (const p of products) {
    const catId = p.product_category?.id ?? "uncategorized";
    const catName = p.product_category?.name ?? "Uncategorized";
    const subCatId = p.product_sub_category?.id ?? "uncategorized";
    const subCatName = p.product_sub_category?.name ?? "Uncategorized";
    const groupId = p.product_item_group?.id ?? "uncategorized";
    const groupName = p.product_item_group?.name ?? "Uncategorized";

    // Path-qualify sub-category / item-group node ids so the shared
    // "uncategorized" fallback does not collide across parents (two different
    // categories each with an Uncategorized sub-category must stay distinct).
    const subCatNodeId = `${catId}/${subCatId}`;
    const groupNodeId = `${catId}/${subCatId}/${groupId}`;

    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, {
        id: catId,
        name: catName,
        type: "category",
        children: [],
      });
    }
    const catNode = categoryMap.get(catId)!;

    let subCatNode = catNode.children.find((c) => c.id === subCatNodeId);
    if (!subCatNode) {
      subCatNode = {
        id: subCatNodeId,
        name: subCatName,
        type: "sub_category",
        children: [],
      };
      catNode.children.push(subCatNode);
    }

    let groupNode = subCatNode.children.find((c) => c.id === groupNodeId);
    if (!groupNode) {
      groupNode = {
        id: groupNodeId,
        name: groupName,
        type: "item_group",
        children: [],
      };
      subCatNode.children.push(groupNode);
    }

    groupNode.children.push({
      id: p.id,
      name: `${p.code} — ${p.name}`,
      type: "product",
      children: [],
    });
  }

  return Array.from(categoryMap.values());
};

const filterTree = (nodes: TreeNode[], query: string): TreeNode[] => {
  if (!query) return nodes;
  const q = query.toLowerCase();

  return nodes
    .map((node) => {
      if (node.type === "product") {
        return node.name.toLowerCase().includes(q) ? node : null;
      }
      const filteredChildren = filterTree(node.children, query);
      if (filteredChildren.length === 0) return null;
      return { ...node, children: filteredChildren };
    })
    .filter(Boolean) as TreeNode[];
};

export interface TreeProductLookupProps {
  products: Product[];
  selectedProductIds: Set<string>;
  onSelectionChange: (productIds: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function TreeProductLookup({
  products,
  selectedProductIds,
  onSelectionChange,
  disabled = false,
  loading = false,
}: TreeProductLookupProps) {
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const tree = buildTree(products);
    const ids = new Set<string>();
    for (const cat of tree) {
      ids.add(cat.id);
      for (const sub of cat.children) {
        ids.add(sub.id);
      }
    }
    return ids;
  });

  const tree = buildTree(products);
  const filteredTree = filterTree(tree, search);
  const totalProducts = products.length;

  const leafIdsMap = (() => {
    const map = new Map<string, string[]>();
    function compute(node: TreeNode): string[] {
      if (node.type === "product") {
        map.set(node.id, [node.id]);
        return [node.id];
      }
      const ids = node.children.flatMap(compute);
      map.set(node.id, ids);
      return ids;
    }
    for (const cat of tree) compute(cat);
    return map;
  })();

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleProduct = (productId: string) => {
    if (disabled) return;
    const next = new Set(selectedProductIds);
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
    }
    onSelectionChange(Array.from(next));
  };

  const toggleGroup = (node: TreeNode) => {
    if (disabled) return;
    const leafIds = leafIdsMap.get(node.id) ?? [];
    const allSelected = leafIds.every((id) => selectedProductIds.has(id));
    const next = new Set(selectedProductIds);

    if (allSelected) {
      for (const id of leafIds) next.delete(id);
    } else {
      for (const id of leafIds) next.add(id);
    }
    onSelectionChange(Array.from(next));
  };

  const getCheckState = (node: TreeNode): boolean | "indeterminate" => {
    const leafIds = leafIdsMap.get(node.id) ?? [];
    const selectedCount = leafIds.filter((id) =>
      selectedProductIds.has(id),
    ).length;
    if (selectedCount === 0) return false;
    if (selectedCount === leafIds.length) return true;
    return "indeterminate";
  };

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      {/* Header — matches DataGrid style */}
      <div className="bg-muted/40 flex h-9 items-center gap-2 border-b px-3">
        <span className="text-xs font-semibold">Product Catalog</span>
        <span className="bg-muted text-muted-foreground ml-auto inline-flex h-4.5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-semibold tabular-nums">
          {selectedProductIds.size}/{totalProducts}
        </span>
      </div>

      {/* Search toolbar */}
      <div className="bg-background border-b px-2 py-1.5">
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-2 size-3 -translate-y-1/2" />
          <Input
            placeholder="Search by code or name..."
            className="h-7 pl-7 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Tree content */}
      <ScrollArea className="h-80">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <span className="text-muted-foreground text-xs">Loading...</span>
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <span className="text-muted-foreground text-xs">
              {search
                ? "No products match your search."
                : "No products available."}
            </span>
          </div>
        ) : (
          <div className="py-0.5">
            {filteredTree.map((catNode) => (
              <TreeNodeRow
                key={catNode.id}
                node={catNode}
                depth={0}
                expandedIds={expandedIds}
                forceExpand={!!search}
                onToggleExpand={toggleExpand}
                onToggleProduct={toggleProduct}
                onToggleGroup={toggleGroup}
                getCheckState={getCheckState}
                selectedProductIds={selectedProductIds}
                disabled={disabled}
                leafIdsMap={leafIdsMap}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

const nodeIcons = {
  category: Folder,
  sub_category: Layers,
  item_group: Box,
} as const;

interface TreeNodeRowProps {
  readonly node: TreeNode;
  readonly depth: number;
  readonly expandedIds: Set<string>;
  readonly forceExpand: boolean;
  readonly onToggleExpand: (id: string) => void;
  readonly onToggleProduct: (productId: string) => void;
  readonly onToggleGroup: (node: TreeNode) => void;
  readonly getCheckState: (node: TreeNode) => boolean | "indeterminate";
  readonly selectedProductIds: Set<string>;
  readonly disabled: boolean;
  readonly leafIdsMap: Map<string, string[]>;
}

const TreeNodeRow = ({
  node,
  depth,
  expandedIds,
  forceExpand,
  onToggleExpand,
  onToggleProduct,
  onToggleGroup,
  getCheckState,
  selectedProductIds,
  disabled,
  leafIdsMap,
}: TreeNodeRowProps) => {
  const isExpanded = forceExpand || expandedIds.has(node.id);
  const isProduct = node.type === "product";
  const paddingLeft = depth * 20 + 8;

  if (isProduct) {
    return (
      <div
        className={cn(
          "border-border/50 hover:bg-muted/40 flex items-center gap-1.5 border-b py-1.5 transition-colors",
          selectedProductIds.has(node.id) && "bg-primary/5",
          disabled && "pointer-events-none opacity-50",
        )}
        style={{ paddingLeft: paddingLeft + 16 }}
      >
        <Checkbox
          checked={selectedProductIds.has(node.id)}
          onCheckedChange={() => onToggleProduct(node.id)}
          disabled={disabled}
        />
        <span className="text-xs">{node.name}</span>
      </div>
    );
  }

  const checkState = getCheckState(node);
  const Icon = nodeIcons[node.type as keyof typeof nodeIcons];
  const leafCount = leafIdsMap.get(node.id)?.length ?? 0;

  return (
    <>
      <div
        className={cn(
          "hover:bg-muted/40 flex items-center gap-1.5 py-1.5 transition-colors",
          depth === 0 && "bg-muted/20",
        )}
        style={{ paddingLeft }}
      >
        <button
          type="button"
          className="shrink-0 cursor-pointer"
          onClick={() => onToggleExpand(node.id)}
        >
          <ChevronRight
            className={cn(
              "text-muted-foreground size-3 transition-transform",
              isExpanded && "rotate-90",
            )}
          />
        </button>
        <Checkbox
          checked={checkState}
          onCheckedChange={() => onToggleGroup(node)}
          disabled={disabled}
        />
        {Icon && <Icon className="text-muted-foreground size-3 shrink-0" />}
        <button
          type="button"
          className="flex flex-1 cursor-pointer items-center gap-1.5 text-left"
          onClick={() => onToggleExpand(node.id)}
        >
          <span className="text-xs font-semibold">{node.name}</span>
          <span className="bg-muted text-muted-foreground inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-[9px] font-semibold tabular-nums">
            {leafCount}
          </span>
        </button>
      </div>
      {isExpanded &&
        node.children.map((child) => (
          <TreeNodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            expandedIds={expandedIds}
            forceExpand={forceExpand}
            onToggleExpand={onToggleExpand}
            onToggleProduct={onToggleProduct}
            onToggleGroup={onToggleGroup}
            getCheckState={getCheckState}
            selectedProductIds={selectedProductIds}
            disabled={disabled}
            leafIdsMap={leafIdsMap}
          />
        ))}
    </>
  );
};
