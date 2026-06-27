
import {
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Folder,
  FolderOpen,
  Layers,
  Box,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { NODE_TYPE, type CategoryNode } from "@/types/category";
import { Badge } from "@/components/ui/badge";

interface TreeNodeProps {
  readonly node: CategoryNode;
  readonly level?: number;
  readonly expanded: Record<string, boolean>;
  readonly toggleExpand: (id: string) => void;
  readonly onEdit: (node: CategoryNode) => void;
  readonly onAdd: (parentNode: CategoryNode) => void;
  readonly onDelete: (node: CategoryNode) => void;
  readonly search?: string;
}

/**
 * Component แสดงผล node ของต้นไม้หมวดหมู่แบบ recursive (เรียก TreeNode ซ้อนใน children)
 * รองรับ expand/collapse, ไฮไลต์คำค้นหา, icon ตาม node type และปุ่มจัดการ (add child, edit, delete)
 * ปุ่มจะถูกซ่อนและแสดงเฉพาะตอน hover บน row เพื่อลดสัญญาณรบกวนทางสายตา
 * @param props - node, level (ระดับชั้น), expanded, toggleExpand, onEdit, onAdd, onDelete และ search
 * @returns JSX ของ node พร้อม children (หากมีและถูก expand)
 * @example
 * <TreeNode
 *   node={categoryNode}
 *   expanded={{ [categoryNode.id]: true }}
 *   toggleExpand={(id) => toggle(id)}
 *   onEdit={(n) => openEdit(n)}
 *   onAdd={(parent) => openAdd(parent)}
 *   onDelete={(n) => setDeleteTarget(n)}
 *   search="milk"
 * />
 */
export function TreeNode({
  node,
  level = 0,
  expanded,
  toggleExpand,
  onEdit,
  onAdd,
  onDelete,
  search,
}: TreeNodeProps) {
  const t = useTranslations("productManagement.category");
  const tc = useTranslations("common");
  const ts = useTranslations("status");

  const isExpanded = expanded[node.id] ?? false;
  const hasChildren = !!node.children?.length;

  const highlight = (text: string): React.ReactNode => {
    if (!search || !text) return text;
    const escaped = search.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    if (parts.length === 1) return text;
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          className="bg-yellow-200/80 dark:bg-yellow-800/40 rounded-sm px-px"
        >
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  const iconCls = "h-3 w-3 text-muted-foreground/60 shrink-0";

  const getNodeIcon = () => {
    if (node.type === NODE_TYPE.ITEM_GROUP) return <Box className={iconCls} />;
    if (node.type === NODE_TYPE.SUBCATEGORY)
      return <Layers className={iconCls} />;
    if (isExpanded) return <FolderOpen className={iconCls} />;
    return <Folder className={iconCls} />;
  };

  return (
    <div className="select-none">
      {/* Tree line connector */}
      <div
        className={cn(
          "group/node flex items-center h-7 hover:bg-accent/50 transition-colors border-b border-transparent hover:border-border/30",
        )}
        style={{ paddingLeft: `${level * 20 + 4}px` }}
      >
        {/* Expand toggle */}
        <button
          type="button"
          className="flex items-center justify-center w-4 h-4 shrink-0"
          onClick={() => hasChildren && toggleExpand(node.id)}
        >
          {hasChildren ? (
            <ChevronRight
              className={cn(
                "h-3 w-3 cursor-pointer text-muted-foreground transition-transform duration-150",
                isExpanded && "rotate-90",
              )}
            />
          ) : (
            <span className="w-3" />
          )}
        </button>

        {/* Node icon */}
        <div className="flex items-center gap-1.5 ml-1 mr-1.5">
          {getNodeIcon()}
        </div>

        {/* Content - clickable for expand */}
        <button
          type="button"
          className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
          onClick={() => toggleExpand(node.id)}
        >
          <Badge variant={"secondary"} className="text-[0.625rem] h-5 shrink-0">
            {highlight(node.code)}
          </Badge>

          <span className="text-xs font-semibold truncate">
            {highlight(node.name)}
          </span>

          {node.description && (
            <span className="text-xs text-muted-foreground/60 truncate hidden xl:inline">
              — {highlight(node.description)}
            </span>
          )}
        </button>

        {/* Status indicator */}
        {!node.is_active && (
          <span className="text-[0.625rem] px-1 py-px rounded bg-red-50 text-red-500 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800 mr-1">
            {ts("inactive")}
          </span>
        )}

        {/* Actions - visible on hover */}
        <div className="hidden items-center group-hover/node:flex ml-auto pr-2">
          {node.type !== NODE_TYPE.ITEM_GROUP && (
            <button
              type="button"
              className="p-1 rounded hover:bg-primary/10 hover:text-primary transition-colors"
              onClick={() => onAdd(node)}
              title={t("addChild")}
              aria-label={t("addChild")}
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            className="p-1 rounded hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={() => onEdit(node)}
            title={tc("edit")}
            aria-label={tc("edit")}
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={() => onDelete(node)}
            title={tc("delete")}
            aria-label={tc("delete")}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {/* Vertical tree line */}
          <div
            className="absolute top-0 bottom-0 border-l border-border/40"
            style={{ left: `${level * 20 + 12}px` }}
          />
          {node.children?.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              expanded={expanded}
              toggleExpand={toggleExpand}
              onEdit={onEdit}
              onAdd={onAdd}
              onDelete={onDelete}
              search={search}
            />
          ))}
        </div>
      )}
    </div>
  );
}
