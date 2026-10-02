import {
  ChevronRight,
  Folder,
  FolderOpen,
  Plus,
  MoveRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AccountGroupNode } from "./account-grouping-types";

interface AccountGroupTreeNodeProps {
  readonly node: AccountGroupNode;
  readonly level?: number;
  readonly selectedNodeId?: string | null;
  readonly expanded: Record<string, boolean>;
  readonly toggleExpand: (id: string) => void;
  readonly onSelect: (node: AccountGroupNode) => void;
  readonly onAddSubGroup: (node: AccountGroupNode) => void;
  readonly onMoveGroup: (node: AccountGroupNode) => void;
  readonly onEditGroup: (node: AccountGroupNode) => void;
  readonly onDeleteGroup: (node: AccountGroupNode) => void;
  readonly search?: string;
  readonly readOnly?: boolean;
}

const LEVEL_BADGE_STYLES: Record<number, string> = {
  1: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  2: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  3: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  4: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
};

export function AccountGroupTreeNode({
  node,
  level = 0,
  selectedNodeId,
  expanded,
  toggleExpand,
  onSelect,
  onAddSubGroup,
  onMoveGroup,
  onEditGroup,
  onDeleteGroup,
  search = "",
  readOnly = false,
}: AccountGroupTreeNodeProps) {
  const t = useTranslations("config.accountGrouping");
  const isSelected = selectedNodeId === node.id;
  const isExpanded = expanded[node.id] ?? false;
  const hasChildren = !!node.children?.length;
  const assignedCount = node.assignedAccounts?.length ?? node.account_count ?? 0;

  const highlight = (text: string) => {
    if (!search.trim() || !text) return text;
    const escaped = search.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    if (parts.length === 1) return text;
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-amber-200 dark:bg-amber-900/60 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  return (
    <div className="select-none">
      {/* Node Row */}
      <div
        onClick={() => onSelect(node)}
        className={cn(
          "group/node flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors cursor-pointer border",
          isSelected
            ? "bg-primary/10 border-primary text-primary font-medium"
            : "border-transparent hover:bg-secondary/60 hover:border-border/60 text-foreground",
        )}
        style={{ paddingLeft: `${level * 18 + 6}px` }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Expand/Collapse Toggle */}
          <button
            type="button"
            className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-muted text-muted-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleExpand(node.id);
            }}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {hasChildren ? (
              <ChevronRight
                className={cn(
                  "size-3.5 transition-transform duration-150",
                  isExpanded && "rotate-90",
                )}
              />
            ) : (
              <span className="size-3.5" />
            )}
          </button>

          {/* Folder Icon */}
          {isExpanded ? (
            <FolderOpen className="size-4 shrink-0 text-amber-500" />
          ) : (
            <Folder className="size-4 shrink-0 text-amber-500" />
          )}

          {/* Level Badge */}
          <span
            className={cn(
              "px-1.5 py-0.2 rounded text-micro-legal font-mono font-semibold border",
              LEVEL_BADGE_STYLES[node.level] ?? LEVEL_BADGE_STYLES[1],
            )}
          >
            L{node.level}
          </span>

          {/* Code */}
          <span className="font-mono font-bold shrink-0">{highlight(node.code)}</span>

          {/* Name */}
          <span className="truncate">{highlight(node.name)}</span>
        </div>

        {/* Right side: Accounts badge & Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {assignedCount > 0 && (
            <Badge
              variant="secondary"
              size="sm"
              className="text-micro-legal font-mono px-1.5 py-0 font-normal bg-secondary text-secondary-foreground"
            >
              {assignedCount} Accs
            </Badge>
          )}

          {!readOnly && (
            <div
              className={cn(
                "items-center gap-0.5 transition-opacity",
                isSelected ? "flex opacity-100" : "hidden group-hover/node:flex opacity-90",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {node.level < 4 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="size-6 p-0 text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => onAddSubGroup(node)}
                  title={t("addSubGroup")}
                  aria-label={t("addSubGroup")}
                >
                  <Plus className="size-3.5" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="size-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => onMoveGroup(node)}
                title={t("moveGroup")}
                aria-label={t("moveGroup")}
              >
                <MoveRight className="size-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="size-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => onEditGroup(node)}
                title={t("editGroup")}
                aria-label={t("editGroup")}
              >
                <Pencil className="size-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="size-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDeleteGroup(node)}
                title={t("deleteGroup")}
                aria-label={t("deleteGroup")}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Children Nodes */}
      {hasChildren && isExpanded && (
        <div className="space-y-0.5 mt-0.5">
          {node.children!.map((child) => (
            <AccountGroupTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedNodeId={selectedNodeId}
              expanded={expanded}
              toggleExpand={toggleExpand}
              onSelect={onSelect}
              onAddSubGroup={onAddSubGroup}
              onMoveGroup={onMoveGroup}
              onEditGroup={onEditGroup}
              onDeleteGroup={onDeleteGroup}
              search={search}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}
