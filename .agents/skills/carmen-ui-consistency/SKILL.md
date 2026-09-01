---
name: carmen-ui-consistency
description: Build new Carmen frontend pages by reusing the repository's existing layout, components, tokens, and interaction patterns. Use when creating or substantially changing React pages, routes, list views, detail views, forms, settings, tables, filters, or toolbars in the Carmen frontend.
---

# Carmen UI Consistency

## Non-negotiable rule

A new page must look and behave like an existing page of the same family before adding custom UI. Reuse shared components first; create a new component only when an existing one cannot express the requirement.

## Required workflow

1. Identify the closest reference page (list, detail, settings, form, or report).
2. Read its route, representative component, and any shared primitives it uses.
3. Copy the page skeleton and composition pattern before changing labels or domain fields.
4. Use shared components for headers, toolbars, buttons, fields, selects, filters, tables, cards, empty states, loading states, and responsive layouts.
5. Keep existing spacing, typography, sizing, border radius, status colors, and responsive breakpoints. Do not invent one-off values without a documented reason.
6. Verify all states: loading, empty, error, view, edit, disabled, long text, mobile, and permission-restricted actions.
7. Run TypeScript, the relevant build, and React Doctor. Compare the changed page against its reference at desktop and mobile widths.

## Component reuse map

- Page title: `DocumentListHeader`
- List toolbar: `SearchInput`, `StatusFilter`, `DataGridSortMenu`, `DataGridColumnVisibility`
- Tables: `DataGrid`, `DataGridTable`, `DataGridContainer`, `DataGridColumnHeader`
- Settings/forms: `SettingSection`, `Field`, `FieldLabel`, `FieldInput`, `FieldPlainText`
- Cards and mobile list: `ListCard`, `ListCardRow`
- Actions: shared `Button` variants and sizes, normally `size="sm"` in toolbars
- Feedback: existing empty, skeleton, toast, badge, and error components

## Review gates

- No raw `<select>`, ad-hoc search input, or bespoke table when a shared equivalent exists.
- No oversized page title or primary button compared with the reference page.
- No duplicated header/card/toolbar patterns without a strong reason.
- New reusable patterns must be extracted and documented instead of copied three times.
