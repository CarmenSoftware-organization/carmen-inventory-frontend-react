# SQL Workbench → carmen-platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the SQL Workbench page from `carmen-inventory-frontend-react` into `../carmen-platform`, adapted to platform conventions, gated by new `sql_workbench.*` permissions, with the source removed.

**Architecture:** In carmen-platform, a route-guarded page (`/sql-workbench`) lets a super-admin pick a business unit and run / save / drop SQL objects against that BU's tenant DB. Data flows through a plain axios service (no react-query) with component-level `useState`; the SQL editor is CodeMirror 6 (reusing the existing `XmlEditor` setup) instead of Monaco. Access is gated by `sql_workbench.read` (open + run) and `sql_workbench.manage` (save + drop).

**Tech Stack:** React 19, TypeScript (strict), Vite, react-router-dom v6, axios, shadcn/ui (Radix + CVA), CodeMirror 6, `sql-formatter`, sonner, lucide-react, Vitest + React Testing Library.

## Global Constraints

- **Two repos.** carmen-platform paths below are relative to `../carmen-platform/`. inventory-react paths (Task 10 only) are relative to this repo's root.
- **No path alias in carmen-platform** — use relative imports (`../../components/ui/button`), never `@/`.
- **No react-query in carmen-platform** — axios service + `useState`/`try-catch`/sonner toasts, mirroring `src/services/clusterService.ts` and existing pages.
- **Node 20.x; package manager: Bun** (`legacy-peer-deps=true` is set for npm fallback).
- **Backend path convention:** SQL endpoints live under the `/api` proxy at `/api/config/{buCode}/sql-query/...` (NOT `/api-system`). `buCode` = the BusinessUnit `code` field.
- **Permission keys (verbatim):** `sql_workbench.read`, `sql_workbench.manage`.
- **Commands:** `bun run build` (tsc + vite build), `bun run test` (Vitest one-shot). Both must be clean before a task is done.
- **UI primitive convention:** every `src/components/ui/*.tsx` has a co-located `*.test.tsx`.
- **Backend dependency (out of scope, tracked in spec §9):** the platform backend must seed `sql_workbench.read`/`sql_workbench.manage` into its permission catalog for production RBAC. This plan wires the frontend + dev mock only.

**Spec:** `docs/superpowers/specs/2026-07-09-sql-workbench-to-platform-design.md` (in this repo).

## File Structure

**carmen-platform (create unless noted):**
- `src/utils/sqlValidator.ts` — pure client-side SQL safety validator (copied verbatim).
- `src/utils/sqlValidator.test.ts` — validator unit tests.
- `src/types/index.ts` *(modify)* — add SQL DTO types.
- `src/services/sqlQueryService.ts` — axios calls: dbObjects / definition / execute / save / drop.
- `src/services/sqlQueryService.test.ts` — service unit tests (mock `./api`).
- `src/components/ui/select.tsx` — shadcn Select primitive (new Radix dependency).
- `src/components/ui/select.test.tsx` — Select render test.
- `src/pages/sqlWorkbench/sqlEditorHelpers.ts` — pure `countStatements` + `findStatementAt`.
- `src/pages/sqlWorkbench/sqlEditorHelpers.test.ts` — helper unit tests.
- `src/pages/sqlWorkbench/SqlEditor.tsx` — CodeMirror 6 SQL editor.
- `src/pages/sqlWorkbench/ResultPanel.tsx` — result table + CSV export (ported).
- `src/pages/sqlWorkbench/DbObjectTree.tsx` — db-object sidebar tree (ported, props-driven).
- `src/pages/sqlWorkbench/SqlWorkbench.tsx` — orchestrator page (BU selector, run/save/drop, permission gates).
- `src/pages/sqlWorkbench/SqlWorkbench.test.tsx` — page smoke test.
- `src/utils/permissions.ts` *(modify)* — add keys to `DEV_MOCK_EFFECTIVE_PERMISSIONS`.
- `src/App.tsx` *(modify)* — lazy import + guarded route.
- `src/components/Layout.tsx` *(modify)* — sidebar nav item.
- `package.json` *(modify)* — 3 new dependencies.

**inventory-react (Task 10, delete/modify):**
- Delete `routes/system-admin/query-dataset/` (5 files), `hooks/use-sql-query.ts`, `lib/sql-validator.ts`.
- Modify `routes/router.tsx`, `constant/module-list.ts`, `routes/system-admin/landing-types.ts`, `constant/api-endpoints.ts`.

---

## Task 1: Add dependencies + shadcn Select primitive

**Files:**
- Modify: `../carmen-platform/package.json`
- Create: `../carmen-platform/src/components/ui/select.tsx`
- Test: `../carmen-platform/src/components/ui/select.test.tsx`

**Interfaces:**
- Produces: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` from `../../components/ui/select` (Radix Select re-exports). `@codemirror/lang-sql`, `sql-formatter`, `@radix-ui/react-select` become resolvable.

- [ ] **Step 1: Install the three dependencies**

Run (in `../carmen-platform`):
```bash
bun add @codemirror/lang-sql @radix-ui/react-select sql-formatter
```
Expected: `package.json` gains the three entries; `bun.lock` updates.

- [ ] **Step 2: Create the Select primitive**

Create `../carmen-platform/src/components/ui/select.tsx`:
```tsx
import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        position === 'popper' && 'data-[side=bottom]:translate-y-1',
        className,
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem };
```

- [ ] **Step 3: Write the render test**

Create `../carmen-platform/src/components/ui/select.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './select';

