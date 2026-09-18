# Accounting UI Specs — Implementation Plan

Frontend-only interactive mockup work is scoped separately in [Accounting UI Mockup — Frontend-Only Plan](accounting-ui-mockup-frontend-plan.md).

## 1. Source and decision

Reviewed the latest usable specification in every folder under the supplied Drive:

- `GL`: latest `index.html`
- `Master Data`: Title, Asset Category, JV Prefix, WHT Service Type, WHT Form, Payment Type, Account Code Grouping, Dimension, Cost Center, and COA
- `AP`: Dashboard, Invoice, Payment Approval/Payment, plus the latest root AP mockup

The Google Docs FRDs are the business-rule source. The latest HTML in each folder is a visual and interaction reference, not a database or API contract. Older HTML versions are reference history only unless a newer FRD explicitly preserves their behavior.

Implementation must extend the existing Carmen React patterns and accounting documents. Do not port the standalone HTML, CDN dependencies, local mock persistence, or Supabase proof-of-concept code.

## 2. Current repository state

| Area                           | Current state                 | Main gap                                                                                 |
| ------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------- |
| Accounting foundation          | Designed                      | Backend/runtime contracts still need end-to-end verification                             |
| GL Journal Voucher             | Interactive UI prototype      | Uses in-memory repository; HTTP adapter and production integration pending               |
| AP Dashboard, Invoice, Payment | Interactive UI prototype      | Uses browser-local mock repository; backend remains source-of-truth gap                  |
| COA                            | Existing config CRUD          | Model is limited to code, descriptions, nature, type, status, and control-account fields |
| Department                     | Existing shared config module | Must be reused as the Cost Center base instead of duplicated blindly                     |
| Remaining accounting masters   | Not implemented               | No routes, types, hooks, API adapters, permissions, or dependency checks                 |

Relevant existing implementation:

- `routes/accounting/accounts-payable/`
- `routes/accounting/journal-voucher/`
- `routes/config/chart-of-accounts/`
- `routes/config/department/`
- `components/templates/config-list-template.tsx`
- `lib/http-client.ts`

## 3. Cross-module rules

These rules repeat across the Drive specs and should be one backend/API convention with reused Carmen UI behavior:

1. Scope every master by Business Unit/property where applicable.
2. Normalize codes with trim and uppercase; enforce case-insensitive uniqueness in the database.
3. Make the code immutable after creation.
4. Show status as a badge in lists and edit status through the detail form.
5. Validate deactivation and deletion on the backend against active references and transaction history.
6. Return dependency details for the blocking dialog; never reproduce reference counting in the browser.
7. Use optimistic concurrency through `doc_version` and return the updated snapshot after mutation.
8. Return capabilities from the backend; do not infer create/update/delete/approve permission from status alone.
9. Record create, update, status change, blocked attempt, and delete in the shared audit/activity model.
10. Keep CSV/XLSX export server-filter aware. Reuse the existing list/export infrastructure where dataset size permits.

Required common error additions:

```text
409 DUPLICATE_CODE
409 VERSION_CONFLICT
422 DEPENDENCY_BLOCKED
422 NON_ZERO_BALANCE
422 INVALID_ACCOUNT_MAPPING
422 INVALID_DIMENSION_MAPPING
403 CAPABILITY_DENIED
```

`DEPENDENCY_BLOCKED` should include module, reference type, count, and optional authorized deep link. It must not expose records outside the user's BU or permission scope.

## 4. Target route map

Reuse existing configuration routes for shared master data and accounting routes for transaction work:

```text
/config/chart-of-accounts
/config/departments                         # UI label may be Cost Centers
/config/accounting/account-groups
/config/accounting/dimensions
/config/accounting/jv-prefixes
/config/accounting/payment-types
/config/accounting/wht-service-types
/config/accounting/wht-forms
/config/accounting/titles
/config/accounting/asset-categories

/accounting/journal-voucher
/accounting/accounts-payable
/accounting/accounts-payable/invoice
/accounting/accounts-payable/payment
```

Do not add separate Cost Center storage until backend analysis proves Department cannot carry the required accounting fields. Preferred model: extend Department with accounting group, allowed-account mappings, active/dependency rules, and accounting display metadata.

## 5. Delivery slices

### Slice 0 — Contract and ownership decisions

Backend and frontend agree before adding pages:

- canonical IDs, BU scope, `doc_version`, audit fields, list query shape, capability shape, and dependency error shape
- Department versus Cost Center ownership
- Dimension count: Drive specs conflict between 10 and 20; choose one backend capability-driven limit
- WHT Form versus WHT Service Type ownership and foreign-key direction
- shared activity log versus module-specific dependency-log tables
- accounting API prefixes and OpenAPI schemas

Exit criteria: approved OpenAPI/schema decisions and no unresolved ownership ambiguity for COA, Department/Cost Center, Dimension, WHT, or AP posting.

### Slice 1 — Accounting master foundation

Build the smallest reusable layer needed by the repeated master screens:

- server-side list/search/status filter/pagination
- create/update/status/delete mutations with `doc_version`
- capability-aware actions
- reusable dependency-blocked dialog using backend details
- active-status badge and code-lock behavior using existing Carmen components
- audit/activity readback
- route/menu/permission registration

Do not create a generic schema-driven form builder. Reuse `ConfigListTemplate`; keep each domain form explicit because validation and dependencies differ.

