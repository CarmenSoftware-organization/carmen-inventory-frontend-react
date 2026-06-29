
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import Editor, { type OnMount, type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { format as sqlFormat } from "sql-formatter";
import {
  Wand2,
  Hash,
  WrapText,
  Search,
  Eraser,
  Play,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SchemaMeta {
  tables?: Array<{ name: string }>;
  views?: Array<{ name: string }>;
  procedures?: Array<{ name: string; kind?: string }>;
  columns?: Array<{ table: string; column: string; data_type: string }>;
}

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
  onRun?: (sqlToRun: string) => void;
  isRunning?: boolean;
  schema?: SchemaMeta;
}

const SQL_KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "INNER JOIN",
  "FULL JOIN",
  "ON",
  "AND",
  "OR",
  "NOT",
  "IN",
  "EXISTS",
  "BETWEEN",
  "LIKE",
  "IS NULL",
  "IS NOT NULL",
  "GROUP BY",
  "ORDER BY",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "UNION",
  "UNION ALL",
  "DISTINCT",
  "INSERT",
  "INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE",
  "CREATE",
  "TABLE",
  "VIEW",
  "INDEX",
  "ALTER",
  "DROP",
  "TRUNCATE",
  "WITH",
  "AS",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "ASC",
  "DESC",
  "NULL",
  "TRUE",
  "FALSE",
  "CAST",
  "COALESCE",
];

const SQL_FUNCTIONS = [
  "COUNT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "ROUND",
  "CEIL",
  "FLOOR",
  "ABS",
  "LENGTH",
  "LOWER",
  "UPPER",
  "TRIM",
  "CONCAT",
  "SUBSTRING",
  "REPLACE",
  "NOW",
  "CURRENT_DATE",
  "CURRENT_TIMESTAMP",
  "DATE",
  "TO_CHAR",
  "TO_DATE",
  "EXTRACT",
  "COALESCE",
  "NULLIF",
  "GREATEST",
  "LEAST",
];

const SQL_SNIPPETS: Array<{ label: string; insert: string; doc: string }> = [
  {
    label: "ssf",
    insert: "SELECT *\nFROM ${1:table}\nWHERE ${2:condition};",
    doc: "SELECT * FROM table WHERE ...",
  },
  {
    label: "sfw",
    insert: "SELECT ${1:columns}\nFROM ${2:table}\nWHERE ${3:condition};",
    doc: "SELECT cols FROM table WHERE",
  },
  {
    label: "ij",
    insert: "INNER JOIN ${1:table} ON ${2:a.id} = ${3:b.id}",
    doc: "INNER JOIN ON",
  },
  {
    label: "lj",
    insert: "LEFT JOIN ${1:table} ON ${2:a.id} = ${3:b.id}",
    doc: "LEFT JOIN ON",
  },
  { label: "gb", insert: "GROUP BY ${1:column}", doc: "GROUP BY" },
  {
    label: "ob",
    insert: "ORDER BY ${1:column} ${2|ASC,DESC|}",
    doc: "ORDER BY",
  },
  {
    label: "ins",
    insert: "INSERT INTO ${1:table} (${2:cols})\nVALUES (${3:values});",
    doc: "INSERT INTO",
  },
  {
    label: "upd",
    insert:
      "UPDATE ${1:table}\nSET ${2:col} = ${3:value}\nWHERE ${4:condition};",
    doc: "UPDATE SET WHERE",
  },
  {
    label: "cv",
    insert:
      "CREATE OR REPLACE VIEW ${1:view_name} AS\nSELECT ${2:cols}\nFROM ${3:table};",
    doc: "CREATE OR REPLACE VIEW",
  },
];

function findStatementAt(
  sql: string,
  offset: number,
): { start: number; end: number } {
  let start = 0;
  let end = sql.length;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inSingle) {
      if (ch === "'" && sql[i - 1] !== "\\") inSingle = false;
      continue;
    }
    if (inDouble) {
      if (ch === '"' && sql[i - 1] !== "\\") inDouble = false;
      continue;
    }
    if (ch === "-" && next === "-") {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === "'") inSingle = true;
    else if (ch === '"') inDouble = true;
    else if (ch === ";") {
      if (i < offset) start = i + 1;
      else {
        end = i + 1;
        break;
      }
    }
  }
  while (start < end && /\s/.test(sql[start] ?? "")) start++;
  return { start, end };
}

function countStatements(sql: string): number {
  let n = 0;
  let inS = false;
  let inD = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && !inD && sql[i - 1] !== "\\") inS = !inS;
    else if (ch === '"' && !inS && sql[i - 1] !== "\\") inD = !inD;
    else if (ch === ";" && !inS && !inD) n++;
  }
  if (sql.trim().length > 0 && !sql.trim().endsWith(";")) n++;
  return n;
}

