
import { useState } from "react";
import { Database, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import {
  useSqlQueryExecute,
  useSqlQuerySave,
  useSqlQueryDrop,
  useDbObjectDefinition,
  useDbObjects,
} from "@/hooks/use-sql-query";
import { SqlEditor } from "./sql-editor";
import { ResultPanel } from "./result-panel";
import { DbObjectTree } from "./db-object-tree";
import { validateSqlSafety } from "@/lib/sql-validator";

const QUERY_TYPES = [
  { value: "view", label: "View" },
  { value: "stored_procedure", label: "Stored Procedure" },
  { value: "function", label: "Function" },
];

type LoadedObject = {
  type: "view" | "procedure" | "function";
  schema: string;
  name: string;
} | null;

export default function QueryDatasetComponent() {
  const [formName, setFormName] = useState("");
  const [formSqlText, setFormSqlText] = useState("");
  const [formQueryType, setFormQueryType] = useState<
    "view" | "stored_procedure" | "function"
  >("view");
  const [loadedObject, setLoadedObject] = useState<LoadedObject>(null);
  const [loadingObjectKey, setLoadingObjectKey] = useState<string | null>(null);

  const executeMutation = useSqlQueryExecute();
  const saveMutation = useSqlQuerySave();
  const dropMutation = useSqlQueryDrop();
  const definitionMutation = useDbObjectDefinition();
  const { data: dbObjects } = useDbObjects();

  const isSaving = saveMutation.isPending;
  const isDropping = dropMutation.isPending;

  const handleRun = (sqlToRun: string) => {
    try {
      validateSqlSafety(sqlToRun, {
        allowedLeading: [
          "SELECT",
          "WITH",
          "SHOW",
          "EXPLAIN",
          "DESCRIBE",
          "DESC",
        ],
        allowMultiple: false,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid SQL");
      return;
    }
    executeMutation.mutate(sqlToRun);
  };

  const handleNew = () => {
    setFormName("");
    setFormSqlText("");
    setFormQueryType("view");
    setLoadedObject(null);
    executeMutation.reset();
  };

  const handlePickDbObject = async (obj: {
    type: "view" | "procedure" | "function";
    schema: string;
    name: string;
  }) => {
    const key = `${obj.type}:${obj.schema}.${obj.name}`;
    setLoadingObjectKey(key);
    try {
      const def = await definitionMutation.mutateAsync(obj);
      setLoadedObject(obj);
      setFormName(def.name);
      setFormSqlText(def.definition);
      setFormQueryType(
        def.type === "view"
          ? "view"
          : def.type === "procedure"
            ? "stored_procedure"
            : "function",
      );
      executeMutation.reset();
      toast.success(`Loaded ${def.type}: ${def.schema}.${def.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load definition");
    } finally {
      setLoadingObjectKey(null);
    }
  };

  const handleSave = async () => {
    if (!formSqlText.trim()) {
      toast.error("Please enter SQL");
      return;
    }
    if (formQueryType === "view" && !formName.trim()) {
      // Allow if SQL already starts with CREATE VIEW; otherwise require name
      const stripped = formSqlText.trimStart();
      const isCreate =
        /^create\s+(or\s+replace\s+)?(temp(orary)?\s+)?(materialized\s+)?view\b/i.test(
          stripped,
        );
      if (!isCreate) {
        toast.error("Please enter a name for the view");
        return;
      }
    }

    // Validate no DROP/TRUNCATE/etc.
    const stripped = formSqlText.trimStart();
    const startsWithCreate =
      /^create\s+(or\s+replace\s+)?(temp(orary)?\s+)?(materialized\s+)?(view|procedure|function)\b/i.test(
        stripped,
      );
    try {
      if (startsWithCreate) {
        validateSqlSafety(formSqlText, {
          allowedLeading: ["CREATE"],
          allowMultiple: true,
        });
      } else {
        validateSqlSafety(formSqlText, {
          allowedLeading: ["SELECT", "WITH"],
          allowMultiple: false,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid SQL", {
        duration: 8000,
      });
      return;
    }

    try {
      const result = await saveMutation.mutateAsync({
        name: formName || undefined,
        sql_text: formSqlText,
        query_type: formQueryType,
      });
      toast.success(
        `${formQueryType === "view" ? "View" : formQueryType === "function" ? "Function" : "Stored procedure"} "${result.name || "(unnamed)"}" saved to schema "${result.schema}"`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      toast.error(msg, { duration: 8000 });
    }
  };

  const handleDrop = async () => {
    if (!loadedObject) return;
    if (
      !confirm(
        `Drop ${loadedObject.type} "${loadedObject.schema}.${loadedObject.name}"? This cannot be undone.`,
      )
    )
      return;
    try {
      await dropMutation.mutateAsync(loadedObject);
      toast.success(`Dropped ${loadedObject.type}: ${loadedObject.name}`);
      handleNew();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to drop");
    }
  };

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ModuleTileIcon />
            <h1 className="text-lg font-semibold">SQL Workbench</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Run queries · create views, stored procedures and functions in your
            tenant database
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loadedObject && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={handleDrop}
              disabled={isDropping}
            >
              {isDropping ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1 size-4" />
              )}
              Drop
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Save className="mr-1 size-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Sidebar + Main */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-lg border lg:max-h-[calc(100vh-180px)] lg:overflow-hidden">
          <DbObjectTree
            onSelect={handlePickDbObject}
            loadingKey={loadingObjectKey}
          />
        </aside>

        <div className="space-y-4">
          {/* Form fields */}
          <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="qd-object-name"
                className="mb-1 block text-xs font-semibold"
              >
                Object Name
              </label>
              <Input
                id="qd-object-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. v_pr_summary"
              />
            </div>
            <div>
              <label
                id="qd-type-label"
                className="mb-1 block text-xs font-semibold"
              >
                Type
              </label>
              <Select
                aria-labelledby="qd-type-label"
                value={formQueryType}
                onValueChange={(v) =>
                  setFormQueryType(
                    v as "view" | "stored_procedure" | "function",
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUERY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col justify-end">
              {loadedObject && (
                <p className="text-muted-foreground truncate text-xs">
                  Editing:{" "}
                  <span className="text-foreground">
                    {loadedObject.schema}.{loadedObject.name}
                  </span>{" "}
                  ({loadedObject.type})
                </p>
              )}
            </div>
          </div>

          {/* SQL Editor */}
          <div className="rounded-lg border">
            <div className="flex items-center gap-2 border-b px-4 py-2">
              <Database className="text-muted-foreground size-4" />
              <span className="text-sm font-semibold">SQL Editor</span>
              <span className="text-muted-foreground ml-auto text-[10px]">
                Tip: bare <code>SELECT</code> for view is auto-wrapped with{" "}
                <code>CREATE OR REPLACE VIEW</code>
              </span>
            </div>
            <SqlEditor
              value={formSqlText}
              onChange={setFormSqlText}
              onRun={handleRun}
              isRunning={executeMutation.isPending}
              schema={dbObjects}
            />
          </div>

          {/* Result panel */}
          {(executeMutation.isPending ||
            executeMutation.data ||
            executeMutation.error) && (
            <ResultPanel
              result={executeMutation.data ?? null}
              error={
                executeMutation.error ? executeMutation.error.message : null
              }
              isRunning={executeMutation.isPending}
              onClose={() => executeMutation.reset()}
            />
          )}
        </div>
      </div>
    </div>
  );
}