Verification: contract tests, duplicate-code race test, stale-version test, dependency authorization test, list loading/empty/error/mobile states.

### Slice 2 — Foundation masters

Implement in dependency order:

1. **Account Code Grouping** — L1-L4 tree, ordering, active status, child/account dependency protection.
2. **Dimension** — dimension categories and values/sub-codes, active status, one default sub-code per account/dimension where configured.
3. **Department/Cost Center extension** — group, status, allowed account mappings, transaction dependency protection.
4. **COA enhancement** — category-driven nature, mandatory grouping path, allowed departments, allowed dimensions/sub-codes, one default sub-code per dimension, external key/value tags, balance/deletion guardrails, control-account policy.

COA must move from the current modal-only core CRUD toward the FRD's full-screen editor only when the additional sections no longer fit the existing dialog accessibly. Preserve the existing import action and control-account fields.

Verification: hierarchy cycles, inactive parent behavior, invalid account/dimension combinations, default-sub-code uniqueness, non-zero balance deactivation, used-account deletion, and manual posting restrictions.

### Slice 3 — Simple accounting masters

Implement these with explicit forms on the shared master foundation:

| Master           | Required fields/behavior                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Title            | code, description, status, system-reserved protection, AR/PMS dependency check           |
| JV Prefix        | 2-10 character code, EN/TH descriptions, system prefix protection, JV history dependency |
| Payment Type     | code, description, payment method/config fields from final FRD, AP/payment dependency    |
| WHT Service Type | code, description, rate with decimal bounds, status, vendor/AP dependency                |

Export is lower priority than correct mutation, dependency, permission, and audit behavior.

Verification: normalization, uniqueness, immutable code, system-record protection, referenced-record deactivation/delete, export filter parity.

### Slice 4 — Composite masters

1. **WHT Form**
   - code and description
   - GL account and Cost Center mapping
   - account-driven dimension categories and values
   - reset dependent Cost Center/dimension values when account changes
   - vendor/AP/WHT reconciliation dependencies

2. **Asset Category**
   - code, description, integer asset life
   - three required account/Cost Center legs: asset cost, accumulated depreciation, depreciation expense
   - validate account category/nature for each leg
   - inheritance contract for Asset Register
   - asset register/disposal dependency protection

Verification: mapping validity at effective/posting date, account-change reset, three-leg completeness, inheritance snapshot, and dependency rules.

### Slice 5 — AP backend integration

Keep the current AP screens, replace only the repository implementation behind `use-accounts-payable.ts`:

- HTTP repository selected by environment/config; mock remains test/dev fixture only
- server-side invoice/payment directories
- canonical duplicate invoice check
- PO/GRN matching and tolerance results
- tax invoice and WHT rule resolution from master data
- workflow assignments and backend capabilities
- posted open items, reservation/application, payment proposal grouping
- release/execution/posting as separate idempotent commands
- activity, source evidence, generated JV, and reconciliation links

Do not redesign AP screens during adapter integration unless the API exposes a missing required state. This keeps visual changes separate from accounting-integrity changes.

Verification follows `accounts-payable-implementation-readiness.md`; no capability becomes `integrated` until frontend adapter, backend endpoint, contract tests, and smoke tests pass together.

### Slice 6 — GL integration and reconciliation

- replace JV mock repository with HTTP adapter
- bind JV prefix, COA, Department/Cost Center, and Dimension lookups to active/effective master data
- enforce source-generated JV read-only policy
- connect AP Accounting Events through Journal Staging
- add AP control-account reconciliation drill-down
- verify schedule, auto-reverse, period lock, idempotency, and source trace

Do not copy the Drive GL page's Supabase setup, dark-mode implementation, Swagger screen, or local master editor. Existing Carmen shell, theme, API client, and configuration modules own those concerns.

## 6. Backend work required

This frontend repository cannot complete the plan alone. Backend deliverables:

- migrations and unique/foreign/check constraints
- dependency queries and authorized reference summaries
- balance/usage guardrails inside the same transaction as status/delete mutation
- immutable audit events and blocked-attempt audit
- capability evaluation and RBAC/SoD enforcement
- active/effective lookup endpoints
- AP open-item locking, payment idempotency, WHT/FX calculation, posting events, and reconciliation
- OpenAPI plus test fixtures for frontend contract tests

Database constraints, not client validation, are the final protection for duplicate codes, one-default rules, referential integrity, and accounting balances.

## 7. Frontend test matrix

Every new or substantially changed page must cover:

- loading, empty, error, populated, view, create, edit, read-only, permission-denied, dependency-blocked, stale-version, and mobile states
- keyboard access, focus return, labels, dialog titles/descriptions, and destructive confirmation
- server pagination/filter/sort and URL state where applicable
- field normalization and backend field-error mapping
- no hidden mock fallback in production configuration
- `bunx tsc --noEmit`, targeted Vitest, React Doctor, and a production build before handoff

## 8. Recommended execution order

```text
Contract decisions
  -> Account Grouping + Dimension + Department/Cost Center
  -> COA enhancement
  -> WHT Service Type + WHT Form + Payment Type + JV Prefix
  -> Title + Asset Category
  -> AP HTTP integration
  -> GL HTTP integration + AP/GL reconciliation
```

The first implementation PR should be Slice 0 contract decisions plus one vertical master slice, preferably Account Code Grouping. It proves list, form, validation, permission, dependency, audit, and backend integration without coupling the first delivery to AP payment complexity.