describe('Select', () => {
  it('renders the trigger with a placeholder', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Alpha</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test**

Run (in `../carmen-platform`): `bun run test src/components/ui/select.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Verify build**

Run: `bun run build`
Expected: tsc + vite build succeed, no type errors.

- [ ] **Step 6: Commit**

```bash
cd ../carmen-platform
git add package.json bun.lock src/components/ui/select.tsx src/components/ui/select.test.tsx
git commit -m "feat(ui): add Select primitive + SQL editor deps"
```

---

## Task 2: SQL safety validator (pure, TDD)

**Files:**
- Create: `../carmen-platform/src/utils/sqlValidator.ts`
- Test: `../carmen-platform/src/utils/sqlValidator.test.ts`

**Interfaces:**
- Produces: `validateSqlSafety(sql: string, opts?: { allowedLeading?: string[]; allowMultiple?: boolean }): void` — throws `Error` on unsafe/mismatched SQL, returns `void` when safe. Also exports `interface SqlValidationOptions`.

- [ ] **Step 1: Write the failing tests**

Create `../carmen-platform/src/utils/sqlValidator.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { validateSqlSafety } from './sqlValidator';

describe('validateSqlSafety', () => {
  it('allows a SELECT when SELECT is in allowedLeading', () => {
    expect(() =>
      validateSqlSafety('SELECT 1', { allowedLeading: ['SELECT'] }),
    ).not.toThrow();
  });

  it('throws on empty SQL', () => {
    expect(() => validateSqlSafety('   ')).toThrow(/empty/i);
  });

  it('blocks a forbidden leading keyword (DROP)', () => {
    expect(() =>
      validateSqlSafety('DROP TABLE users', { allowedLeading: ['SELECT'] }),
    ).toThrow(/DROP/);
  });

  it('blocks a statement type not in allowedLeading', () => {
    expect(() =>
      validateSqlSafety('UPDATE t SET a = 1', { allowedLeading: ['SELECT'] }),
    ).toThrow(/not allowed/i);
  });

  it('rejects multiple statements when allowMultiple is false', () => {
    expect(() =>
      validateSqlSafety('SELECT 1; SELECT 2', {
        allowedLeading: ['SELECT'],
        allowMultiple: false,
      }),
    ).toThrow(/Multiple statements/i);
  });

  it('permits multiple statements when allowMultiple is true', () => {
    expect(() =>
      validateSqlSafety('CREATE VIEW v AS SELECT 1; SELECT 2', {
        allowedLeading: ['CREATE', 'SELECT'],
        allowMultiple: true,
      }),
    ).not.toThrow();
  });

  it('ignores semicolons inside string literals', () => {
    expect(() =>
      validateSqlSafety("SELECT ';' AS x", {
        allowedLeading: ['SELECT'],
        allowMultiple: false,
      }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test src/utils/sqlValidator.test.ts`
Expected: FAIL ("Failed to resolve import './sqlValidator'").

- [ ] **Step 3: Create the validator (copied verbatim from source)**

Create `../carmen-platform/src/utils/sqlValidator.ts` with the exact contents of this repo's `lib/sql-validator.ts` (no changes — it is framework-free and its `typeof window === "undefined"` guard is satisfied in jsdom). Full contents:
```ts
/**
 * Client-side SQL safety validator — UI feedback only. The backend validator is
 * the source of truth; the allowlist here is intentionally bypassable and must
 * never be treated as a server authorisation gate.
 */

const FORBIDDEN_LEADING = new Set([
  'DROP', 'TRUNCATE', 'GRANT', 'REVOKE', 'COPY', 'VACUUM', 'CLUSTER',
  'REASSIGN', 'REINDEX', 'ALTER',
]);

function extractTopLevelStatements(sql: string): string[] {
  const stmts: string[] = [];
  let buf = '';
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (ch === '-' && next === '-') {
      while (i < n && sql[i] !== '\n') { buf += sql[i]; i++; }
      continue;
    }
    if (ch === '/' && next === '*') {
      buf += '/*'; i += 2;
      while (i < n && !(sql[i] === '*' && sql[i + 1] === '/')) { buf += sql[i]; i++; }
      if (i < n) { buf += '*/'; i += 2; }
      continue;
    }
    if (ch === "'") {
      buf += ch; i++;
      while (i < n) {
        const c = sql[i]; buf += c; i++;
        if (c === "'") {
          if (sql[i] === "'") { buf += sql[i]; i++; continue; }
          break;
        }
      }
      continue;
    }
    if (ch === '"') {
      buf += ch; i++;
      while (i < n) {
        const c = sql[i]; buf += c; i++;
        if (c === '"') {
          if (sql[i] === '"') { buf += sql[i]; i++; continue; }
          break;
        }
      }
      continue;
    }
    if (ch === '$') {
      const m = sql.slice(i).match(/^\$([A-Za-z_]\w*)?\$/);
      if (m) {
        const tag = m[0];
        buf += tag; i += tag.length;
        const end = sql.indexOf(tag, i);
        if (end < 0) { buf += sql.slice(i); i = n; }
        else { buf += sql.slice(i, end + tag.length); i = end + tag.length; }
        continue;
      }
    }
    if (ch === ';') {
      const t = buf.trim();
      if (t) stmts.push(t);
      buf = ''; i++;
      continue;
    }
    buf += ch; i++;
  }
  const last = buf.trim();
  if (last) stmts.push(last);
  return stmts;
}

function leadingKeyword(stmt: string): string {
  const cleaned = stmt
    .replace(/^\s*(?:--[^\n]*\n|\/\*[\s\S]*?\*\/)\s*/g, '')
    .trimStart();
  const m = cleaned.match(/^([A-Za-z]+)/);
  return m ? m[1].toUpperCase() : '';
}

export interface SqlValidationOptions {
  allowedLeading?: string[];
  allowMultiple?: boolean;
}

export function validateSqlSafety(
  sql: string,
  opts: SqlValidationOptions = {},
): void {
  if (typeof window === 'undefined') {
    throw new Error(
      'validateSqlSafety is client-only — use the server validator instead',
    );
  }
  if (!sql?.trim()) throw new Error('SQL is empty');

  const stmts = extractTopLevelStatements(sql);
  if (stmts.length === 0) throw new Error('No SQL statement found');
  if (!opts.allowMultiple && stmts.length > 1) {
    throw new Error(
      `Multiple statements are not allowed (found ${stmts.length}). Send one statement at a time.`,
    );
  }

  const allowed = opts.allowedLeading?.map((k) => k.toUpperCase());

  for (const stmt of stmts) {
    const kw = leadingKeyword(stmt);
    if (!kw) throw new Error('Could not parse leading keyword of a statement');
    if (FORBIDDEN_LEADING.has(kw)) {
      throw new Error(`Forbidden statement: "${kw}" is not allowed from the SQL editor`);
    }
    if (allowed && !allowed.includes(kw)) {
      throw new Error(
        `Statement type "${kw}" is not allowed here. Allowed: ${allowed.join(', ')}`,
      );
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test src/utils/sqlValidator.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
cd ../carmen-platform
git add src/utils/sqlValidator.ts src/utils/sqlValidator.test.ts
git commit -m "feat(sql): add client-side SQL safety validator"
```

---

## Task 3: SQL types + axios service

**Files:**
- Modify: `../carmen-platform/src/types/index.ts` (append at end of file)
- Create: `../carmen-platform/src/services/sqlQueryService.ts`
- Test: `../carmen-platform/src/services/sqlQueryService.test.ts`

**Interfaces:**
- Consumes: the `api` axios instance from `./api`.
- Produces (types in `../types`): `DbObject`, `DbColumn`, `DbObjectsResponse`, `DbObjectDefinition`, `SqlExecuteResult`, `SaveDdlInput`, `SaveDdlResult`.
- Produces (default export `sqlQueryService`):
  - `getDbObjects(buCode: string): Promise<DbObjectsResponse>`
  - `getDefinition(buCode: string, o: { type: string; schema: string; name: string }): Promise<DbObjectDefinition>`
  - `executeSql(buCode: string, sqlText: string): Promise<SqlExecuteResult>`
  - `saveDdl(buCode: string, input: SaveDdlInput): Promise<SaveDdlResult>`
  - `dropObject(buCode: string, o: { type: string; schema: string; name: string }): Promise<{ dropped: boolean; type: string; schema: string; name: string }>`

- [ ] **Step 1: Append the SQL types**

Add to the end of `../carmen-platform/src/types/index.ts`:
```ts
// --- SQL Workbench ---
export interface DbObject {
  schema: string;
  name: string;
  kind?: string;
}

export interface DbColumn {
  table: string;
  column: string;
  data_type: string;
}

export interface DbObjectsResponse {
  tables: DbObject[];
  views: DbObject[];
  procedures: DbObject[];
  columns: DbColumn[];
}

export interface DbObjectDefinition {
  type: string;
  schema: string;
  name: string;
  definition: string;
}

export interface SqlExecuteResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
}

export interface SaveDdlInput {
  name?: string;
  sql_text: string;
  query_type: 'view' | 'stored_procedure' | 'function';
}

export interface SaveDdlResult {
  type: string;
  name: string;
  schema: string;
  executed_sql: string;
}
```

- [ ] **Step 2: Write the failing service test**

Create `../carmen-platform/src/services/sqlQueryService.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import sqlQueryService from './sqlQueryService';
import api from './api';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('sqlQueryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getDbObjects unwraps the { data } envelope', async () => {
    const payload = { tables: [], views: [], procedures: [], columns: [] };
    mockApi.get.mockResolvedValue({ data: { data: payload } });
    const result = await sqlQueryService.getDbObjects('T02');
    expect(mockApi.get).toHaveBeenCalledWith('/api/config/T02/sql-query/db-objects');
    expect(result).toEqual(payload);
  });

  it('executeSql posts sql_text to the execute endpoint', async () => {
    const payload = { columns: ['x'], rows: [{ x: 1 }], rowCount: 1, durationMs: 5 };
    mockApi.post.mockResolvedValue({ data: { data: payload } });
    const result = await sqlQueryService.executeSql('T02', 'SELECT 1 AS x');
    expect(mockApi.post).toHaveBeenCalledWith('/api/config/T02/sql-query/execute', {
      sql_text: 'SELECT 1 AS x',
    });
    expect(result).toEqual(payload);
  });

  it('getDefinition passes type/schema/name as query params', async () => {
    mockApi.get.mockResolvedValue({
      data: { data: { type: 'view', schema: 'public', name: 'v', definition: 'x' } },
    });
    await sqlQueryService.getDefinition('T02', { type: 'view', schema: 'public', name: 'v' });
    expect(mockApi.get).toHaveBeenCalledWith(
      '/api/config/T02/sql-query/db-objects/definition?type=view&schema=public&name=v',
    );
  });

  it('dropObject calls DELETE with query params', async () => {
    mockApi.delete.mockResolvedValue({
      data: { data: { dropped: true, type: 'view', schema: 'public', name: 'v' } },
    });
    const result = await sqlQueryService.dropObject('T02', {
      type: 'view',
      schema: 'public',
      name: 'v',
    });
    expect(mockApi.delete).toHaveBeenCalledWith(
      '/api/config/T02/sql-query/db-objects?type=view&schema=public&name=v',
    );
    expect(result.dropped).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bun run test src/services/sqlQueryService.test.ts`
Expected: FAIL ("Failed to resolve import './sqlQueryService'").

- [ ] **Step 4: Create the service**

Create `../carmen-platform/src/services/sqlQueryService.ts`:
```ts
import api from './api';
import type {
  DbObjectsResponse,
  DbObjectDefinition,
  SqlExecuteResult,
  SaveDdlInput,
  SaveDdlResult,
} from '../types';

// The tenant SQL endpoints live under the /api proxy (not /api-system).
const base = (buCode: string) => `/api/config/${buCode}/sql-query`;

// Unwrap the standard `{ data: ... }` envelope, tolerating a bare body.
function unwrap<T>(response: { data: unknown }): T {
  const body = response.data as { data?: unknown };
  return (body?.data ?? body) as T;
}

interface DbObjectRef {
  type: string;
  schema: string;
  name: string;
}

const refQuery = ({ type, schema, name }: DbObjectRef) =>
  `type=${encodeURIComponent(type)}&schema=${encodeURIComponent(
    schema,
  )}&name=${encodeURIComponent(name)}`;

const sqlQueryService = {
  getDbObjects: async (buCode: string): Promise<DbObjectsResponse> => {
    const response = await api.get(`${base(buCode)}/db-objects`);
    return unwrap<DbObjectsResponse>(response);
  },

  getDefinition: async (
    buCode: string,
    ref: DbObjectRef,
  ): Promise<DbObjectDefinition> => {
    const response = await api.get(
      `${base(buCode)}/db-objects/definition?${refQuery(ref)}`,
    );
    return unwrap<DbObjectDefinition>(response);
  },

  executeSql: async (
    buCode: string,
    sqlText: string,
  ): Promise<SqlExecuteResult> => {
    const response = await api.post(`${base(buCode)}/execute`, {
      sql_text: sqlText,
    });
    return unwrap<SqlExecuteResult>(response);
  },

  saveDdl: async (buCode: string, input: SaveDdlInput): Promise<SaveDdlResult> => {
    const response = await api.post(`${base(buCode)}/save`, input);
    return unwrap<SaveDdlResult>(response);
  },

  dropObject: async (
    buCode: string,
    ref: DbObjectRef,
  ): Promise<{ dropped: boolean; type: string; schema: string; name: string }> => {
    const response = await api.delete(`${base(buCode)}/db-objects?${refQuery(ref)}`);
    return unwrap(response);
  },
};

export default sqlQueryService;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun run test src/services/sqlQueryService.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
cd ../carmen-platform
git add src/types/index.ts src/services/sqlQueryService.ts src/services/sqlQueryService.test.ts
git commit -m "feat(sql): add SQL DTO types + axios query service"
```

---

## Task 4: SQL editor pure helpers (TDD)

**Files:**
- Create: `../carmen-platform/src/pages/sqlWorkbench/sqlEditorHelpers.ts`
- Test: `../carmen-platform/src/pages/sqlWorkbench/sqlEditorHelpers.test.ts`

**Interfaces:**
- Produces: `countStatements(sql: string): number` and `findStatementAt(sql: string, offset: number): { start: number; end: number }`.

- [ ] **Step 1: Write the failing tests**

Create `../carmen-platform/src/pages/sqlWorkbench/sqlEditorHelpers.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { countStatements, findStatementAt } from './sqlEditorHelpers';

describe('countStatements', () => {
  it('counts a single unterminated statement as 1', () => {
    expect(countStatements('SELECT 1')).toBe(1);
  });

  it('counts two semicolon-separated statements as 2', () => {
    expect(countStatements('SELECT 1; SELECT 2;')).toBe(2);
  });

  it('ignores semicolons inside a string literal', () => {
    expect(countStatements("SELECT ';'")).toBe(1);
  });

  it('returns 0 for whitespace only', () => {
    expect(countStatements('   ')).toBe(0);
  });
});

describe('findStatementAt', () => {
  it('returns the statement bounds surrounding the offset', () => {
    const sql = 'SELECT 1; SELECT 2;';
    const { start, end } = findStatementAt(sql, 12); // inside "SELECT 2"
    expect(sql.slice(start, end).trim()).toBe('SELECT 2;');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test src/pages/sqlWorkbench/sqlEditorHelpers.test.ts`
Expected: FAIL ("Failed to resolve import './sqlEditorHelpers'").

- [ ] **Step 3: Create the helpers (copied verbatim from the Monaco source's pure functions)**

Create `../carmen-platform/src/pages/sqlWorkbench/sqlEditorHelpers.ts`:
```ts
// Pure, editor-agnostic SQL string helpers (ported from the source Monaco editor).

export function findStatementAt(
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
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') { inBlockComment = false; i++; }
      continue;
    }
    if (inSingle) {
      if (ch === "'" && sql[i - 1] !== '\\') inSingle = false;
      continue;
    }
    if (inDouble) {
      if (ch === '"' && sql[i - 1] !== '\\') inDouble = false;
      continue;
    }
    if (ch === '-' && next === '-') { inLineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
    if (ch === "'") inSingle = true;
    else if (ch === '"') inDouble = true;
    else if (ch === ';') {
      if (i < offset) start = i + 1;
      else { end = i + 1; break; }
    }
  }
  while (start < end && /\s/.test(sql[start] ?? '')) start++;
  return { start, end };
}

export function countStatements(sql: string): number {
  let n = 0;
  let inS = false;
  let inD = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && !inD && sql[i - 1] !== '\\') inS = !inS;
    else if (ch === '"' && !inS && sql[i - 1] !== '\\') inD = !inD;
    else if (ch === ';' && !inS && !inD) n++;
  }
  if (sql.trim().length > 0 && !sql.trim().endsWith(';')) n++;
  return n;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test src/pages/sqlWorkbench/sqlEditorHelpers.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd ../carmen-platform
git add src/pages/sqlWorkbench/sqlEditorHelpers.ts src/pages/sqlWorkbench/sqlEditorHelpers.test.ts
git commit -m "feat(sql): add pure SQL editor helpers"
```

---

## Task 5: CodeMirror SQL editor component

**Files:**
- Create: `../carmen-platform/src/pages/sqlWorkbench/SqlEditor.tsx`

**Interfaces:**
- Consumes: `countStatements`, `findStatementAt` from `./sqlEditorHelpers`; `DbObjectsResponse` from `../../types`; `Button` from `../../components/ui/button`; `cn` from `../../lib/utils`.
- Produces: `SqlEditor` (named export) with props
  `{ value: string; onChange: (v: string) => void; onRun?: (sqlToRun: string) => void; isRunning?: boolean; schema?: DbObjectsResponse; height?: number }`.

- [ ] **Step 1: Create the editor component**

Create `../carmen-platform/src/pages/sqlWorkbench/SqlEditor.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
import { sql, PostgreSQL } from '@codemirror/lang-sql';
import {
  bracketMatching,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
} from '@codemirror/language';
import { search, searchKeymap, openSearchPanel } from '@codemirror/search';
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from '@codemirror/autocomplete';
import { format as sqlFormat } from 'sql-formatter';
import { Play, Wand2, Search as SearchIcon, Eraser, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import type { DbObjectsResponse } from '../../types';
import { countStatements, findStatementAt } from './sqlEditorHelpers';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: (sqlToRun: string) => void;
  isRunning?: boolean;
  schema?: DbObjectsResponse;
  height?: number;
}

// Build the { table: [columns] } map lang-sql uses for schema-aware autocomplete.
function buildSchemaMap(schema?: DbObjectsResponse): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  if (!schema) return map;
  for (const t of schema.tables ?? []) map[t.name] ??= [];
  for (const v of schema.views ?? []) map[v.name] ??= [];
  for (const c of schema.columns ?? []) (map[c.table] ??= []).push(c.column);
  return map;
}

function schemaKey(schema?: DbObjectsResponse): string {
  if (!schema) return '';
  return `${schema.tables?.length ?? 0}:${schema.views?.length ?? 0}:${schema.columns?.length ?? 0}`;
}

export function SqlEditor({
  value,
  onChange,
  onRun,
  isRunning = false,
  schema,
  height = 360,
}: SqlEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const latestValueRef = useRef(value);
  const onRunRef = useRef(onRun);
  const langCompartment = useRef(new Compartment());

  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  // Run the current selection, else the statement under the cursor.
  const runFromEditor = (view: EditorView): boolean => {
    const cb = onRunRef.current;
    if (!cb) return false;
    const sel = view.state.selection.main;
    const selected = view.state.sliceDoc(sel.from, sel.to);
    if (selected.trim()) {
      cb(selected.trim());
      return true;
    }
    const doc = view.state.doc.toString();
    const { start, end } = findStatementAt(doc, sel.head);
    const stmt = doc.slice(start, end).trim().replace(/;\s*$/, '');
    if (stmt) cb(stmt);
    return true;
  };

  // Create the editor once.
  useEffect(() => {
    if (!hostRef.current) return;
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const next = update.state.doc.toString();
        latestValueRef.current = next;
        onChange(next);
      }
    });
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        bracketMatching(),
        indentOnInput(),
        closeBrackets(),
        autocompletion(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        search({ top: true }),
        langCompartment.current.of(
          sql({ dialect: PostgreSQL, schema: buildSchemaMap(schema), upperCaseKeywords: true }),
        ),
        keymap.of([
          {
            key: 'Mod-Enter',
            preventDefault: true,
            run: (view) => runFromEditor(view),
          },
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          ...completionKeymap,
          ...closeBracketsKeymap,
          indentWithTab,
        ]),
        EditorView.theme({
          '&': { fontSize: '13px' },
          '.cm-scroller': {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          },
          '.cm-gutters': {
            backgroundColor: 'transparent',
            borderRight: '1px solid hsl(var(--border))',
          },
          '.cm-focused': { outline: 'none' },
        }),
        updateListener,
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    latestValueRef.current = value;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes into the editor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (value === latestValueRef.current) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    latestValueRef.current = value;
  }, [value]);

  // Reconfigure the language (schema autocomplete) when the schema changes,
  // without discarding editor content.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: langCompartment.current.reconfigure(
        sql({ dialect: PostgreSQL, schema: buildSchemaMap(schema), upperCaseKeywords: true }),
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaKey(schema)]);

  const replaceAll = (text: string) => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
  };

  const handleRun = () => {
    const view = viewRef.current;
    if (view) runFromEditor(view);
  };

  const handleFormat = () => {
    try {
      const formatted = sqlFormat(latestValueRef.current, {
        language: 'postgresql',
        keywordCase: 'upper',
        tabWidth: 2,
      });
      replaceAll(formatted);
      onChange(formatted);
    } catch {
      // ignore format errors silently
    }
  };

  const handleFind = () => {
    const view = viewRef.current;
    if (view) openSearchPanel(view);
  };

  const handleClear = () => {
    replaceAll('');
    onChange('');
  };

  const totalLines = value.split('\n').length;
  const stmtCount = countStatements(value);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
        {onRun && (
          <Button
            size="sm"
            className="h-7"
            onClick={handleRun}
            disabled={isRunning}
            title="Run (Ctrl/⌘+Enter)"
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
        <Button size="sm" variant="ghost" className="h-7" onClick={handleFormat} title="Format SQL">
          <Wand2 className="mr-1 size-3.5" />
          Format
        </Button>
        <Button size="sm" variant="ghost" className="h-7" onClick={handleFind} title="Find (Ctrl/⌘+F)">
          <SearchIcon className="mr-1 size-3.5" />
          Find
        </Button>
        <div className="ml-auto" />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-destructive"
          onClick={handleClear}
          title="Clear editor"
        >
          <Eraser className="mr-1 size-3.5" />
          Clear
        </Button>
      </div>

      <div
        ref={hostRef}
        className="overflow-auto"
        style={{ minHeight: height, maxHeight: height + 160 }}
      />

      <div
        className={cn(
          'bg-muted/30 text-muted-foreground flex flex-wrap items-center gap-x-4 border-t px-3 py-1 text-[11px]',
        )}
      >
        <span>
          <span className="text-foreground">{totalLines}</span> lines
        </span>
        <span>
          <span className="text-foreground">{stmtCount}</span> statement
          {stmtCount === 1 ? '' : 's'}
        </span>
        <span className="ml-auto">SQL · PostgreSQL</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types + build**

Run (in `../carmen-platform`): `bun run build`
Expected: tsc + vite build succeed. (If `sql()` rejects the `schema` shape on the installed lang-sql version, cast with `schema: buildSchemaMap(schema) as never` — the map is `Record<string,string[]>`, which lang-sql accepts as a table→columns namespace.)

- [ ] **Step 3: Commit**

```bash
cd ../carmen-platform
git add src/pages/sqlWorkbench/SqlEditor.tsx
git commit -m "feat(sql): CodeMirror SQL editor (replaces Monaco)"
```

---

## Task 6: Result panel component

**Files:**
- Create: `../carmen-platform/src/pages/sqlWorkbench/ResultPanel.tsx`

**Interfaces:**
- Consumes: `SqlExecuteResult` from `../../types`; `Button` from `../../components/ui/button`; `cn` from `../../lib/utils`.
- Produces: `ResultPanel` (named export) with props
  `{ result: SqlExecuteResult | null; error: string | null; isRunning: boolean; onClose?: () => void }`.

- [ ] **Step 1: Create the component**

Copy this repo's `routes/system-admin/query-dataset/result-panel.tsx` into `../carmen-platform/src/pages/sqlWorkbench/ResultPanel.tsx` **verbatim except the three import lines at the top**, which become:
```tsx
import { useState } from 'react';
import { Download, AlertTriangle, Table as TableIcon, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { SqlExecuteResult } from '../../types';
import { cn } from '../../lib/utils';
```
(The `SqlExecuteResult` type now comes from `../../types`, not the old `use-sql-query` hook. Everything below the imports — `csvEscape`, `exportCsv`, `parseErrorLine`, `renderCell`, and the `ResultPanel` component body — is unchanged.)

- [ ] **Step 2: Verify build**

Run (in `../carmen-platform`): `bun run build`
Expected: succeed, no type errors.

- [ ] **Step 3: Commit**

```bash
cd ../carmen-platform
git add src/pages/sqlWorkbench/ResultPanel.tsx
git commit -m "feat(sql): result panel with CSV export"
```

---

## Task 7: Db-object tree component (props-driven)

**Files:**
- Create: `../carmen-platform/src/pages/sqlWorkbench/DbObjectTree.tsx`

**Interfaces:**
- Consumes: `DbObject`, `DbObjectsResponse` from `../../types`; `cn` from `../../lib/utils`.
- Produces: `DbObjectTree` (named export) with props
  `{ data: DbObjectsResponse | null; isLoading: boolean; isError: boolean; onRetry: () => void; onSelect: (obj: { type: 'view' | 'procedure' | 'function'; schema: string; name: string }) => void; loadingKey?: string | null }`.

**Difference from source:** the source used the `useDbObjects()` hook internally. Here the data is lifted to the orchestrator and passed in as props (`data`/`isLoading`/`isError`/`onRetry`).

- [ ] **Step 1: Create the component**

Create `../carmen-platform/src/pages/sqlWorkbench/DbObjectTree.tsx`. Start from this repo's `routes/system-admin/query-dataset/db-object-tree.tsx` and apply exactly these changes:

1. Replace the top imports with:
```tsx
import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  FunctionSquare,
  Loader2,
  Search,
  Database,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { DbObject, DbObjectsResponse } from '../../types';
```

2. Replace the props interface and the hook line. The interface becomes:
```tsx
interface DbObjectTreeProps {
  data: DbObjectsResponse | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelect: (obj: {
    type: 'view' | 'procedure' | 'function';
    schema: string;
    name: string;
  }) => void;
  loadingKey?: string | null;
}
```

3. Change the component signature and remove the hook. Replace:
```tsx
export function DbObjectTree({ onSelect, loadingKey }: DbObjectTreeProps) {
  const { data, isLoading, isError, refetch } = useDbObjects();
  const [search, setSearch] = useState("");
```
with:
```tsx
export function DbObjectTree({
  data,
  isLoading,
  isError,
  onRetry,
  onSelect,
  loadingKey,
}: DbObjectTreeProps) {
  const [search, setSearch] = useState('');
```

4. In the error branch, change `onClick={() => refetch()}` to `onClick={onRetry}`.

Everything else (the `filtered` memo, `Section`, `ItemRow`, `EmptyHint`, and all JSX) is copied unchanged.

- [ ] **Step 2: Verify build**

Run (in `../carmen-platform`): `bun run build`
Expected: succeed, no type errors.

- [ ] **Step 3: Commit**

```bash
cd ../carmen-platform
git add src/pages/sqlWorkbench/DbObjectTree.tsx
git commit -m "feat(sql): db-object tree (props-driven)"
```

---

## Task 8: SqlWorkbench orchestrator page + smoke test

**Files:**
- Create: `../carmen-platform/src/pages/sqlWorkbench/SqlWorkbench.tsx`
- Test: `../carmen-platform/src/pages/sqlWorkbench/SqlWorkbench.test.tsx`

**Interfaces:**
- Consumes: `sqlQueryService` (default) from `../../services/sqlQueryService`; `businessUnitService` (default) from `../../services/businessUnitService`; `useAuth` from `../../context/AuthContext`; `validateSqlSafety` from `../../utils/sqlValidator`; `SqlEditor`, `ResultPanel`, `DbObjectTree`; `Select*` from `../../components/ui/select`; `Button` from `../../components/ui/button`; types from `../../types`.
- Produces: default export `SqlWorkbench` (a page component).

- [ ] **Step 1: Create the orchestrator page**

Create `../carmen-platform/src/pages/sqlWorkbench/SqlWorkbench.tsx`:
```tsx
import { useCallback, useEffect, useState } from 'react';
import { Database, Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '../../components/Layout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useAuth } from '../../context/AuthContext';
import sqlQueryService from '../../services/sqlQueryService';
import businessUnitService from '../../services/businessUnitService';
import { validateSqlSafety } from '../../utils/sqlValidator';
import type { BusinessUnit, DbObjectsResponse, SqlExecuteResult } from '../../types';
import { SqlEditor } from './SqlEditor';
import { ResultPanel } from './ResultPanel';
import { DbObjectTree } from './DbObjectTree';

const QUERY_TYPES = [
  { value: 'view', label: 'View' },
  { value: 'stored_procedure', label: 'Stored Procedure' },
  { value: 'function', label: 'Function' },
] as const;

type QueryType = 'view' | 'stored_procedure' | 'function';

type LoadedObject = {
  type: 'view' | 'procedure' | 'function';
  schema: string;
  name: string;
} | null;

export default function SqlWorkbench() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('sql_workbench.manage');

  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [buCode, setBuCode] = useState('');

  const [dbObjects, setDbObjects] = useState<DbObjectsResponse | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState(false);

  const [formName, setFormName] = useState('');
  const [formSqlText, setFormSqlText] = useState('');
  const [formQueryType, setFormQueryType] = useState<QueryType>('view');
  const [loadedObject, setLoadedObject] = useState<LoadedObject>(null);
  const [loadingObjectKey, setLoadingObjectKey] = useState<string | null>(null);

  const [executeResult, setExecuteResult] = useState<SqlExecuteResult | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDropping, setIsDropping] = useState(false);

  // Load the BU list once.
  useEffect(() => {
    let cancelled = false;
    businessUnitService
      .getAll({ perpage: 500 })
      .then((res) => {
        if (!cancelled) setBusinessUnits(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load business units');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load db objects whenever the selected BU changes.
  const loadDbObjects = useCallback(async (code: string) => {
    if (!code) return;
    setDbLoading(true);
    setDbError(false);
    try {
      const data = await sqlQueryService.getDbObjects(code);
      setDbObjects(data);
    } catch {
      setDbError(true);
    } finally {
      setDbLoading(false);
    }
  }, []);

  useEffect(() => {
    if (buCode) loadDbObjects(buCode);
    else setDbObjects(null);
  }, [buCode, loadDbObjects]);

  const resetResult = () => {
    setExecuteResult(null);
    setExecuteError(null);
  };

  const handleRun = async (sqlToRun: string) => {
    if (!buCode) {
      toast.error('Select a business unit first');
      return;
    }
    try {
      validateSqlSafety(sqlToRun, {
        allowedLeading: ['SELECT', 'WITH', 'SHOW', 'EXPLAIN', 'DESCRIBE', 'DESC'],
        allowMultiple: false,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invalid SQL');
      return;
    }
    setIsRunning(true);
    resetResult();
    try {
      const result = await sqlQueryService.executeSql(buCode, sqlToRun);
      setExecuteResult(result);
    } catch (e) {
      setExecuteError(e instanceof Error ? e.message : 'Failed to execute SQL');
    } finally {
      setIsRunning(false);
    }
  };

  const handleNew = () => {
    setFormName('');
    setFormSqlText('');
    setFormQueryType('view');
    setLoadedObject(null);
    resetResult();
  };

  const handlePickDbObject = async (obj: {
    type: 'view' | 'procedure' | 'function';
    schema: string;
    name: string;
  }) => {
    if (!buCode) return;
    const key = `${obj.type}:${obj.schema}.${obj.name}`;
    setLoadingObjectKey(key);
    try {
      const def = await sqlQueryService.getDefinition(buCode, obj);
      setLoadedObject(obj);
      setFormName(def.name);
      setFormSqlText(def.definition);
      setFormQueryType(
        def.type === 'view' ? 'view' : def.type === 'procedure' ? 'stored_procedure' : 'function',
      );
      resetResult();
      toast.success(`Loaded ${def.type}: ${def.schema}.${def.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load definition');
    } finally {
      setLoadingObjectKey(null);
    }
  };

  const handleSave = async () => {
    if (!buCode) {
      toast.error('Select a business unit first');
      return;
    }
    if (!formSqlText.trim()) {
      toast.error('Please enter SQL');
      return;
    }
    const stripped = formSqlText.trimStart();
    const startsWithCreate =
      /^create\s+(or\s+replace\s+)?(temp(orary)?\s+)?(materialized\s+)?(view|procedure|function)\b/i.test(
        stripped,
      );
    if (formQueryType === 'view' && !formName.trim() && !startsWithCreate) {
      toast.error('Please enter a name for the view');
      return;
    }
    try {
      if (startsWithCreate) {
        validateSqlSafety(formSqlText, { allowedLeading: ['CREATE'], allowMultiple: true });
      } else {
        validateSqlSafety(formSqlText, {
          allowedLeading: ['SELECT', 'WITH'],
          allowMultiple: false,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invalid SQL', { duration: 8000 });
      return;
    }
    setIsSaving(true);
    try {
      const result = await sqlQueryService.saveDdl(buCode, {
        name: formName || undefined,
        sql_text: formSqlText,
        query_type: formQueryType,
      });
      toast.success(
        `${
          formQueryType === 'view'
            ? 'View'
            : formQueryType === 'function'
              ? 'Function'
              : 'Stored procedure'
        } "${result.name || '(unnamed)'}" saved to schema "${result.schema}"`,
      );
      loadDbObjects(buCode);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save', { duration: 8000 });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrop = async () => {
    if (!loadedObject || !buCode) return;
    if (
      !window.confirm(
        `Drop ${loadedObject.type} "${loadedObject.schema}.${loadedObject.name}"? This cannot be undone.`,
      )
    )
      return;
    setIsDropping(true);
    try {
      await sqlQueryService.dropObject(buCode, loadedObject);
      toast.success(`Dropped ${loadedObject.type}: ${loadedObject.name}`);
      handleNew();
      loadDbObjects(buCode);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to drop');
    } finally {
      setIsDropping(false);
    }
  };

  return (
    <Layout>
      <div className="pb-4">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Database className="size-5" />
              <h1 className="text-lg font-semibold">SQL Workbench</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Run queries · create views, stored procedures and functions in a tenant database
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-56">
              <Select value={buCode} onValueChange={setBuCode}>
                <SelectTrigger aria-label="Business unit">
                  <SelectValue placeholder="Select business unit" />
                </SelectTrigger>
                <SelectContent>
                  {businessUnits.map((bu) => (
                    <SelectItem key={bu.id} value={bu.code}>
                      {bu.name} ({bu.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canManage && loadedObject && (
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
            {canManage && (
              <Button size="sm" onClick={handleSave} disabled={isSaving || !buCode}>
                {isSaving ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : (
                  <Save className="mr-1 size-4" />
                )}
                Save
              </Button>
            )}
          </div>
        </div>

        {!buCode ? (
          <div className="text-muted-foreground mt-10 flex items-center justify-center rounded-lg border border-dashed py-16 text-sm">
            Select a business unit to begin.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="rounded-lg border lg:max-h-[calc(100vh-220px)] lg:overflow-hidden">
              <DbObjectTree
                data={dbObjects}
                isLoading={dbLoading}
                isError={dbError}
                onRetry={() => loadDbObjects(buCode)}
                onSelect={handlePickDbObject}
                loadingKey={loadingObjectKey}
              />
            </aside>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="qd-object-name" className="mb-1 block text-xs font-semibold">
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
                  <label id="qd-type-label" className="mb-1 block text-xs font-semibold">
                    Type
                  </label>
                  <Select
                    value={formQueryType}
                    onValueChange={(v) => setFormQueryType(v as QueryType)}
                  >
                    <SelectTrigger aria-labelledby="qd-type-label">
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
                      Editing:{' '}
                      <span className="text-foreground">
                        {loadedObject.schema}.{loadedObject.name}
                      </span>{' '}
                      ({loadedObject.type})
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border">
                <div className="flex items-center gap-2 border-b px-4 py-2">
                  <Database className="text-muted-foreground size-4" />
                  <span className="text-sm font-semibold">SQL Editor</span>
                </div>
                <SqlEditor
                  value={formSqlText}
                  onChange={setFormSqlText}
                  onRun={handleRun}
                  isRunning={isRunning}
                  schema={dbObjects ?? undefined}
                />
              </div>

              {(isRunning || executeResult || executeError) && (
                <ResultPanel
                  result={executeResult}
                  error={executeError}
                  isRunning={isRunning}
                  onClose={resetResult}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Write the smoke test**

Create `../carmen-platform/src/pages/sqlWorkbench/SqlWorkbench.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SqlWorkbench from './SqlWorkbench';

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const hasPermission = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ hasPermission }),
}));

vi.mock('../../services/businessUnitService', () => ({
  default: {
    getAll: vi.fn().mockResolvedValue({
      data: [{ id: '1', code: 'T02', name: 'Test Hotel', is_active: true }],
    }),
  },
}));

vi.mock('../../services/sqlQueryService', () => ({
  default: {
    getDbObjects: vi
      .fn()
      .mockResolvedValue({ tables: [], views: [], procedures: [], columns: [] }),
    executeSql: vi.fn(),
    saveDdl: vi.fn(),
    dropObject: vi.fn(),
    getDefinition: vi.fn(),
  },
}));

// CodeMirror needs layout APIs jsdom lacks; stub the editor to a textarea.
vi.mock('./SqlEditor', () => ({
  SqlEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => <textarea aria-label="sql" value={value} onChange={(e) => onChange(e.target.value)} />,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <SqlWorkbench />
    </MemoryRouter>,
  );

describe('SqlWorkbench', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPermission.mockReturnValue(true);
  });

  it('shows the BU-gated empty state before a BU is chosen', async () => {
    renderPage();
    expect(await screen.findByText(/select a business unit to begin/i)).toBeInTheDocument();
  });

  it('reveals the editor after selecting a business unit', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByLabelText('Business unit'));
    await user.click(await screen.findByText('Test Hotel (T02)'));
    await waitFor(() => expect(screen.getByLabelText('sql')).toBeInTheDocument());
  });

  it('hides Save when the user lacks sql_workbench.manage', async () => {
    hasPermission.mockImplementation((k: string) => k !== 'sql_workbench.manage');
    renderPage();
    await screen.findByText(/select a business unit to begin/i);
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the smoke test**

Run (in `../carmen-platform`): `bun run test src/pages/sqlWorkbench/SqlWorkbench.test.tsx`
Expected: PASS (3 tests). If the Radix Select interaction is flaky under jsdom, assert on `hasPermission`-driven button visibility and the empty-state/editor swap via the mocked services rather than the dropdown click.

- [ ] **Step 4: Commit**

```bash
cd ../carmen-platform
git add src/pages/sqlWorkbench/SqlWorkbench.tsx src/pages/sqlWorkbench/SqlWorkbench.test.tsx
git commit -m "feat(sql): SqlWorkbench orchestrator page + smoke test"
```

---

## Task 9: Wire route, sidebar nav, and dev permissions

**Files:**
- Modify: `../carmen-platform/src/utils/permissions.ts`
- Modify: `../carmen-platform/src/App.tsx`
- Modify: `../carmen-platform/src/components/Layout.tsx`

**Interfaces:**
- Consumes: `SqlWorkbench` default export from `./pages/sqlWorkbench/SqlWorkbench`.

- [ ] **Step 1: Add the dev-mock permissions**

In `../carmen-platform/src/utils/permissions.ts`, inside the `DEV_MOCK_EFFECTIVE_PERMISSIONS.platform` array, add these two keys (append after the `role.*` line):
```ts
    'role.read', 'role.create', 'role.update', 'role.delete',
    'sql_workbench.read', 'sql_workbench.manage',
```

- [ ] **Step 2: Add the lazy import + guarded route in App.tsx**

In `../carmen-platform/src/App.tsx`, add the lazy import alongside the others (after the `UserPlatformEdit` line):
```tsx
const SqlWorkbench = lazy(() => import("./pages/sqlWorkbench/SqlWorkbench"));
```
Then add this route inside `<Routes>` (next to the other `/platform/*` routes):
```tsx
            <Route
              path="/sql-workbench"
              element={
                <PrivateRoute requiredPermission="sql_workbench.read">
                  <SqlWorkbench />
                </PrivateRoute>
              }
            />
```

- [ ] **Step 3: Add the sidebar nav item in Layout.tsx**

In `../carmen-platform/src/components/Layout.tsx`, ensure `Database` is imported from `lucide-react` (add it to the existing lucide import if absent). Then add to the `allNavItems` array, in the `Platform` group (after the `user-platform` line):
```tsx
    { path: '/sql-workbench', label: 'SQL Workbench', icon: Database, permission: 'sql_workbench.read', group: 'Platform' },
```

- [ ] **Step 4: Verify build + full test run**

Run (in `../carmen-platform`):
```bash
bun run build
bun run test
```
Expected: build clean; all tests pass (including the new SQL tests).

- [ ] **Step 5: Manual smoke (optional but recommended)**

Run `bun start`, log in, confirm `/sql-workbench` appears in the Platform sidebar group, opens, lists business units, and (with the dev mock) shows Save/Drop. Picking a BU loads the db-object tree; running `SELECT 1` returns a result (requires a reachable backend serving `/api/config/{bu}/sql-query/*`).

- [ ] **Step 6: Commit**

```bash
cd ../carmen-platform
git add src/utils/permissions.ts src/App.tsx src/components/Layout.tsx
git commit -m "feat(sql): route, sidebar nav, and dev permissions for SQL Workbench"
```

---

## Task 10: Remove SQL Workbench from inventory-react

**Files (this repo):**
- Delete: `routes/system-admin/query-dataset/` (all 5 files), `hooks/use-sql-query.ts`, `lib/sql-validator.ts`
- Modify: `routes/router.tsx`, `constant/module-list.ts`, `routes/system-admin/landing-types.ts`, `constant/api-endpoints.ts`

- [ ] **Step 1: Delete the feature files**

Run (in this repo root):
```bash
git rm -r routes/system-admin/query-dataset hooks/use-sql-query.ts lib/sql-validator.ts
```
Expected: 7 files staged for deletion.

- [ ] **Step 2: Remove the router registration**

In `routes/router.tsx`, delete the line:
```tsx
              { path: "query-dataset", lazy: () => import("./system-admin/query-dataset/query-dataset.route") },
```

- [ ] **Step 3: Remove the module-list entry**

In `constant/module-list.ts`, delete the `queryDataset` object:
```ts
      {
        name: "queryDataset",
        path: "/system-admin/query-dataset",
        icon: LayoutTemplate,
        permission: PERMISSIONS.system_configuration.view,
      },
```
Then, if `LayoutTemplate` is no longer referenced anywhere in the file, remove it from the `lucide-react` import. Verify with:
```bash
grep -n "LayoutTemplate" constant/module-list.ts
```
Expected after edit: only the import line matches (remove it) or no matches.

- [ ] **Step 4: Remove the landing tile**

In `routes/system-admin/landing-types.ts`, delete the `query` tile from the `data` module group:
```ts
      { key: "query", visualKey: "query", href: "/system-admin/query-dataset", icon: Search },
```
Then, if `Search` is no longer referenced in the file, remove it from the `lucide-react` import. Verify:
```bash
grep -n "\bSearch\b" routes/system-admin/landing-types.ts
```

- [ ] **Step 5: Remove the SQL endpoint builders**

In `constant/api-endpoints.ts`, delete the five `SQL_QUERY_*` builders (`SQL_QUERY_DB_OBJECTS`, `SQL_QUERY_DB_OBJECT_DEFINITION`, `SQL_QUERY_DROP`, `SQL_QUERY_EXECUTE`, `SQL_QUERY_SAVE`) — the contiguous block from `SQL_QUERY_DB_OBJECTS:` through the end of `SQL_QUERY_SAVE:`.

- [ ] **Step 6: Verify nothing dangles**

Run (in this repo root):
```bash
grep -rn "query-dataset\|use-sql-query\|sql-validator\|SQL_QUERY_\|queryDataset" --include="*.ts" --include="*.tsx" . | grep -v node_modules
```
Expected: no matches.

- [ ] **Step 7: Typecheck + tests**

Run:
```bash
bunx tsc --noEmit
bun test:run
```
Expected: no type errors; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: remove SQL Workbench (moved to carmen-platform)"
```

---

## Self-Review

**Spec coverage:**
- §3 Move → Task 10 (removal) ✔
- §5.1 File layout → Tasks 2–8 create the exact files ✔
- §5.2 Data layer (axios service, no react-query) → Task 3 ✔
- §5.3 BU selector → Task 8 (Select from businessUnitService, gated empty state) ✔
- §5.4 CodeMirror + lang-sql + schema autocomplete + format + Cmd/Ctrl+Enter → Task 5 ✔
- §5.5 Validation (copied validator) → Task 2 ✔
- §5.6 Permissions (read/manage, route + Save/Drop gate + sidebar + dev mock) → Tasks 8 & 9 ✔
- §5.7 Routing & nav → Task 9 ✔
- §7 New dependencies → Task 1 ✔
- §8 Testing (validator, service, smoke) → Tasks 2, 3, 8 ✔
- §6 Removal (4 registration points + deletes) → Task 10 ✔

**Placeholder scan:** No TBD/TODO. Ported components (ResultPanel/DbObjectTree) reference a concrete source file plus exact, enumerated edits rather than "similar to" hand-waving.

**Type consistency:** `DbObjectsResponse`, `SqlExecuteResult`, `SaveDdlInput`, `DbObject` defined in Task 3 (`../../types`) and consumed with the same names in Tasks 5–8. Service method names (`getDbObjects`, `getDefinition`, `executeSql`, `saveDdl`, `dropObject`) match between Task 3 (definition) and Task 8 (calls). `validateSqlSafety` signature matches between Task 2 and Task 8. `countStatements`/`findStatementAt` match between Task 4 and Task 5. Permission keys `sql_workbench.read`/`sql_workbench.manage` are identical across Tasks 8 and 9.

**Known risk flagged inline:** lang-sql `schema` typing (Task 5 Step 2 fallback cast) and Radix Select under jsdom (Task 8 Step 3 fallback assertion).