export function SqlEditor({
  value,
  onChange,
  height = "400px",
  readOnly = false,
  onRun,
  isRunning = false,
  schema,
}: SqlEditorProps) {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(
    null,
  );
  const valueRef = useRef(value);
  const onRunRef = useRef(onRun);
  const schemaRef = useRef<SchemaMeta | undefined>(schema);

  useEffect(() => {
    schemaRef.current = schema;
  }, [schema]);

  const [wordWrap, setWordWrap] = useState(true);
  const [minimap, setMinimap] = useState(false);
  const [pos, setPos] = useState({ line: 1, col: 1 });
  const [selChars, setSelChars] = useState(0);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  const totalLines = value.split("\n").length;
  const stmtCount = countStatements(value);

  const updateActiveStatementDecoration = () => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco) return;
    const model = ed.getModel();
    if (!model) return;
    const sql = model.getValue();
    const sel = ed.getSelection();
    if (!sel) return;
    const offset = model.getOffsetAt(sel.getPosition());
    const { start, end } = findStatementAt(sql, offset);
    if (start >= end) {
      decorationsRef.current?.clear();
      return;
    }
    const startPos = model.getPositionAt(start);
    const endPos = model.getPositionAt(end);
    const range = new monaco.Range(
      startPos.lineNumber,
      startPos.column,
      endPos.lineNumber,
      endPos.column,
    );
    if (!decorationsRef.current) {
      decorationsRef.current = ed.createDecorationsCollection([]);
    }
    decorationsRef.current.set([
      {
        range,
        options: {
          isWholeLine: false,
          className: "sql-active-stmt",
          marginClassName: "sql-active-stmt-margin",
        },
      },
    ]);
  };

  const handleFormat = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const current = ed.getValue();
    try {
      const formatted = sqlFormat(current, {
        language: "postgresql",
        keywordCase: "upper",
        tabWidth: 2,
        useTabs: false,
        linesBetweenQueries: 2,
      });
      ed.setValue(formatted);
      onChange(formatted);
    } catch {
      // ignore format errors silently
    }
  };

  const handleRun = () => {
    const ed = editorRef.current;
    const cb = onRunRef.current;
    if (!ed || !cb) return;
    const model = ed.getModel();
    if (!model) return;
    const sel = ed.getSelection();
    const selectedText =
      sel && !sel.isEmpty() ? model.getValueInRange(sel) : "";
    if (selectedText.trim()) {
      cb(selectedText);
      return;
    }
    const sql = model.getValue();
    const offset = model.getOffsetAt(ed.getPosition()!);
    const { start, end } = findStatementAt(sql, offset);
    const stmt = sql.slice(start, end).trim().replace(/;\s*$/, "");
    if (stmt) cb(stmt);
  };

  const handleClear = () => {
    editorRef.current?.setValue("");
    onChange("");
  };

  const handleToggleComment = () => {
    editorRef.current?.trigger("toolbar", "editor.action.commentLine", null);
  };

  const handleFind = () => {
    editorRef.current?.trigger("toolbar", "actions.find", null);
  };

  const handleEditorMount: OnMount = (ed, monaco) => {
      editorRef.current = ed;
      monacoRef.current = monaco;

      monaco.languages.registerCompletionItemProvider("sql", {
        triggerCharacters: [" ", ".", "(", ","],
        provideCompletionItems: (
          model: import("monaco-editor").editor.ITextModel,
          position: import("monaco-editor").Position,
        ) => {
          const word = model.getWordUntilPosition(position);
          const range: import("monaco-editor").IRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const lineUpToCursor = model.getValueInRange({
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: 1,
            endColumn: position.column,
          });
          const dotMatch = lineUpToCursor.match(
            /([A-Za-z_][\w]*)\.\s*([A-Za-z_]\w*)?$/,
          );
          const sch = schemaRef.current;

          // After "<table>." → suggest only that table's columns
          if (dotMatch && sch?.columns) {
            const tableName = dotMatch[1];
            const cols = sch.columns.filter(
              (c) => c.table.toLowerCase() === tableName.toLowerCase(),
            );
            if (cols.length > 0) {
              return {
                suggestions: cols.map((c) => ({
                  label: c.column,
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText: c.column,
                  detail: c.data_type,
                  range,
                })),
              };
            }
          }

          const suggestions: import("monaco-editor").languages.CompletionItem[] =
            [
              ...SQL_KEYWORDS.map((kw) => ({
                label: kw,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: kw,
                range,
              })),
              ...SQL_FUNCTIONS.map((fn) => ({
                label: fn,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: `${fn}($0)`,
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              })),
              ...SQL_SNIPPETS.map((s) => ({
                label: s.label,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: s.insert,
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: s.doc,
                detail: "snippet",
                range,
              })),
            ];

          if (sch) {
            for (const t of sch.tables ?? []) {
              suggestions.push({
                label: t.name,
                kind: monaco.languages.CompletionItemKind.Class,
                insertText: t.name,
                detail: "table",
                sortText: `0_${t.name}`,
                range,
              });
            }
            for (const v of sch.views ?? []) {
              suggestions.push({
                label: v.name,
                kind: monaco.languages.CompletionItemKind.Interface,
                insertText: v.name,
                detail: "view",
                sortText: `1_${v.name}`,
                range,
              });
            }
            for (const p of sch.procedures ?? []) {
              suggestions.push({
                label: p.name,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: `${p.name}($0)`,
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: p.kind === "procedure" ? "procedure" : "function",
                sortText: `2_${p.name}`,
                range,
              });
            }
            // Distinct column names (across all tables) — for after a comma or in SELECT list
            const seenCols = new Set<string>();
            for (const c of sch.columns ?? []) {
              if (seenCols.has(c.column)) continue;
              seenCols.add(c.column);
              suggestions.push({
                label: c.column,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: c.column,
                detail: `column · ${c.data_type}`,
                sortText: `3_${c.column}`,
                range,
              });
            }
          }

          return { suggestions };
        },
      });

      ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
        handleRun(),
      );
      ed.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
        () => handleFormat(),
      );

      ed.onDidChangeCursorPosition((e) => {
        setPos({ line: e.position.lineNumber, col: e.position.column });
        updateActiveStatementDecoration();
      });
      ed.onDidChangeCursorSelection((e) => {
        const model = ed.getModel();
        if (!model) return;
        const text = model.getValueInRange(e.selection);
        setSelChars(text.length);
      });
      ed.onDidChangeModelContent(() => {
        updateActiveStatementDecoration();
      });
      updateActiveStatementDecoration();
  };

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
        {onRun && (
          <Button
            size="sm"
            variant="default"
            className="h-7"
            onClick={handleRun}
            disabled={isRunning || readOnly}
            title="Run (Ctrl+Enter)"
          >
            {isRunning ? (
              <Loader2 className="mr-1 size-3.5 animate-spin" />
            ) : (
              <Play className="mr-1 size-3.5" />
            )}
            Run
          </Button>
        )}
        <div className="bg-border mx-1 h-5 w-px" />
        <Button
          size="sm"
          variant="ghost"
          className="h-7"
          onClick={handleFormat}
          disabled={readOnly}
          title="Format (Ctrl+Shift+F)"
        >
          <Wand2 className="mr-1 size-3.5" />
          Format
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7"
          onClick={handleToggleComment}
          disabled={readOnly}
          title="Toggle comment (Ctrl+/)"
        >
          <Hash className="mr-1 size-3.5" />
          Comment
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7"
          onClick={handleFind}
          title="Find (Ctrl+F)"
        >
          <Search className="mr-1 size-3.5" />
          Find
        </Button>
        <div className="bg-border mx-1 h-5 w-px" />
        <Button
          size="sm"
          variant={wordWrap ? "secondary" : "ghost"}
          className="h-7"
          onClick={() => setWordWrap((v) => !v)}
          title="Toggle word wrap"
        >
          <WrapText className="mr-1 size-3.5" />
          Wrap
        </Button>
        <Button
          size="sm"
          variant={minimap ? "secondary" : "ghost"}
          className="h-7"
          onClick={() => setMinimap((v) => !v)}
          title="Toggle minimap"
        >
          Minimap
        </Button>
        <div className="ml-auto" />
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive h-7"
          onClick={handleClear}
          disabled={readOnly}
          title="Clear editor"
        >
          <Eraser className="mr-1 size-3.5" />
          Clear
        </Button>
      </div>

      {/* Editor */}
      <Editor
        height={height}
        defaultLanguage="sql"
        theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        onMount={handleEditorMount}
        options={{
          readOnly,
          minimap: { enabled: minimap },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: wordWrap ? "on" : "off",
          tabSize: 2,
          automaticLayout: true,
          suggestOnTriggerCharacters: true,
          quickSuggestions: { other: true, comments: false, strings: false },
          padding: { top: 8 },
          bracketPairColorization: { enabled: true },
          stickyScroll: { enabled: true },
          renderLineHighlight: "all",
          smoothScrolling: true,
        }}
      />

      {/* Status bar */}
      <div
        className={cn(
          "bg-muted/30 text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-1 text-[11px]",
        )}
      >
        <span>
          Ln <span className="text-foreground">{pos.line}</span>, Col{" "}
          <span className="text-foreground">{pos.col}</span>
        </span>
        <span>
          <span className="text-foreground">{totalLines}</span> lines
        </span>
        <span>
          <span className="text-foreground">{stmtCount}</span> statement
          {stmtCount === 1 ? "" : "s"}
        </span>
        {selChars > 0 && (
          <span>
            Selected <span className="text-foreground">{selChars}</span> char
            {selChars === 1 ? "" : "s"}
          </span>
        )}
        <span className="ml-auto">SQL · UTF-8</span>
      </div>

      {/* styled-jsx (Next-only) → plain global <style>; คลาสเหล่านี้ใช้กับ Monaco decoration (global อยู่แล้ว) */}
      <style>{`
        .sql-active-stmt {
          background: rgba(59, 130, 246, 0.08);
          border-left: 2px solid rgb(59, 130, 246);
        }
        .sql-active-stmt-margin {
          background: rgba(59, 130, 246, 0.4);
        }
      `}</style>
    </div>
  );
}
