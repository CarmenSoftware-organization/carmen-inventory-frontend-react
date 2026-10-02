import {
  FolderTree,
  ChevronRight,
  Plus,
  MoveRight,
  Pencil,
  Trash2,
  Unlink,
  Link,
  Layers,
  AlertCircle,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AccountGroupNode } from "./account-grouping-types";
import type { ChartOfAccount } from "@/types/chart-of-accounts";

interface AccountGroupDetailPanelProps {
  readonly selectedNode: AccountGroupNode | null;
  readonly breadcrumbs: AccountGroupNode[];
  readonly onAddSubGroup: (node: AccountGroupNode) => void;
  readonly onMoveGroup: (node: AccountGroupNode) => void;
  readonly onEditGroup: (node: AccountGroupNode) => void;
  readonly onDeleteGroup: (node: AccountGroupNode) => void;
  readonly onOpenAssignDialog: () => void;
  readonly onUnassignAccount: (account: ChartOfAccount) => void;
  readonly readOnly?: boolean;
}

const LEVEL_COLOR_MAP: Record<number, string> = {
  1: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  2: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  3: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  4: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
};

export function AccountGroupDetailPanel({
  selectedNode,
  breadcrumbs,
  onAddSubGroup,
  onMoveGroup,
  onEditGroup,
  onDeleteGroup,
  onOpenAssignDialog,
  onUnassignAccount,
  readOnly = false,
}: AccountGroupDetailPanelProps) {
  const t = useTranslations("config.accountGrouping");

  if (!selectedNode) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <FolderTree className="size-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">{t("noGroupSelected")}</p>
      </div>
    );
  }

  const hasChildren = Boolean(selectedNode.children && selectedNode.children.length > 0);
  const assignedList = selectedNode.assignedAccounts ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Panel Header */}
      <div className="flex h-11 items-center justify-between border-b px-4 bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${
              LEVEL_COLOR_MAP[selectedNode.level] ?? LEVEL_COLOR_MAP[1]
            }`}
          >
            L{selectedNode.level} Group
          </span>
          <span className="font-mono font-bold text-foreground text-sm truncate">
            {selectedNode.code}
          </span>
        </div>

        {/* Quick Toolbar */}
        {!readOnly && (
          <div className="flex items-center gap-1.5 shrink-0">
            {selectedNode.level < 4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => onAddSubGroup(selectedNode)}
              >
                <Plus className="size-3.5" />
                <span>{t("addSubGroup")}</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => onMoveGroup(selectedNode)}
            >
              <MoveRight className="size-3.5" />
              <span>{t("moveGroup")}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => onEditGroup(selectedNode)}
              title={t("editGroup")}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDeleteGroup(selectedNode)}
              title={t("deleteGroup")}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-4 space-y-4">
        {/* Node Information Card */}
        <div className="rounded-lg border bg-secondary/20 p-3.5 space-y-2.5">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-medium">Group Name</div>
            <div className="text-sm font-bold text-foreground">{selectedNode.name}</div>
            {selectedNode.name_local && (
              <div className="text-xs text-muted-foreground">{selectedNode.name_local}</div>
            )}
          </div>

          {/* Breadcrumb Hierarchy */}
          {breadcrumbs.length > 0 && (
            <div className="pt-2 border-t border-border/60">
              <div className="text-micro text-muted-foreground mb-1">Hierarchy Path:</div>
              <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
                {breadcrumbs.map((b, idx) => (
                  <span key={b.id} className="inline-flex items-center gap-1">
                    <span className="rounded bg-card border border-border px-1.5 py-0.5 font-semibold text-foreground">
                      L{b.level}:{b.code}
                    </span>
                    {idx < breadcrumbs.length - 1 && (
                      <ChevronRight className="size-3 text-muted-foreground/60" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Counts */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs text-muted-foreground">
            <span>
              Child Groups: <strong className="text-foreground">{selectedNode.children?.length ?? 0}</strong>
            </span>
            <span>
              Assigned Accounts: <strong className="text-foreground">{assignedList.length}</strong>
            </span>
          </div>
        </div>

        {/* Assigned Accounts Section */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="size-3.5 text-primary" />
              <span>
                {t("assignedAccounts")} ({assignedList.length})
              </span>
            </h3>

            {!readOnly && (
              <Button
                type="button"
                size="sm"
                variant={hasChildren ? "outline" : "default"}
                disabled={hasChildren}
                onClick={onOpenAssignDialog}
                className="gap-1.5"
              >
                <Link className="size-3.5" />
                <span>{t("assignAccount")}</span>
              </Button>
            )}
          </div>

          {/* Leaf-only notice if has children */}
          {hasChildren && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="size-4 shrink-0" />
              <span>{t("leafOnlyNotice")}</span>
            </div>
          )}

          {/* Accounts Table Container */}
          <div className="rounded-lg border bg-card overflow-hidden">
            {assignedList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-muted/40 text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Account Name</th>
                      <th className="px-3 py-2">Type</th>
                      {!readOnly && <th className="px-3 py-2 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {assignedList.map((acc) => (
                      <tr key={acc.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 font-mono font-bold text-primary">
                          {acc.code}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground truncate max-w-[180px]">
                            {acc.description_1}
                          </div>
                          {acc.description_2 && (
                            <div className="text-micro text-muted-foreground truncate max-w-[180px]">
                              {acc.description_2}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">
                          {acc.type}
                        </td>
                        {!readOnly && (
                          <td className="px-3 py-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => onUnassignAccount(acc)}
                              className="h-6 px-2 text-micro-legal text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                              title={t("unassign")}
                            >
                              <Unlink className="size-3" />
                              <span>{t("unassign")}</span>
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                <p>{hasChildren ? t("leafOnlyNotice") : t("noAssignedAccounts")}</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
