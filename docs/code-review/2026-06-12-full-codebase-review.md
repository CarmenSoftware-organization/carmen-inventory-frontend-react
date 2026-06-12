# Full Codebase Review — 2026-06-12

Multi-agent workflow review of the entire Vite + React Router SPA (~168k LOC, ~1,150 files). 17 zones reviewed in parallel; every medium+ finding was adversarially verified by 3 skeptic lenses (correctness / security / reproducibility) — a finding is *confirmed* only when ≥2 of 3 skeptics failed to refute it. Fixes were applied on branch `review/full-codebase-fixes`.

## Summary

- **Confirmed findings:** 54 — **45 fixed**, 9 backlog
- **By severity:** high 12, medium 42
- **By category:** correctness 50, perf 1, security 3
- **By effort:** quick-win 29, medium 22, large 3
- **Rejected by verification:** 8  ·  **Low-severity notes:** 110
- **Verification:** all gates green after fixes — `tsc --noEmit` clean, 295 tests pass (288 + 7 new regression tests), lint 0 errors
- **routes-dashboard:** workflow agent failed (API Overloaded, then monthly spend limit on resume); reviewed inline — no confirmed bugs, only minor notes

### Coverage

| Zone | Status | Findings | Confirmed | Rejected | Low |
|---|---|--:|--:|--:|--:|
| infra | reviewed | 9 | 3 | 0 | 6 |
| components-ui | reviewed | 13 | 3 | 1 | 9 |
| components-app | reviewed | 10 | 4 | 1 | 5 |
| hooks | reviewed | 9 | 4 | 1 | 4 |
| types-utils | reviewed | 9 | 2 | 0 | 7 |
| routes-config | reviewed | 10 | 2 | 1 | 7 |
| routes-procurement-a | reviewed | 16 | 3 | 1 | 12 |
| routes-procurement-b | reviewed | 13 | 6 | 0 | 7 |
| routes-inventory | reviewed | 9 | 3 | 0 | 6 |
| routes-system-admin | reviewed | 12 | 4 | 1 | 7 |
| routes-vendor | reviewed | 13 | 6 | 0 | 7 |
| routes-operation-plan | reviewed | 6 | 2 | 0 | 4 |
| routes-store-operation | reviewed | 11 | 4 | 1 | 6 |
| routes-product | reviewed | 10 | 3 | 0 | 7 |
| routes-dashboard | NOT REVIEWED | 0 | 0 | 0 | 0 |
| routes-report | reviewed | 13 | 3 | 1 | 9 |
| config-build | reviewed | 9 | 2 | 0 | 7 |

## Fixed findings

| # | sev | cat | file:line | zone | what was fixed |
|--:|---|---|---|---|---|
| 1 | high | security | `hooks/use-logout.ts:17` | hooks | useLogout() never clears the auth session |
| 2 | high | correctness | `hooks/use-thai-address.ts:31` | hooks | All four hooks fetch static files /data/thai-provinces.json, /data/thai-districts.json, /data/thai-subdistricts.json, bu |
| 3 | high | correctness | `routes/operation-plan/equipment/_components/eq-form.tsx:121` | routes-operation-plan | After a successful CREATE, EquipmentForm stays on /operation-plan/equipment/new and only does resetImage() + setMode("vi |
| 4 | high | correctness | `routes/procurement/purchase-order/from-price-list/_components/step-select-items.tsx:164` | routes-procurement-a | In the from-price-list wizard, editing a location's order_qty (handleLocationChange) or adding/removing locations only u |
| 5 | high | correctness | `routes/procurement/approval/_components/approval-component.tsx:74` | routes-procurement-b | Approval queue pagination is broken |
| 6 | high | correctness | `routes/product-management/category/_components/category-form.tsx:94` | routes-product | useEffect calls form.reset(defaultValues) with deps [defaultValues, form], but defaultValues is rebuilt by an IIFE on ev |
| 7 | high | correctness | `routes/external/pl/_components/price-list-external-component.tsx:108` | routes-report | The expired-link branch is dead code |
| 8 | high | correctness | `routes/system-admin/role/_components/role-component.tsx:56` | routes-system-admin | Desktop list path computes totalRecords as items.length (current page size) instead of the server total: `const totalRec |
| 9 | high | correctness | `routes/vendor-management/vendor/_components/vendor-address.tsx:144` | routes-vendor | Thai address data files are missing from the repo |
| 10 | high | correctness | `routes/vendor-management/request-price-list/_components/rfp-form.tsx:223` | routes-vendor | After a successful edit-save, form.reset(values) keeps vendors.add / vendors.remove populated |
| 11 | medium | correctness | `components/navbar/notification.tsx:313` | components-app | NotificationDetailDialog renders the external-link button label with t("open") under the "navbar" namespace, but the key |
| 12 | medium | correctness | `components/navbar/path-breadcrumb.tsx:94` | components-app | PathBreadcrumb uses <BreadcrumbLink href={href}> without asChild |
| 13 | medium | correctness | `components/i18n-provider.tsx:45` | components-app | The locale message chunk is loaded with `void load().then(...)` with no .catch |
| 14 | medium | correctness | `components/ui/comment-sheet.tsx:334` | components-ui | Double-submit race: the textarea Enter handler (line 724) and edit-mode Enter handler (line 459) call handleSubmit/handl |
| 15 | medium | correctness | `hooks/use-exchange-rate.ts:134` | hooks | useExternalExchangeRates uses raw fetch("/api/exchange-rate?base=...") — the old Next.js API route |
| 16 | medium | correctness | `lib/http-client.ts:224` | infra | After a successful token refresh, the 401 retry response is returned raw: `if (refreshed) return safeFetch(url, init);`  |
| 17 | medium | correctness | `lib/safe-storage.ts:10` | infra | getStore() dereferences `globalThis.sessionStorage` / `globalThis.localStorage` directly |
| 18 | medium | correctness | `lib/date-utils.ts:131` | infra | isoToDateInput() converts via `d.toISOString().split("T")[0]`, which yields the UTC calendar date, while formatDate()/fo |
| 19 | medium | correctness | `routes/config/currency/_components/currency-dialog.tsx:272` | routes-config | In readOnly (view) mode, the only footer button is rendered with label tc("close") but is disabled via `disabled={isPend |
| 20 | medium | correctness | `routes/config/location/_components/location-form.tsx:198` | routes-config | After a successful update, onSuccess only calls setMode("view") and never resets the form, so the accumulated transfer d |
| 21 | medium | correctness | `routes/procurement/purchase-request-template/_components/prt-item-table.tsx:42` | routes-procurement-b | `setProductToItem` writes the whole item via `form.setValue(`items.${index}`, {...})` without `shouldDirty: true`, bypas |
| 22 | medium | correctness | `routes/procurement/goods-receive-note/_components/grn-product-cards.tsx:102` | routes-procurement-b | In `ManualProductCell`, when a manual product group has multiple location rows, only the primary row's product_id goes t |
| 23 | medium | correctness | `routes/product-management/product/_components/pd-component.tsx:89` | routes-product | The category/sub_category/item_group filters use raw useURL setters, which do NOT reset the page param — unlike the stat |
| 24 | medium | correctness | `routes/report/list/_components/report-param-dialog.tsx:149` | routes-report | Race condition: DateControlInner initializes its value with useState(initial), where initial = resolveDateKeyword(node.v |
| 25 | medium | perf | `routes/store-operation/store-requisition/_components/sr-component.tsx:128` | routes-store-operation | On desktop both list queries are always enabled (`useMyPendingStoreRequisition` and `useStoreRequisition` both get `enab |
| 26 | medium | correctness | `routes/system-admin/workflow/_components/wf-routing.tsx:245` | routes-system-admin | Missing i18n key: `tfl("field")` resolves to `field.field`, which does not exist in messages/en.json nor messages/th.jso |
| 27 | medium | correctness | `routes/system-admin/workflow/[id]/_content.tsx:11` | routes-system-admin | `useUser()` and `useProduct()` are called with no params, so the request goes out without page/perpage and the backend a |
| 28 | medium | correctness | `types/product.ts:137` | types-utils | createLocationSchema's z.preprocess for min_qty/max_qty/re_order_qty/par_qty checks only `v === "" \|\| v === undefined \|\| |
| 29 | medium | security | `constant/api-endpoints.ts:188` | types-utils | PRICE_LIST_EXTERNAL and PRICE_LIST_EXTERNAL_CHECK (lines 188-191) interpolate `urlToken` raw into the request path |
| 30 | medium | correctness | `routes/procurement/credit-note/_components/cn-component.tsx:459` | routes-procurement-b | Desktop grid view had no pagination — split into mobile infinite-scroll + paginated DataGrid grid branch (detail #43) |
| 31 | medium | correctness | `routes/procurement/purchase-request-template/_components/prt-component.tsx:348` | routes-procurement-b | Same desktop grid-view pagination gap — added paginated DataGrid grid branch (detail #44) |
| 32 | medium | correctness | `routes/product-management/product/_components/pd-component.tsx:270` | routes-product | Grid/mobile fetch errors swallowed — useGridPagination now surfaces error/refetch; renders ErrorState in grid (detail #45) |
| 33 | medium | correctness | `routes/system-admin/role/_components/role-component.tsx:67` | routes-system-admin | Grid/mobile fetch errors swallowed across all 8 system-admin lists — each now renders ErrorState with retry (detail #50) |
| 34 | medium | correctness | `components/keyboard-shortcuts-dialog.tsx:20` | components-app | Removed advertised g-prefix/n shortcuts that had no handler; kept only the implemented ? / Esc entries (detail #32) |
| 35 | medium | correctness | `components/ui/tree-product-lookup.tsx:119` | components-ui | Path-qualified sub-category/item-group node ids so the shared "uncategorized" fallback no longer collides across parents (detail #33) |
| 36 | medium | correctness | `scripts/deploy-s3.sh:24` | config-build | Mitigated via main.tsx `vite:preloadError` reload listener so stale sessions self-heal after a deploy (detail #35) |
| 37 | medium | correctness | `hooks/use-navigation-guard.ts:70` | hooks | Pop the leaked same-URL sentinel history entry on teardown when still on top; fixed stale Next.js comment (detail #36) |
| 38 | medium | correctness | `routes/store-operation/store-requisition/_components/sr-component.tsx:138` | routes-store-operation | useGridPagination got an optional resetKey; SR passes viewMode so toggling my-pending/all-document resets the infinite-scroll list instead of mixing both (detail #47) |
| 39 | medium | correctness | `routes/procurement/purchase-order/_components/use-po-form-handlers.ts:164` | routes-procurement-a | Submit-after-save uses the detail ids from the updatePo response, not the stale prop, so rows added/removed during edit submit correctly (detail #41) |
| 40 | medium | correctness | `routes/vendor-management/price-list-template/_components/plt-product-table.tsx:222` | routes-vendor | Stop excluding a row's own product_id so loaded multi-tier (duplicate) rows resolve their label instead of a placeholder (detail #54) |
| 41 | medium | correctness | `routes/procurement/purchase-order/from-price-list/_components/step-select-items.tsx:117` | routes-procurement-a | Resolve the picked currency's exchange_rate via useCurrency instead of leaving the default 1 on a foreign-currency PO; reset to 1 when items cleared (detail #40) |
| 42 | medium | correctness | `routes/inventory-management/inventory-adjustment/_components/ia-item-table.tsx:86` | routes-inventory | Do not mount the cost probe in view mode — it was overwriting an existing adjustment's saved costs (with shouldDirty) on open (detail #38) |
| 43 | medium | correctness | `routes/procurement/credit-note/_components/cn-form.tsx:92` | routes-procurement-b | View-mode resync effect (keyed on doc_version) so a second consecutive edit carries the current doc_version, not the stale pre-save one (detail #42) |
| 44 | medium | correctness | `routes/vendor-management/vendor/_components/vendor-form.tsx:207` | routes-vendor | View-mode resync effect (keyed on updated_at) so newly-added address/contact rows pick up server ids and are not re-sent as new on the next edit (detail #51) |
| 45 | medium | correctness | `routes/vendor-management/price-list/_components/pl-form.tsx:151` | routes-vendor | View-mode resync effect (keyed on a pricelist_detail id signature, since PriceList has no version field) so new detail rows pick up server ids (detail #52) |

## Backlog (not fixed in this pass)

### Needs a decision / backend / CI change

- **`components/ui/comment-sheet.tsx:149`** [high/correctness] — attachment <img>/<a> use the dead /api/proxy path; correct fix needs an authed-blob fetch hook across multiple call sites (thumbnails, lightbox, downloads) AND live backend verification (download endpoint auth/presign behavior unknown)
- **`routes/inventory-management/_shared/entry-notes-dialog.tsx:388`** [high/correctness] — same /api/proxy <img> class as comment-sheet; needs authed-blob fetch + live backend verification
- **`package.json:48`** [medium/security] — xlsx pinned via cdn.sheetjs.com tarball with no integrity hash — fix is a CI/supply-chain change (vendor the tarball or add checksum verification), out of scope for a code PR
- **`routes/inventory-management/spot-check/_components/sc-entry-component.tsx:146`** [medium/correctness] — spot-check counted-semantics change is behavior-altering and needs a product decision (is 0 a valid count?)
- **`routes/operation-plan/recipe/_components/recipe-form-schema.ts:197`** [medium/correctness] — finding assumed Recipe carries info/dimension, but those live on CreateRecipeDto not the Recipe GET type — cannot round-trip as suggested; needs backend null-vs-omit semantics confirmed

### Deferred medium/large-effort findings

Confirmed but lower priority; left for a follow-up pass.

| sev | cat | effort | file:line | zone | description |
|---|---|---|---|---|---|
| medium | correctness | medium | `routes/external/pl/_components/price-list-external-product-table.tsx:138` | routes-report | Edit mode lets the vendor edit item-level price, moq_qty, price_without_tax, tax_amt and lead_time_days (handleItemFieldChange marks the for |
| medium | correctness | large | `hooks/use-wastage-report.ts:11` | routes-store-operation | The entire wastage-reporting module (routes/store-operation/wastage-reporting list, [id] and new pages) is backed by mock data (`wrMockData` |
| medium | correctness | large | `routes/store-operation/stock-replenishment/_components/stock-repl-component.tsx:145` | routes-store-operation | `handleCreatePR` and `handleCreateSR` are no-ops: they call `getSelectedProducts()` and discard the result |
| medium | correctness | large | `routes/vendor-management/price-list-template/_components/use-plt-form-actions.ts:62` | routes-vendor | Template edit only ever sends products: { add: <entire flattened list> } when details are dirty, and sends products: {} when the user has re |

## Finding detail (confirmed)

### 1. [HIGH/security] `hooks/use-logout.ts:17` — ✅ fixed
*zone: hooks · effort: quick-win · confidence: 0.85*

useLogout() never clears the auth session. It POSTs API_ENDPOINTS.LOGOUT via httpClient (with no refresh_token in the body) and then redirects with window.location.href = "/login", but it never calls tokenStore.clear() or refreshTokenStorage.clear(). The refresh token therefore stays in localStorage, and on the very next boot main.tsx runs refreshTokens(), which silently restores the session. A proper logout() already exists in lib/auth/auth-api.ts (clears session via clearSession() AND sends { refresh_token } so the backend can revoke it) but no UI code uses it — components/navbar/user-profile.tsx and both change-password components all use this hook. Unless the backend revokes all refresh tokens from the bare logout call, 'Logout' on a shared machine leaves a fully resumable session in localStorage.

**Suggested fix:** Reimplement useLogout's mutationFn to call logout() from @/lib/auth/auth-api (which clears tokenStore + refreshTokenStorage and sends the refresh_token for server-side revocation), keeping queryClient.clear() + redirect in onSettled. At minimum, clear refreshTokenStorage and tokenStore before redirecting.

### 2. [HIGH/correctness] `hooks/use-thai-address.ts:31` — ✅ fixed
*zone: hooks · effort: quick-win · confidence: 0.9*

All four hooks fetch static files /data/thai-provinces.json, /data/thai-districts.json, /data/thai-subdistricts.json, but public/ in this repo contains only config.json and config.sample.json — the public/data/ directory was never copied from the source app (it exists at ../carmen-inventory-frontend/public/data/). Nothing in vite.config or deploy scripts generates these files. Consumers (components/lookup/lookup-thai-{province,district,subdistrict}.tsx and routes/vendor-management/vendor/_components/vendor-address.tsx) are live, so Thai province/district/subdistrict lookups and postal-code reverse lookup are broken: 404 in dev, or on SPA static hosting the fallback serves index.html with 200 and res.json() throws.

**Suggested fix:** Copy ../carmen-inventory-frontend/public/data/thai-{provinces,districts,subdistricts}.json into public/data/ in this repo.

### 3. [HIGH/correctness] `routes/operation-plan/equipment/_components/eq-form.tsx:121` — ✅ fixed
*zone: routes-operation-plan · effort: quick-win · confidence: 0.7*

After a successful CREATE, EquipmentForm stays on /operation-plan/equipment/new and only does resetImage() + setMode("view") — it never navigates away, never stores the created id, and never resets the form. The toolbar then shows an Edit button (eq-toolbar.tsx line 100); clicking Edit and Save re-enters onSubmit where `isEdit && equipment` is false (the `equipment` prop is undefined on the new page), so the else-branch runs createEquipment.mutate again and creates a DUPLICATE record. Additionally form.formState.isDirty stays true after save, so the discard dialog fires spuriously on later Cancel. The sibling forms (cuisine-form.tsx, recipe-form.tsx, recipe-category-form.tsx) all router.push back to the list on create success — eq-form is the odd one out. (Behavior is byte-identical to the source Next.js app, i.e. inherited, but real.)

**Suggested fix:** In the create onSuccess, navigate like the other forms: `router.push("/operation-plan/equipment")` (or push to `/operation-plan/equipment/${created.id}` using the mutation response). Also call form.reset(values) after a successful update so isDirty is cleared.

### 4. [HIGH/correctness] `routes/procurement/purchase-order/from-price-list/_components/step-select-items.tsx:164` — ✅ fixed
*zone: routes-procurement-a · effort: medium · confidence: 0.6*

In the from-price-list wizard, editing a location's order_qty (handleLocationChange) or adding/removing locations only updates items[i].locations — the item-level order_qty, base_qty, sub_total_price, net_amount, tax_amount and total_price keep the initial moq-based values set in detailToItem(). The regular PO form keeps these in sync via PoItemComputedSync (po-item-table.tsx), but that component is never mounted in the wizard. buildPoPayload/mapItemToPayload send the stale item-level qty/amounts, so the created PO's order_qty and amounts contradict its locations (and the totals shown in StepSummary, which correctly recomputes from locations for display only).

**Suggested fix:** Recompute item-level order_qty/base_qty/sub_total_price/net_amount/tax_amount/total_price inside handleLocationChange/handleAddLocation/handleRemoveLocation (reuse computeItemPricing from po-item-table.tsx), or recompute all items from locations immediately before buildPoPayload in handleConfirm (from-price-list/_content.tsx:242).

### 5. [HIGH/correctness] `routes/procurement/approval/_components/approval-component.tsx:74` — ✅ fixed
*zone: routes-procurement-b · effort: medium · confidence: 0.8*

Approval queue pagination is broken. `totalRecords = items.length` uses only the current page's item count, while the request is server-paginated (useDataGridState sends page/perpage with manualPagination:true). The real totals (`paginate.total` per PR/PO/SR section) are extracted in hooks/use-approval.ts `extractSection` but then discarded — `useApprovalPending` returns only `{ data: allItems }`. As a result `pageCount = Math.ceil(items.length / pageSize)` in approve-queue-list.tsx is always <= 1 (e.g. 10 items / perpage 10 = 1 page), so approvers can never navigate past the first page of pending documents, and the record-count display is wrong. The client-side doc_type filter compounds this by filtering within the already-truncated page.

**Suggested fix:** Return the section totals from useApprovalPending (e.g. `{ data, total: pr.total + po.total + sr.total }`, or per-section totals) and use that for `totalRecords` in approval-component.tsx. If the doc_type filter must remain client-side, either fetch all sections unpaginated for this screen or pass doc_type to the backend.

### 6. [HIGH/correctness] `routes/product-management/category/_components/category-form.tsx:94` — ✅ fixed
*zone: routes-product · effort: quick-win · confidence: 0.7*

useEffect calls form.reset(defaultValues) with deps [defaultValues, form], but defaultValues is rebuilt by an IIFE on every render (new object identity), so the effect fires after EVERY re-render of CategoryForm. The component subscribes to form.formState.errors (lines 150, 163, 182), so a failed validation submit triggers a re-render, which immediately re-runs the effect and resets the form back to defaults — wiping all user input AND clearing the just-shown error messages. The same happens when isPending toggles after a failed mutation (server error): the user's entered data is silently discarded. (Bug exists identically in the source Next.js app — faithfully ported, still broken.)

**Suggested fix:** Delete the useEffect entirely. CategoryForm is mounted fresh each time the dialog opens ({open && <CategoryForm/>} in category-dialog.tsx line 94), so useForm's defaultValues already initialize correctly; the reset-on-render effect is both unnecessary and destructive. If a reset is ever needed, key it on selectedNode?.id/parentNode?.id instead of the object identity.

### 7. [HIGH/correctness] `routes/external/pl/_components/price-list-external-component.tsx:108` — ✅ fixed
*zone: routes-report · effort: medium · confidence: 0.8*

The expired-link branch is dead code. usePriceListExternal calls httpClient.post(), and lib/http-client.ts handleClientErrors() intercepts every 401: it calls refreshTokens(), then tokenStore.clear() and throws ApiError(UNAUTHORIZED, 'Session expired', 401) — never the hook's HttpError. So `error instanceof HttpError && error.status === 401` is always false; an external vendor with an expired token sees a generic ErrorState saying 'Session expired' with a Retry button instead of the intended 'This link has expired' message. The retry predicate in hooks/use-price-list-external.ts (`error instanceof HttpError && error.status === 401`) also fails to match, so the query retries an expired public link 3 times, each attempt invoking the auth refresh flow on a public, unauthenticated page.

**Suggested fix:** In lib/http-client.ts, skip the 401 refresh/clear handling for /api/external/* URLs (public endpoints), letting the raw response reach the hook's handleResponse(); or in the component/hook, additionally match ApiError with status 401. Also fix the retry predicate accordingly.

### 8. [HIGH/correctness] `routes/system-admin/role/_components/role-component.tsx:56` — ✅ fixed
*zone: routes-system-admin · effort: quick-win · confidence: 0.85*

Desktop list path computes totalRecords as items.length (current page size) instead of the server total: `const totalRecords = useInfiniteScroll ? grid.totalRecords : items.length;`. Every sibling system-admin module uses `data?.paginate?.total ?? 0` (user, workflow, period, running-code, activity-log, document, user-activity). Consequences: useRoleTable pageCount = ceil(items.length/perpage) is always 1, so DataGridPagination can never navigate past page 1 when there are more roles than one page, and the header badge shows the page row count, not the total. (Bug also exists in the source Next app, so it survived migration unfixed.)

**Suggested fix:** Change to `const totalRecords = useInfiniteScroll ? grid.totalRecords : (data?.paginate?.total ?? 0);` matching the other modules.

### 9. [HIGH/correctness] `routes/vendor-management/vendor/_components/vendor-address.tsx:144` — ✅ fixed
*zone: routes-vendor · effort: quick-win · confidence: 0.9*

Thai address data files are missing from the repo. vendor-address.tsx fetches /data/thai-subdistricts.json, /data/thai-districts.json and /data/thai-provinces.json (also via hooks/use-thai-address.ts and the LookupThai* components), but public/ contains only config.json — the source app's public/data/thai-{provinces,districts,subdistricts}.json were never copied during the Next->Vite migration and no build script copies them. In an SPA, these URLs hit the index.html fallback, so res.json()/r.json() throws. Result: postal-code autofill and the province/district/subdistrict dropdowns in the vendor address form are completely broken, with unhandled promise rejections on every postal-code keystroke.

**Suggested fix:** Copy ../carmen-inventory-frontend/public/data/thai-provinces.json, thai-districts.json and thai-subdistricts.json into public/data/ in this repo.

### 10. [HIGH/correctness] `routes/vendor-management/request-price-list/_components/rfp-form.tsx:223` — ✅ fixed
*zone: routes-vendor · effort: quick-win · confidence: 0.7*

After a successful edit-save, form.reset(values) keeps vendors.add / vendors.remove populated. The update mutation invalidates the REQUEST_PRICE_LISTS key prefix (useApiMutation onSettled), which refetches useRequestPriceListById, so requestPriceList.vendors now includes the just-added vendors. displayVendors = existingVendors (from the refreshed prop) + addedVendors (still in form state) then renders each newly added vendor twice in view mode, and pressing Edit -> Save again re-sends the same vendors in vendors.add, creating duplicates server-side.

**Suggested fix:** On update success reset with cleared deltas: form.reset({ ...values, vendors: { add: [], remove: [] } }) (or re-derive defaults from the refetched RFP via getDefaultValues).

### 11. [HIGH/correctness] `components/ui/comment-sheet.tsx:149` — 📋 backlog
*zone: components-ui · effort: medium · confidence: 0.8*

Migration leftover: resolveAttachmentUrl builds '/api/proxy/...' URLs that are used directly as <img src> and <a href> (attachment thumbnails, lightbox images, download links). In the Next.js source app, app/api/proxy/[...path]/route.ts was a real server route, but in this SPA the '/api/proxy/' prefix is rewritten to ${BACKEND_URL} ONLY inside lib/http-client.ts (fetch level). Plain <img>/<a> requests bypass that rewrite, so: (1) S3/CloudFront mode — the relative URL hits the static host and the SPA fallback returns index.html (broken images, download link opens the app); (2) Docker nginx mode — nginx forwards '/api/proxy/api/...' verbatim to the backend, which has no /api/proxy route → 404; (3) dev Vite proxy — same 404. Additionally no Authorization header can be attached to bare <img>/<a> requests, so even with a correct URL an auth-protected download endpoint would 401. CommentSheet is used by PR/PO/GRN/CN/SR comment sheets, so attachments are broken in every deployment mode.

**Suggested fix:** Resolve attachment URLs through the runtime config like http-client does: `const { BACKEND_URL } = getRuntimeConfig(); url = \`${BACKEND_URL}${fileUrl}\`` (no '/api/proxy' prefix). If the download endpoint requires the Bearer token, fetch the file via httpClient as a blob and use URL.createObjectURL for <img src> / programmatic download instead of direct hrefs.

**Backlog reason:** attachment <img>/<a> use the dead /api/proxy path; correct fix needs an authed-blob fetch hook across multiple call sites (thumbnails, lightbox, downloads) AND live backend verification (download endpoint auth/presign behavior unknown)

### 12. [HIGH/correctness] `routes/inventory-management/_shared/entry-notes-dialog.tsx:388` — 📋 backlog
*zone: routes-inventory · effort: medium · confidence: 0.55*

Stale Next.js idiom survived the migration: resolveServerImageUrl() builds evidence-image URLs of the form /api/proxy/api/{bu}/documents/{id}/download (and rewrites relative '/api/...' fileUrls to '/api/proxy/api/...'). These URLs are consumed as raw <img src> in EntryNotesDialog/ImageThumb (used by pc-entry-notes-dialog.tsx:51 and sc-entry-notes-dialog.tsx:48). In the Next.js source app /api/proxy/[...path] was a real server route that proxied and attached auth; in this SPA the '/api/proxy/' prefix is only rewritten inside lib/http-client.ts fetches (PROXY_PREFIX, lib/http-client.ts:81), which an <img> tag never goes through. Verified the deployment paths: S3/CloudFront static hosting has no /api route at all (404); the Vite dev proxy and docker/nginx.conf.template `location /api/` both forward the path verbatim, so the backend receives /api/proxy/api/... which it does not serve; and <img> requests cannot carry the in-memory Bearer token, so even a correct path to an authenticated download endpoint would 401. Net effect: server-stored note evidence images render as broken thumbnails in every SPA deployment mode whenever the backend returns a relative fileUrl or only a fileToken (absolute fileUrls are the only case that still works).

**Suggested fix:** Resolve the image URL against runtime config instead of the dead Next proxy: build `${BACKEND_URL}/api/{bu}/documents/{id}/download/...` from getRuntimeConfig(), and fetch the image via httpClient (which attaches Authorization/x-app-id) into a blob/object URL — e.g. a small useAuthedImage hook — or have the backend return presigned/absolute URLs. At minimum, stop prefixing '/api/proxy'.

**Backlog reason:** same /api/proxy <img> class as comment-sheet; needs authed-blob fetch + live backend verification

### 13. [MEDIUM/correctness] `components/navbar/notification.tsx:313` — ✅ fixed
*zone: components-app · effort: quick-win · confidence: 0.9*

NotificationDetailDialog renders the external-link button label with t("open") under the "navbar" namespace, but the key "navbar.open" does not exist in messages/en.json or messages/th.json (verified: only "navbar.shortcutOpen" exists). use-intl will log a missing-message error and render the raw key/fallback text on the Open button whenever a notification has an external link.

**Suggested fix:** Add "open": "Open" (en) / appropriate Thai translation (th) under the navbar namespace in messages/{en,th}.json, or reuse an existing common key.

### 14. [MEDIUM/correctness] `components/navbar/path-breadcrumb.tsx:94` — ✅ fixed
*zone: components-app · effort: quick-win · confidence: 0.85*

PathBreadcrumb uses <BreadcrumbLink href={href}> without asChild. BreadcrumbLink (components/ui/breadcrumb.tsx line 45) renders a plain <a> when asChild is not set, so clicking any breadcrumb segment triggers a full page reload instead of an SPA navigation. This drops all client state and the in-memory access token (forcing a refresh-token boot cycle) on every breadcrumb click — a regression from the Next.js Link behavior.

**Suggested fix:** Render <BreadcrumbLink asChild><Link href={href}>{label}</Link></BreadcrumbLink> using @/lib/compat/link (or react-router's Link) so navigation stays client-side.

### 15. [MEDIUM/correctness] `components/i18n-provider.tsx:45` — ✅ fixed
*zone: components-app · effort: quick-win · confidence: 0.7*

The locale message chunk is loaded with `void load().then(...)` with no .catch. If the dynamic import rejects (classic stale-chunk-after-redeploy failure on S3/CDN hosting, or transient network error), `messages` stays null forever and the provider returns null — the entire app renders a permanent blank screen with only an unhandled promise rejection in the console. There is no retry or fallback path.

**Suggested fix:** Add a .catch that falls back to the default locale loader (or a statically imported en bundle) and/or surfaces a retry UI, e.g. load().then(...).catch(() => loadFallbackMessages()).

### 16. [MEDIUM/correctness] `components/ui/comment-sheet.tsx:334` — ✅ fixed
*zone: components-ui · effort: quick-win · confidence: 0.7*

Double-submit race: the textarea Enter handler (line 724) and edit-mode Enter handler (line 459) call handleSubmit/handleUpdate directly without checking isSubmitting/isUpdating/isUploading. The Send/Save buttons are disabled while pending, but pressing Enter repeatedly while a mutation is in flight posts the same comment multiple times.

**Suggested fix:** Add guards at the top of handleSubmit (`if (isSubmitting || isUploading) return;`) and handleUpdate (`if (isUpdating) return;`).

### 17. [MEDIUM/correctness] `hooks/use-exchange-rate.ts:134` — ✅ fixed
*zone: hooks · effort: quick-win · confidence: 0.85*

useExternalExchangeRates uses raw fetch("/api/exchange-rate?base=...") — the old Next.js API route. This URL bypasses http-client's BACKEND_URL rewrite, and no backend endpoint exists yet (documented open item in CLAUDE.md). On S3/GCS static hosting the SPA fallback returns index.html with HTTP 200, so res.ok is true and res.json() throws a parse error which is then retried 3 times with backoff (4 wasted request cycles per mount). The hook always runs when baseCurrency is set, so it cannot be turned off by deployments that know the endpoint is absent.

**Suggested fix:** Until the backend endpoint exists, gate the query behind a runtime-config flag (e.g. enabled: !!getRuntimeConfig().EXCHANGE_RATE_API) or validate the response Content-Type is application/json before parsing, and set retry: false for non-retryable shapes.

### 18. [MEDIUM/correctness] `lib/http-client.ts:224` — ✅ fixed
*zone: infra · effort: quick-win · confidence: 0.7*

After a successful token refresh, the 401 retry response is returned raw: `if (refreshed) return safeFetch(url, init);` bypasses handleClientErrors entirely. If the retried request comes back 401 again (refresh returned a token the backend still rejects), the session is NOT cleared, so RequireAuth never redirects and the user is stuck with failing requests. A 403 on the retry also won't dispatch the `permission-denied` event, and a 429 won't be normalized to a RATE_LIMITED ApiError. Tests in lib/http-client.test.ts only cover the retry-success and refresh-failure paths, not a second 401/403/429 on retry.

**Suggested fix:** Pass the retry response through a limited error handler, e.g. add an `isRetry` flag: on retry, handle 403/429 normally, and on a second 401 call tokenStore.clear() and throw ApiError(UNAUTHORIZED, "Session expired", 401) instead of returning the raw response (no further refresh attempt to avoid loops).

### 19. [MEDIUM/correctness] `lib/safe-storage.ts:10` — ✅ fixed
*zone: infra · effort: quick-win · confidence: 0.6*

getStore() dereferences `globalThis.sessionStorage` / `globalThis.localStorage` directly. In browsers where storage access is denied (Chrome with 'block all cookies', sandboxed iframes), the property access itself throws a SecurityError, so getItem/setItem/removeSessionItem propagate the exception and crash callers — contradicting the docstring's claim that blocked storage 'degrades gracefully instead of throwing'. Note lib/auth/refresh-token-storage.ts correctly wraps every access in try/catch, but this module does not.

**Suggested fix:** Wrap the storage property access in getStore() in a try/catch and return undefined on throw (and wrap removeSessionItem's removeItem call too).

### 20. [MEDIUM/correctness] `lib/date-utils.ts:131` — ✅ fixed
*zone: infra · effort: quick-win · confidence: 0.55*

isoToDateInput() converts via `d.toISOString().split("T")[0]`, which yields the UTC calendar date, while formatDate()/formatLocalizedDate() in the same file use local-time getters (getDate/getMonth). For a UTC+7 deployment (Thailand), any timestamp from 17:00Z onward displays one date in read views and the previous date in `<input type="date">` edit fields — an off-by-one between display and edit of the same record.

**Suggested fix:** Build the date-input value from local components: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` so it matches the local-time formatting used elsewhere (and update the UTC-based expectations in lib/__tests__/date-utils.test.ts accordingly).

### 21. [MEDIUM/correctness] `routes/config/currency/_components/currency-dialog.tsx:272` — ✅ fixed
*zone: routes-config · effort: quick-win · confidence: 0.85*

In readOnly (view) mode, the only footer button is rendered with label tc("close") but is disabled via `disabled={isPending || readOnly}`, so the Close button is permanently inert; the dialog can only be closed via the X icon or ESC. The same pattern exists in 8 sibling dialogs: adjustment-type-dialog.tsx:260, business-type-dialog.tsx:177, certification-dialog.tsx:198, credit-note-reason-dialog.tsx:177, credit-term-dialog.tsx:225, eco-dialog.tsx:191, extra-cost-dialog.tsx:174, tax-profile-dialog.tsx:200. (Inherited from the source Next.js app, but still a real UI defect.)

**Suggested fix:** Change the cancel/close button to `disabled={isPending}` only (readOnly should not disable closing) in all 9 config dialogs.

### 22. [MEDIUM/correctness] `routes/config/location/_components/location-form.tsx:198` — ✅ fixed
*zone: routes-config · effort: quick-win · confidence: 0.6*

After a successful update, onSuccess only calls setMode("view") and never resets the form, so the accumulated transfer deltas in form values `users.add/remove` and `products.add/remove` (built by transferHandler / handleProductSelectionChange) persist. If the user enters edit mode again and saves (e.g. only renames), the payload re-sends the previous add/remove deltas for users/products that were already applied, which can duplicate associations or fail on the backend. Same issue in department-form.tsx:174-183 for `department_users`/`hod_users`. (Behavior matches the source app, i.e. inherited.)

**Suggested fix:** In the update mutation's onSuccess, call `form.reset(getDefaultValues(<updated entity>))` (or at minimum reset the users/products transfer payload fields to { add: [], remove: [] }) so the next edit starts from clean deltas.

### 23. [MEDIUM/correctness] `routes/procurement/purchase-request-template/_components/prt-item-table.tsx:42` — ✅ fixed
*zone: routes-procurement-b · effort: quick-win · confidence: 0.6*

`setProductToItem` writes the whole item via `form.setValue(`items.${index}`, {...})` without `shouldDirty: true`, bypassing the Controller's `field.onChange`. RHF's dirtyFields are therefore not updated for that row. In PrtForm.onSubmit, `buildItemChanges` trusts `form.formState.dirtyFields.items` when it is defined: if the user also edited any other field through a normal input (which defines dirtyFields.items), an existing row whose ONLY change was the product selection will have an empty dirty entry and be silently excluded from the update payload — the product change is lost on save. (It only works today via the shallow-compare fallback when dirtyFields.items is undefined.) Note the credit-note equivalent (cn-item-table.tsx setProductToItem) correctly passes `{ shouldDirty: true }`.

**Suggested fix:** Pass `{ shouldDirty: true }` to the setValue call in setProductToItem (or set each field individually with shouldDirty: true, matching cn-item-table.tsx).

### 24. [MEDIUM/correctness] `routes/procurement/goods-receive-note/_components/grn-product-cards.tsx:102` — ✅ fixed
*zone: routes-procurement-b · effort: quick-win · confidence: 0.55*

In `ManualProductCell`, when a manual product group has multiple location rows, only the primary row's product_id goes through `field.onChange` (which marks it dirty); the sibling rows are updated via `form.setValue(`items.${idx}.product_id`, value)` without `shouldDirty: true`. When editing an existing GRN, `buildItemChanges` in use-grn-form-actions.ts uses dirtyFields.items (defined, because the primary row is dirty), so the sibling rows' product change is excluded from the PATCH's update array — the backend keeps the old product on those rows while the primary row is updated, leaving the group inconsistent.

**Suggested fix:** Add `{ shouldDirty: true }` to the sibling `form.setValue` calls for `product_id` and `product_name` inside the loop.

### 25. [MEDIUM/correctness] `routes/product-management/product/_components/pd-component.tsx:89` — ✅ fixed
*zone: routes-product · effort: quick-win · confidence: 0.85*

The category/sub_category/item_group filters use raw useURL setters, which do NOT reset the page param — unlike the status filter and search, which go through useListPageState.handleSetFilter/handleSetSearch (hooks/use-list-page-state.ts lines 40-48 call setPage("")). If the user is on page > 1 and applies/changes one of these three filters, the list re-queries with the stale page number and can render an empty page even though matching records exist on page 1.

**Suggested fix:** Wrap the three setters to also reset the page, e.g. const setCategoryFilterAndResetPage = (v: string) => { setCategoryFilter(v); handlePageChange/setPage(""); } — or pass an onUpdate option to useURL that clears the page param, mirroring handleSetFilter in use-list-page-state.ts.

### 26. [MEDIUM/correctness] `routes/report/list/_components/report-param-dialog.tsx:149` — ✅ fixed
*zone: routes-report · effort: quick-win · confidence: 0.7*

Race condition: DateControlInner initializes its value with useState(initial), where initial = resolveDateKeyword(node.value, periods). periods comes from the async useReportListLookups query, which is empty ({}) on the dialog's first render. For fields using '@current_period'/'@previous_period', the date locks to the calendar-month fallback computed before the periods arrive, and never updates when the query resolves (useState initializer runs once; there is no effect syncing `initial` to state). Reports get run with wrong period dates on first open.

**Suggested fix:** Either delay rendering the form until the lookups query (when includePeriods) has resolved, or add an effect in DateControlInner that resets the value when `initial` changes while the field is untouched, or key DateControlInner by the resolved initial value.

### 27. [MEDIUM/perf] `routes/store-operation/store-requisition/_components/sr-component.tsx:128` — ✅ fixed
*zone: routes-store-operation · effort: quick-win · confidence: 0.9*

On desktop both list queries are always enabled (`useMyPendingStoreRequisition` and `useStoreRequisition` both get `enabled: !useInfiniteScroll`) although only the one matching `viewMode` is rendered. Every search/filter/page change fires two network requests to two endpoints; the unused one is pure waste. (Inherited from the source app, but still a real cost.)

**Suggested fix:** Gate each query on viewMode: `useMyPendingStoreRequisition(queryParams, { enabled: !useInfiniteScroll && viewMode === "my-pending" })` and the inverse for the all-document query.

### 28. [MEDIUM/correctness] `routes/system-admin/workflow/_components/wf-routing.tsx:245` — ✅ fixed
*zone: routes-system-admin · effort: quick-win · confidence: 0.95*

Missing i18n key: `tfl("field")` resolves to `field.field`, which does not exist in messages/en.json nor messages/th.json (verified programmatically — this is the only missing key in the whole zone). use-intl will log an error and render the raw fallback for the condition-field label in the workflow routing rule editor.

**Suggested fix:** Add `"field": "Field"` to the `field` namespace in messages/en.json and `"field": "ฟิลด์"` in messages/th.json (or reuse an existing key such as a dedicated systemAdmin.workflow key).

### 29. [MEDIUM/correctness] `routes/system-admin/workflow/[id]/_content.tsx:11` — ✅ fixed
*zone: routes-system-admin · effort: quick-win · confidence: 0.5*

`useUser()` and `useProduct()` are called with no params, so the request goes out without page/perpage and the backend applies its default pagination. The workflow detail's stage user-assignment picker and product list therefore only see the first page of users/products, silently hiding the rest. (Same code exists in the source app; contrast with user-assigned-form.tsx which deliberately passes `{ perpage: 999 }` for locations.)

**Suggested fix:** Pass `{ perpage: -1 }` (the convention used by usePermission/useDepartment callers in this repo) or an explicit large perpage to both hooks, or switch to a search-as-you-type lookup endpoint.

### 30. [MEDIUM/correctness] `types/product.ts:137` — ✅ fixed
*zone: types-utils · effort: quick-win · confidence: 0.85*

createLocationSchema's z.preprocess for min_qty/max_qty/re_order_qty/par_qty checks only `v === "" || v === undefined || Number.isNaN(v)` before falling through to Number(v). When the value is null — which is exactly what the product form initializes these fields to (pd-form.tsx:97, pd-location-tab.tsx:113 set `min_qty: null`) — Number(null) yields 0, so the validated output becomes 0 instead of null. Verified empirically against zod 4.4: parse(null) -> 0, parse("") -> null. Empty replenishment thresholds are therefore submitted to the backend as explicit 0 values, which is semantically different (0 = threshold of zero vs null = not set).

**Suggested fix:** Change the preprocess guard to also catch null, e.g. `(v) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v))` for all four fields (lines 137-140).

### 31. [MEDIUM/security] `constant/api-endpoints.ts:188` — ✅ fixed
*zone: types-utils · effort: quick-win · confidence: 0.7*

PRICE_LIST_EXTERNAL and PRICE_LIST_EXTERNAL_CHECK (lines 188-191) interpolate `urlToken` raw into the request path. This token comes from the public route param /pl/:url_token (user/attacker-controlled, React Router decodes percent-encoding), and hooks/use-price-list-external.ts also appends `/submit` for a POST. A crafted link like /pl/..%2F..%2Fsomething makes the SPA issue requests to arbitrary backend paths under BACKEND_URL after fetch path normalization. The file already contains a `toSafePathSegment` helper (blocks `/ ? # \`, `..`, encoded forms) but applies it only to the two notification endpoints — every other dynamic segment, including this user-controlled one, is unsanitized.

**Suggested fix:** Wrap urlToken with the existing toSafePathSegment: `PRICE_LIST_EXTERNAL: (urlToken) => `/api/external/api/pricelist-external/${toSafePathSegment(urlToken)}`` and same for PRICE_LIST_EXTERNAL_CHECK. Consider applying it to other id segments for defense in depth.

### 32. [MEDIUM/correctness] `components/keyboard-shortcuts-dialog.tsx:20` — ✅ fixed
*zone: components-app · effort: medium · confidence: 0.85*

The dialog advertises shortcuts that are not implemented anywhere in the codebase: "g d" (Dashboard), "g p" (Purchase Request), "g o" (Purchase Order), "g r" (GRN) and "n" (Create new). Grep across components/routes/hooks/lib finds no handler for these key sequences — only "?" and "/" are handled in this file, and Cmd/Ctrl+K in module-app.tsx. Users pressing the documented shortcuts get no response. Additionally all dialog strings are hardcoded English while the rest of the app is i18n'd via use-intl.

**Suggested fix:** Either implement the g-prefix navigation and "n" shortcuts (a small useEffect keydown state machine with useNavigate), or remove the unimplemented entries from SHORTCUTS. Move strings to messages/{en,th}.json.

**Fixed:** Removed the five unimplemented entries (g d/p/o/r, n); SHORTCUTS now lists only the live ? / / / Esc handlers (branch `review/backlog-deferred-fixes`). i18n of the dialog strings left as a separate, lower-priority polish item.

### 33. [MEDIUM/correctness] `components/ui/tree-product-lookup.tsx:119` — ✅ fixed
*zone: components-ui · effort: medium · confidence: 0.65*

buildTree uses the shared fallback id "uncategorized" for missing category/sub_category/item_group. leafIdsMap is keyed by node.id only, so when two different categories both contain an "uncategorized" sub-category (or item group), `map.set` overwrites the earlier entry — the group checkbox state (getCheckState) and toggleGroup for one category's Uncategorized node then operate on the OTHER category's products. Expand/collapse state (expandedIds keyed by the same id) also toggles all "uncategorized" nodes at once.

**Suggested fix:** Make node ids path-qualified, e.g. `${catId}/${subCatId}` and `${catId}/${subCatId}/${groupId}`, so fallback ids are unique per parent.

**Fixed:** buildTree now assigns `${catId}/${subCatId}` and `${catId}/${subCatId}/${groupId}` node ids (product leaves keep their real id); the find-by-id lookups use the qualified ids, so checkbox/expand state no longer cross-wires between two Uncategorized buckets (branch `review/backlog-deferred-fixes`).

### 34. [MEDIUM/security] `package.json:48` — 📋 backlog
*zone: config-build · effort: quick-win · confidence: 0.85*

The xlsx dependency is fetched as a raw URL tarball from cdn.sheetjs.com, and its bun.lock entry (bun.lock line 1093) has NO integrity hash — unlike every registry dependency, which carries a sha512. Every `bun install` (including the Docker build, which runs `bun install --frozen-lockfile` on a clean container) re-downloads the tarball with no checksum verification. If the SheetJS CDN is compromised or serves different content, the altered code is silently accepted into the production bundle. This is a supply-chain gap in an ERP frontend that handles auth tokens in the same JS context.

**Suggested fix:** Pin with verification: vendor the tarball into the repo (e.g. `vendor/xlsx-0.20.3.tgz` referenced as a `file:` dependency) after checking its published checksum, or add a postinstall/CI step that verifies the sha512 of node_modules/xlsx against a committed expected hash.

**Backlog reason:** xlsx pinned via cdn.sheetjs.com tarball with no integrity hash — fix is a CI/supply-chain change (vendor the tarball or add checksum verification), out of scope for a code PR

### 35. [MEDIUM/correctness] `scripts/deploy-s3.sh:24` — ✅ fixed (mitigated)
*zone: config-build · effort: medium · confidence: 0.8*

`aws s3 sync --delete` (and `--delete-unmatched-destination-objects` in deploy-gcs.sh:23) removes all previous hashed chunks the moment a new build is synced. Every route in routes/router.tsx is a `lazy:` module, and the app has no stale-chunk recovery (no `vite:preloadError` listener, no reload-on-chunk-failure anywhere in main.tsx/routes/components/lib — verified by grep). So any user with an open session at deploy time gets a hard dynamic-import failure (error boundary at best) on the next navigation to a not-yet-visited route, until they manually reload. For a long-session ERP this will happen on essentially every deploy.

**Suggested fix:** Either keep previous-build assets for a grace period (drop --delete and garbage-collect assets/ older than N days in a separate step), or add a global `window.addEventListener("vite:preloadError", () => window.location.reload())` in main.tsx so stale sessions self-heal; ideally both.

**Fixed (mitigated):** Added the `vite:preloadError` listener in main.tsx (reload once, loop-guarded via sessionStorage, flag cleared on successful boot) so a stale session self-heals on the first failed chunk import. The `--delete` in deploy-s3.sh/deploy-gcs.sh was intentionally left as-is — the grace-period/GC half is a separate deploy-infra change; the self-heal listener already removes the user-facing hard failure (branch `review/backlog-deferred-fixes`).

### 36. [MEDIUM/correctness] `hooks/use-navigation-guard.ts:70` — ✅ fixed
*zone: hooks · effort: medium · confidence: 0.7*

When `enabled` becomes true the effect pushes a sentinel history entry (window.history.pushState({ __navGuard: true }, "")), but the cleanup only removes event listeners — it never pops the sentinel. Every dirty→clean transition (e.g. user edits then saves, or component unmounts while dirty after save) leaks one extra same-URL history entry, so the user's next Back press appears to do nothing, and repeated edit/save cycles accumulate multiple dead entries. The inline comment also still refers to "Next.js's popstate handler", which no longer exists in this React Router 7 app (stale migration comment).

**Suggested fix:** In the effect cleanup, if the current history.state has __navGuard, call history.back() (with a flag to suppress the popstate handler) or use history.replaceState to neutralize the sentinel; update the stale Next.js comment.

**Fixed:** Effect cleanup now calls `window.history.back()` when `history.state?.__navGuard` is still on top (the dirty→clean/save teardown path, where the user has not navigated past the sentinel), removing the leaked same-URL entry; the click/back confirm paths leave it untouched since the user already moved past it. Stale "Next.js's popstate handler" comment updated to React Router (branch `review/backlog-deferred-fixes`).

### 37. [MEDIUM/correctness] `routes/inventory-management/spot-check/_components/sc-entry-component.tsx:146` — 📋 backlog
*zone: routes-inventory · effort: quick-win · confidence: 0.5*

Inconsistent counted semantics make the spot-check flow uncompletable for zero-stock items. isCountedFn (line 89) treats an item as counted only when eff > 0 (comment says 0 = not counted, deliberately). But handleSetUncountedToZero (line 146) sets all uncounted items to 0 — which still leaves them 'uncounted' under that rule, so clicking 'Set empty to zero' never decreases uncountedCount, the progress bar doesn't move, and the Submit-for-review button (gated on uncountedCount === 0 at line 422) never appears. The only observable effect is that those items get included with actual_qty 0 in the save payload. An item whose true count is 0 can never be confirmed, blocking submission. Physical count (pc-entry-component) uses eff != null instead, where the same button works as expected.

**Suggested fix:** Either align isCountedFn with physical count (eff != null counts as counted, letting 0 be a valid count), or remove/disable the setEmptyToZero button for spot checks and surface the rule that every item must be counted with qty > 0.

**Backlog reason:** spot-check counted-semantics change is behavior-altering and needs a product decision (is 0 a valid count?)

### 38. [MEDIUM/correctness] `routes/inventory-management/inventory-adjustment/_components/ia-item-table.tsx:86` — ✅ fixed (view-mode part)
*zone: routes-inventory · effort: medium · confidence: 0.45*

Cost probes overwrite persisted document values, including in view mode. ProductCell renders StockInCostProbe/StockOutCostProbe even when disabled (view mode, lines 143-150). StockInCostProbe's effect (lines 86-96) writes cost_per_unit/total_cost from the live cost API with shouldDirty: true, so opening an existing stock-in adjustment silently replaces its saved costs with the current average cost and marks those fields dirty — buildItemChanges in ia-form.tsx then treats untouched rows as edited on update, and TotalCostCell displays the recomputed value instead of the stored one. StockOutCostProbe (lines 112-117) is worse: it sets the line's total_cost to the product's *last receiving* total (qty-independent, per hooks/use-product-cost.ts useProductLastReceiving), clobbering the qty x cost recalcTotal whenever its query resolves. Behavior is inherited from the source app, but it makes saved totals unstable and qty-insensitive for stock-out lines.

**Suggested fix:** Render the probes only when !disabled (i.e., add/edit), gate the setValue calls so they don't run for rows hydrated from an existing document (e.g., skip when the row has an id and the user hasn't changed qty/product), and for stock-out derive total_cost = qty * unit cost from the last-receiving unit price rather than copying its document total.

**Fixed (view-mode part):** The cost probe is no longer mounted in view mode (`disabled`), so opening an existing adjustment no longer overwrites its saved cost_per_unit/total_cost or marks untouched rows dirty (branch `review/backlog-behavior-fixes`). The edit-mode re-probe gating and the stock-out `qty * unit` derivation were left as-is — they alter add/edit auto-fill behavior and want a product call on whether re-probing existing rows is intended.

### 39. [MEDIUM/correctness] `routes/operation-plan/recipe/_components/recipe-form-schema.ts:197` — 📋 backlog
*zone: routes-operation-plan · effort: quick-win · confidence: 0.65*

getDefaultValues() hardcodes `info: ""` and `dimension: ""` even when the loaded recipe has data (types/recipe.ts declares both as `Record<string, unknown> | null`), and there is no UI field bound to either. buildRecipePayload (recipe-form.tsx lines 253-254) always sends `info: textToObject("") => null` and `dimension: null` in the PATCH body (hooks/use-recipe.ts serializes the full data object into the multipart `data` part). So editing and saving any recipe sends explicit nulls that will wipe existing info/dimension on the server if the backend applies them (it applies explicit nulls for other optional fields like description in this same payload contract).

**Suggested fix:** Either round-trip the values — `info: recipe.info ? JSON.stringify(recipe.info) : ""` (same for dimension) in getDefaultValues — or omit info/dimension from buildRecipePayload entirely since they are not editable in the form.

**Backlog reason:** finding assumed Recipe carries info/dimension, but those live on CreateRecipeDto not the Recipe GET type — cannot round-trip as suggested; needs backend null-vs-omit semantics confirmed

### 40. [MEDIUM/correctness] `routes/procurement/purchase-order/from-price-list/_components/step-select-items.tsx:117` — ✅ fixed
*zone: routes-procurement-a · effort: medium · confidence: 0.55*

handleAddPicks sets currency_id and currency_code from the picked price list but never sets exchange_rate, which stays at the EMPTY_FORM default of 1. from-price-list-form-schema.ts:40 explicitly documents 'currency_id/code/exchange_rate = set ใน Step 3 ตอน pick PL', confirming the omission. A PO created from a foreign-currency price list is submitted with exchange_rate: 1 (the manual PO form sets it via LookupCurrency.onItemChange; the wizard has no equivalent). The BrowseDialog currency object only carries {id, code, name}, so the rate is not even available to pass through.

**Suggested fix:** Include exchange_rate in the currency data returned by BrowseDialog onAdd (from the price list payload) and set form.setValue("exchange_rate", ...) alongside currency_id/currency_code, or look it up from useCurrency by currency_id before building the payload.

**Fixed:** step-select-items now calls `useCurrency({ perpage: 30 })` (same as LookupCurrency) and, when the picked PL currency is set, writes its `exchange_rate` into the form; cleared back to 1 when all items are removed (branch `review/backlog-behavior-fixes`).

### 41. [MEDIUM/correctness] `routes/procurement/purchase-order/_components/use-po-form-handlers.ts:164` — ✅ fixed
*zone: routes-procurement-a · effort: medium · confidence: 0.5*

handleSubmitPo first saves a dirty form via updatePo.mutateAsync (which may add new detail rows), then runSubmitPo builds the submit details from the stale closure prop purchaseOrder.purchase_order_detail. Detail rows added during the edit session are missing from the submit payload, and rows deleted during the edit are still sent. The equivalent PR flow (use-pr-form-actions.ts doSaveAndSubmitPr) correctly uses the detail ids from the update response — the PO flow does not.

**Suggested fix:** Use the detail list from the updatePo response (mirroring doSaveAndSubmitPr in use-pr-form-actions.ts): const saved = await updatePo.mutateAsync(...); then build details from saved.data.purchase_order_detail before calling submitPo.

**Fixed:** `runSubmitPo` now accepts the saved detail rows; `handleSubmitPo` passes `saved.data.purchase_order_detail` from the updatePo response, falling back to the prop only when no save happened or the response carries no detail list — so the fix is strictly an improvement even if the backend response shape differs (branch `review/backlog-behavior-fixes`).

### 42. [MEDIUM/correctness] `routes/procurement/credit-note/_components/cn-form.tsx:92` — ✅ fixed
*zone: routes-procurement-b · effort: medium · confidence: 0.5*

After a successful update the form is never reset with the refetched server state (mutation invalidates the query and the `creditNote` prop refreshes, but `useForm` keeps the original values). The payload includes `doc_version: values.doc_version`, which still holds the pre-save version. A second consecutive edit+save in the same session therefore sends a stale doc_version (and stale per-item doc_versions via mapItemToPayload), which will fail or mis-merge if the backend enforces optimistic locking. The same pattern exists in the GRN form (use-grn-form-actions.ts onSubmit edit path sends stale item doc_versions; header doc_version is silently dropped because it is not in headerKeys).

**Suggested fix:** On update success, `form.reset(getDefaultValues(freshData))` once the refetched entity arrives (e.g. useEffect keyed on creditNote.doc_version calling form.reset when in view mode), so subsequent edits carry the current doc_version values.

**Fixed:** Added the suggested view-mode `useEffect` keyed on `creditNote.doc_version` (+ id) that calls `form.reset(getDefaultValues(creditNote))` once the refetch lands. Keyed on doc_version (not `mode`) so it cannot fire on the edit→view transition before the refetch and drop a just-added item. Safe by construction (client-only re-sync); no-op if the backend returns no new doc_version (branch `review/backlog-cluster-c-fixes`). GRN's equivalent stale-version path is separate and left in backlog. Live-backend smoke test of the double-save flow still recommended.

### 43. [MEDIUM/correctness] `routes/procurement/credit-note/_components/cn-component.tsx:459` — ✅ fixed
*zone: routes-procurement-b · effort: medium · confidence: 0.65*

On desktop, switching to grid view renders `CnCardList` with only the current page of server-paginated data and no pagination control (`DataGridPagination` is rendered only in the `!isGridMode` list branch; the sentinel/infinite-scroll only activates on mobile via `useInfiniteScroll = !!isMobile`). Desktop grid users can never see past page 1. The GRN list (grn-component.tsx lines 487-514) implements a third branch wrapping the card list in DataGrid + DataGridPagination for exactly this case, so this looks like an omission rather than a design choice.

**Suggested fix:** Mirror grn-component.tsx: add an `isGridMode && !useInfiniteScroll` branch that wraps CnCardList in DataGrid/DataGridContainer with DataGridPagination.

**Fixed:** Split the grid branch into `isGridMode && useInfiniteScroll` (mobile cards + sentinel) and `isGridMode && !useInfiniteScroll` (DataGrid + DataGridPagination wrapping CnCardList), mirroring grn-component (branch `review/backlog-cluster-fixes`).

### 44. [MEDIUM/correctness] `routes/procurement/purchase-request-template/_components/prt-component.tsx:348` — ✅ fixed
*zone: routes-procurement-b · effort: medium · confidence: 0.6*

Same desktop grid-view pagination gap as the credit-note list: in grid mode the PRT cards render only the current server page (`templates` comes from a paginated query when not on mobile), and the infinite-scroll sentinel only renders when `useInfiniteScroll` (mobile). Desktop grid mode has no DataGridPagination, so records beyond page 1 are unreachable in that view.

**Suggested fix:** Add a paginated desktop grid branch (DataGrid + DataGridPagination wrapping the card grid) as done in grn-component.tsx.

**Fixed:** Added the `isGridMode && !useInfiniteScroll` paginated grid branch wrapping the PRT card grid in DataGrid + DataGridPagination (branch `review/backlog-cluster-fixes`).

### 45. [MEDIUM/correctness] `routes/product-management/product/_components/pd-component.tsx:270` — ✅ fixed
*zone: routes-product · effort: medium · confidence: 0.8*

Error handling only covers desktop list mode: `if (error) return <ErrorState .../>` uses the error from useProduct, which is disabled when isGridMode (mobile or grid toggle). useGridPagination (hooks/use-grid-pagination.ts) never surfaces the underlying query's error — its return object has no error field. So on mobile/grid view a failed product fetch silently renders <EmptyComponent /> ("no products") with no error message or retry, which is misleading.

**Suggested fix:** Extend useGridPagination to pass through error/refetch from the list hook and render ErrorState in grid mode too (grid.error ? <ErrorState .../> : ...). This affects every module using the hook, so fixing it in the hook benefits all list pages.

**Fixed:** `useGridPagination` now returns `error`/`refetch`; pd-component renders ErrorState (with retry) in its grid branch (branch `review/backlog-cluster-fixes`). See also #50 for the system-admin lists sharing the same hook.

### 46. [MEDIUM/correctness] `routes/external/pl/_components/price-list-external-product-table.tsx:138` — 📋 backlog
*zone: routes-report · effort: medium · confidence: 0.45*

Edit mode lets the vendor edit item-level price, moq_qty, price_without_tax, tax_amt and lead_time_days (handleItemFieldChange marks the form dirty), but buildPayload in hooks/use-price-list-external.ts serializes only product_id + moq_tiers (minQuantity/price/leadTimeDays per tier). All item-level field edits are silently dropped on Save, yet form.reset(formData) clears the dirty flag as if everything was persisted. (Behavior is identical in the source Next app, so this may match a backend contract where only MOQ tiers are writable — but then the inputs are misleading.)

**Suggested fix:** Either include the editable item-level fields in buildPayload (per backend contract), or render those columns read-only in edit mode so only genuinely persistable data (MOQ tiers) appears editable.

**Backlog reason:** effort=medium — deferred (not fixed in this pass)

### 47. [MEDIUM/correctness] `routes/store-operation/store-requisition/_components/sr-component.tsx:138` — ✅ fixed
*zone: routes-store-operation · effort: medium · confidence: 0.7*

Mobile infinite scroll mixes the two document lists. `activeListHook` (my-pending vs all-document) is swapped into useGridPagination when viewMode changes (reachable on mobile via the filter Sheet buttons), but useGridPagination only resets its accumulated `allItems`/`page` when `params` change (`paramsKey` at hooks/use-grid-pagination.ts:45). queryParams are identical for both views, so after scrolling to page N and toggling viewMode, items already accumulated from the previous view remain in the list, the new view's page N is appended onto them, and pages 1..N-1 of the new view are never fetched.

**Suggested fix:** Include viewMode in the reset key — e.g. pass a `resetKey` option to useGridPagination (or fold viewMode into params used for paramsKey) so allItems/page reset to 1 when the list hook changes.

**Fixed:** useGridPagination gained an optional `resetKey` folded into the reset signature; sr-component passes `viewMode`, so toggling my-pending/all-document (identical params) resets the accumulated list/page instead of appending the new view onto the old (branch `review/backlog-behavior-fixes`).

### 48. [MEDIUM/correctness] `hooks/use-wastage-report.ts:11` — 📋 backlog
*zone: routes-store-operation · effort: large · confidence: 0.95*

The entire wastage-reporting module (routes/store-operation/wastage-reporting list, [id] and new pages) is backed by mock data (`wrMockData` from routes/store-operation/wastage-reporting/_components/wr-mock-data.ts). Create/update/delete mutations sleep 500ms and return `{success:true}` without persisting anything, while WastageReportForm shows a success toast and navigates back to a list that never changes — silent data loss from the user's perspective if this ships. Marked `TODO: เปลี่ยนเป็น API จริงเมื่อ backend พร้อม` but not listed in CLAUDE.md's known open items.

**Suggested fix:** Wire the hooks to the real backend endpoints (same pattern as use-store-requisition), or until then disable/flag the add-edit-delete actions in wr-component/wr-form and add this to the known-open-items list so it is not forgotten at release.

**Backlog reason:** effort=large — deferred (not fixed in this pass)

### 49. [MEDIUM/correctness] `routes/store-operation/stock-replenishment/_components/stock-repl-component.tsx:145` — 📋 backlog
*zone: routes-store-operation · effort: large · confidence: 0.9*

`handleCreatePR` and `handleCreateSR` are no-ops: they call `getSelectedProducts()` and discard the result. The 'Create PR (n)' / 'Create SR (n)' buttons shown once items are selected do nothing — no navigation, no toast, no request. (Faithful to the source app, which has the same stub, and the whole module is fed by mock-data.ts via use-stock-replenishment — the page is a non-functional prototype.)

**Suggested fix:** Implement navigation to the PR/SR create forms pre-filled with the selected products, or hide/disable the buttons (and note the module's mock status in CLAUDE.md known open items) until the feature is built.

**Backlog reason:** effort=large — deferred (not fixed in this pass)

### 50. [MEDIUM/correctness] `routes/system-admin/role/_components/role-component.tsx:67` — ✅ fixed
*zone: routes-system-admin · effort: medium · confidence: 0.75*

On mobile/infinite-scroll, fetch errors are silently swallowed across all system-admin list pages. The desktop query is disabled (`enabled: !useInfiniteScroll`) so `error` is always null on mobile, and `useGridPagination` (hooks/use-grid-pagination.ts) does not expose an error at all — it returns only items/isLoading/hasMore. A failed list request on mobile renders EmptyComponent ("no data") with no retry, instead of ErrorState. This affects role, user, workflow, period, document, running-code, activity-log and user-activity components identically.

**Suggested fix:** Surface `error`/`refetch` from the underlying query in useGridPagination and render ErrorState in the mobile branch of each list component (or at least in the shared hook consumers).

**Fixed:** Wired the grid `error`/`refetch` (from #45's hook change) into all eight system-admin list components — role, user, workflow, period, document, running-code, activity-log and user-activity — each now renders ErrorState with retry in its grid/mobile branch (branch `review/backlog-cluster-fixes`).

### 51. [MEDIUM/correctness] `routes/vendor-management/vendor/_components/vendor-form.tsx:207` — ✅ fixed
*zone: routes-vendor · effort: medium · confidence: 0.6*

After a successful update, form.reset(values) keeps newly added address/contact rows in form state without ids (the byId refetch updates the vendor prop, but the form is never re-initialized from it). If the user clicks Edit again and saves, buildNestedPayload classifies those rows as add (filter !item.id) and re-sends them, duplicating addresses/contacts on the backend.

**Suggested fix:** After update success, re-initialize the form from the refetched vendor (e.g., useEffect that calls form.reset(getDefaultValues(vendor)) while in view mode), instead of form.reset(values).

**Fixed:** Added a view-mode `useEffect` keyed on `vendor.updated_at` (+ id) that calls `form.reset(getDefaultValues(vendor))` and clears the removed-id state once the refetch lands. Keyed on updated_at (not `mode`) to avoid resetting to the stale prop on the edit→view transition (branch `review/backlog-cluster-c-fixes`).

### 52. [MEDIUM/correctness] `routes/vendor-management/price-list/_components/pl-form.tsx:151` — ✅ fixed
*zone: routes-vendor · effort: medium · confidence: 0.55*

Same stale-reset pattern as vendor-form/rfp-form: on update success form.reset(values) keeps new pricelist_detail rows without ids while the byId refetch gives those rows server ids in the priceList prop. On the next edit-save, submitUpdate's buildItemChanges compares form values against freshly recomputed defaultValues (which now include the server rows): the id-less form rows go into add again, and the server-created rows (ids present in defaults but absent from form values) go into remove — so a second save deletes and recreates detail rows (id churn) or duplicates them depending on backend behavior.

**Suggested fix:** Re-initialize the form from the refetched priceList after a successful update (form.reset(getDefaultValues(priceList, ...)) once the query settles) rather than form.reset(values).

**Fixed:** Added a view-mode `useEffect` that calls `form.reset(getDefaultValues(priceList, { defaultCurrencyId }))` once the refetch lands. PriceList carries no version field, so it is keyed on a signature of the `pricelist_detail` ids — which changes precisely when rows are added/removed (the cases that trigger the id-churn) — not on `mode` (branch `review/backlog-cluster-c-fixes`).

### 53. [MEDIUM/correctness] `routes/vendor-management/price-list-template/_components/use-plt-form-actions.ts:62` — 📋 backlog
*zone: routes-vendor · effort: large · confidence: 0.5*

Template edit only ever sends products: { add: <entire flattened list> } when details are dirty, and sends products: {} when the user has removed every product (products.length === 0 makes shouldSendProducts false). There is no update/remove channel (the detail schema has no id), so deleting all products is silently ignored, and if the backend treats 'add' as append (as the vendor/price-list endpoints do), editing any tier duplicates every existing product on the template.

**Suggested fix:** Track detail ids in the PLT form schema and build an add/update/remove payload (mirroring buildItemChanges used by pl-form), or confirm and document that the backend replaces all products when 'add' is sent and explicitly send an empty add/remove when the list is cleared.

**Backlog reason:** effort=large — deferred (not fixed in this pass)

### 54. [MEDIUM/correctness] `routes/vendor-management/price-list-template/_components/plt-product-table.tsx:222` — ✅ fixed (resolve part)
*zone: routes-vendor · effort: medium · confidence: 0.5*

ProductCell excludes every product_id selected in other rows from LookupProduct. But multi-tier templates are a legitimate state: plt-form-schema getDefaultValues flattens product.moq into multiple rows with the same product_id, and groupDetailsToProducts re-groups them on submit. For a loaded multi-tier template, each duplicate row's own selected product is in its excludeIds, so LookupProduct filters it from the items list and cannot resolve the selected label (shows placeholder); the user also cannot add a second MOQ tier for an existing product.

**Suggested fix:** Either drop the exclusion (duplicates are valid for MOQ tiers) or exclude by (product_id, unit_id) pair; at minimum keep the row's own current value resolvable by not filtering an id that equals the row's selected value.

**Fixed (resolve part):** excludeIds now also drops the row's own selected `product_id`, so a loaded multi-tier template's duplicate rows resolve their label instead of showing a placeholder (branch `review/backlog-behavior-fixes`). Adding a *new* tier for an already-used product via a fresh empty row is still blocked by the cross-row exclusion — fully allowing that needs the (product_id, unit_id) semantics confirmed, so it was left out.

## Rejected by verification

- `components/ui/date-picker.tsx:96` [medium/correctness] — handleTimeChange does `e.target.value.split(":").map(Number)` then `date.setHours(hours, minutes)` and `date.toISOString()`. A type="time" i
- `components/templates/config-list-template.tsx:189` [medium/correctness] — In grid/mobile (infinite-scroll) mode the list query runs through useGridPagination while directQuery is disabled (enabled: !useInfiniteScro
- `hooks/use-api-mutation.ts:108` [medium/correctness] — After a successful response, useApiMutation unconditionally calls `const data = await res.json();`. If the backend returns 204 No Content or
- `routes/config/location/_components/location-form.tsx:187` [medium/correctness] — The payload sends `delivery_point_name: values.delivery_point_name`, but LookupDeliveryPoint only updates `delivery_point_id` (components/lo
- `routes/procurement/purchase-order/_components/use-po-form-handlers.ts:97` [medium/correctness] — buildDetailsFromForm falls back to purchaseOrder?.purchase_order_detail?.[i]?.id matched purely by array index when a form item has no id. I
- `routes/system-admin/user/_components/user-assigned-form.tsx:50` [medium/correctness] — Two related issues: (1) `useRole()` is called without params, so the roles checklist for assignment only contains the backend's default firs
- `hooks/use-store-requisition.ts:73` [high/correctness] — useMyPendingStoreRequisition (the DEFAULT view of the SR list page in routes/store-operation/store-requisition) reads `json.data[0].data ?? 
- `routes/report/schedules/_components/create-schedule-dialog.tsx:104` [medium/correctness] — viewer_endpoint persists API_ENDPOINTS.REPORT_VIEWER(buCode) = '/api/proxy/api/<bu>/reports/viewer' into backend schedule delivery config. '

## Low-severity notes

- `lib/http-client.ts:216` [correctness] — readErrorMessage() returns `body?.message` typed as `string | undefined` with no runtime type check, then line 216 calls `message?.toLowerCa
- `lib/auth/auth-api.ts:119` [security] — logout() returns early (`if (!accessToken) return;`) when the in-memory access token is absent, even if a refresh token was present. clearSe
- `index.html:2` [quality] — `<html lang="en" suppresshydrationwarning>` — `suppresshydrationwarning` is a React/Next.js JSX prop that survived the migration. In a stati
- `lib/form-utils.ts:29` [quality] — getDeleteDescription() returns a hardcoded English string (`Are you sure you want to remove "..."?` and `Item #N`) in an app that is otherwi
- `lib/version.ts:1` [quality] — APP_VERSION is a hardcoded literal "1.0.1-build.20260527.dbf5ae2b" (commit dbf5ae2b, dated 2026-05-27) with no generation step found in scri
- `lib/notification-helpers.tsx:97` [quality] — formatMessage() renders parsed markdown links with `key={safeHref}`. If a notification message contains the same URL twice (e.g. two [view](
- `components/ui/tree-product-lookup.tsx:103` [correctness] — expandedIds is initialized once in the useState initializer from the initial `products` prop. The only consumer (routes/config/location/_com
- `components/ui/sidebar.tsx:94` [quality] — Migration leftover: SidebarProvider writes the `sidebar_state` cookie on every toggle, but nothing in the SPA ever reads it (in the Next.js 
- `components/ui/data-grid/data-grid-table.tsx:652` [correctness] — DataGridTableBodyRowCell spreads `{...(props.tableLayout?.columnsDraggable && !isPinned ? { cell } : {})}` onto the <td> DOM element — `cell
- `components/ui/data-grid/data-grid-table.tsx:440` [quality] — Stray double-quote embedded in the pinned-cell className string: `'...data-pinned:bg-background/90 data-pinned:backdrop-blur-xs" [&[data-pin
- `components/ui/stepper.tsx:156` [quality] — Stepper computes `stepsCount` by filtering children where `child.type.displayName === "StepperItem"`, but StepperItem never has displayName 
- `components/ui/module-error-boundary.tsx:1` [quality] — Stale Next.js documentation survived the migration: the JSDoc instructs usage as `app/(root)/{domain}/error.tsx` with a `"use client"` re-ex
- `components/ui/image-lightbox.tsx:39` [quality] — Hardcoded Thai string "โหลดรูปไม่สำเร็จ" in the image error fallback bypasses i18n (English-locale users see Thai). Related i18n gaps in the
- `components/ui/data-grid/use-config-table.ts:94` [correctness] — pageCount is computed as `Math.ceil(totalRecords / (params.perpage as number))` but ParamsDto.perpage is `number | string | undefined`. The 
- `components/ui/input-custom.tsx:455` [perf] — The elaborate memoization (renderInput/renderLabel/renderError wrapped in useCallback feeding a layoutComponents useMemo) is fully defeated:
- `components/keyboard-shortcuts-dialog.tsx:56` [correctness] — The "/" focus-search shortcut locates the search input with the selector 'input[type="search"], input[placeholder*="earch"]'. SearchInput (c
- `components/home-component.tsx:205` [quality] — HomeComponent (~1,150 lines of marketing landing page) is dead code: grep across routes/, components/, lib/ and main.tsx shows no imports of
- `components/share/void-dialog.tsx:104` [quality] — The audit-log warning strip is a hardcoded Thai string ("การกระทำนี้จะถูกบันทึกใน audit log · ไม่สามารถย้อนกลับได้") while every other strin
- `components/top-loader.tsx:16` [quality] — The progress bar never starts from 0: idle state is width:100% / opacity:0, so when navigation begins the bar transitions width 100%→80% (it
- `components/filter/filter-date.tsx:43` [quality] — fieldKey is interpolated unescaped into a RegExp (new RegExp(String.raw`${fieldKey}\|date_range:(.+)`)). All current call sites pass safe li
- `hooks/use-profile.ts:19` [perf] — useProfile() creates a BroadcastChannel plus a message listener inside the hook itself, and useProfile is transitively called by useBuCode →
- `hooks/use-pull-to-refresh.ts:80` [perf] — The effect's dependency array includes `distance` (updated on every touchmove frame) and `onRefresh` (typically a new function identity each
- `hooks/use-number-formatter.ts:33` [quality] — useQuantityFormatter/useRecipeFormatter read `config.quantity_format.minimumIntegerDigits` / `recipe_format.minimumIntegerDigits` and feed t
- `hooks/use-notification.ts:80` [security] — The WebSocket connection registers with only `{ type: "register", user_id }` — no access token or other credential is sent on the wss connec
- `utils/transfer-handler.ts:44` [correctness] — transferHandler calls form.setValue(`${fieldName}.add`/`.remove`, ...) without `{ shouldDirty: true }`. react-hook-form's setValue does not 
- `constant/store-requisition.ts:39` [correctness] — SR_WORKFLOW_ACTION_CONFIG is built from `wf_`-prefixed keys (wf_submitted, wf_approved, ...) with no label/className overrides. createStatus
- `types/product.ts:175` [correctness] — createProductSchema's price field `z.coerce.number().nullable().refine((v) => v != null && v >= 0, tv("minNumber", ...))` rejects null (veri
- `types/form.ts:23` [quality] — getModeLabels returns hardcoded English strings ("Add ...", "Create", "Creating...", "Edit ...", "Save", "Saving...") while the app is bilin
- `types/store-requisition.ts:8` [quality] — Three modules export a `WorkflowHistoryEntry` with mutually incompatible shapes: types/goods-receive-note.ts ({status, timestamp, user: stri
- `utils/build-query-string.ts:22` [quality] — buildQueryString stringifies every value with String(value), so an accidentally passed array serializes as comma-joined and a plain object b
- `types/transfer.ts:5` [quality] — TransferPayload is defined twice with identical shape: as an interface in types/transfer.ts and as `z.infer<typeof transferPayloadSchema>` e
- `routes/config/tax-profile/_components/tax-profile-dialog.tsx:161` [quality] — The `%` suffix span uses `absolute top-1/2 right-3 -translate-y-1/2` but its wrapping `<div>` (line 161) has no `relative` class, and no anc
- `routes/config/department/_components/department-card.tsx:72` [quality] — Status badge text is hardcoded `{item.is_active ? "Active" : "Inactive"}` instead of the `status.active`/`status.inactive` i18n keys that al
- `routes/config/adjustment-type/_components/adjustment-type-dialog.tsx:63` [quality] — This dialog wires zodResolver to the static `adjustmentTypeSchema` from types/adjustment-type.ts, whose messages are hardcoded English ("Cod
- `routes/config/currency/_components/currency-dialog.tsx:97` [correctness] — The add-mode auto-fill effect depends on `exchangeRates` (line 108), so when the useExternalExchangeRates query resolves or refetches after 
- `routes/config/exchange-rate/_components/exchange-rate-component.tsx:71` [quality] — Dead code: `_rateDecimals` (line 71) is computed from useProfile and never used, and `const queryParams = params` (line 90) is a pointless a
- `routes/config/exchange-rate/_components/exchange-rate-component.tsx:296` [quality] — Grid/mobile mode has no error path: only `historyError` from the list-mode query (line 181) is handled, while useGridPagination (hooks/use-g
- `routes/config/exchange-rate/_components/exchange-rate-component.tsx:152` [correctness] — handleBulkUpdate maps over ALL of currencyWithDiff, which includes currencies whose code is missing from externalRates or whose diff is 0 (n
- `routes/procurement/purchase-order/from-price-list/_components/step-select-vendors.tsx:182` [correctness] — Uses tc("inactive") with tc = useTranslations("common"), but the key common.inactive does not exist in messages/en.json or messages/th.json 
- `routes/procurement/purchase-request/new/_content.tsx:12` [perf] — usePurchaseRequestTemplates() is called with its default enabled=true, so every visit to /procurement/purchase-request/new fetches the full 
- `routes/procurement/purchase-request/_components/pr-component.tsx:211` [quality] — activeListHook = viewMode === "my-pending" ? useMyPendingPurchaseRequest : usePurchaseRequest is passed into useGridPagination, which calls 
- `routes/procurement/purchase-request/_components/pr-pricelist-dialog.tsx:239` [correctness] — fetchPriceLists silently returns on !res.ok — the user sees the 'no price list' empty state with no error indication (the toast only fires f
- `routes/procurement/purchase-request/_components/pr-pricelist-dialog.tsx:77` [quality] — Several user-facing strings are hardcoded in English and bypass i18n: '★ Preferred' (line 77), 'Best' (line 121), 'Select' (line 175), 'Best
- `routes/procurement/purchase-order/_components/po-item-fields.tsx:50` [correctness] — Row selection is stored as a Set of array indices (selected) but is never reset or remapped when the items field-array mutates: handleAddIte
- `routes/procurement/purchase-request/_components/pr-item-table.tsx:64` [correctness] — pendingCount and handleSelectPending read item.current_stage_status from useFieldArray's fields objects. RHF field-array entries are snapsho
- `routes/procurement/purchase-request/_components/workflow/pr-footer-action.tsx:139` [correctness] — The footer subtotal is computed as pricelist_price * requested_qty, but net_amount/tax_amount/total_price summed in the same loop were deriv
- `routes/procurement/purchase-order/_components/po-form.tsx:251` [correctness] — PoFooterAction receives currencyCode={form.getValues("currency_code")} — a non-reactive read during render. PoForm only watches "items", so 
- `routes/procurement/purchase-order/_components/use-po-form-handlers.ts:116` [quality] — Multiple handlers call router.refresh() (lines 116, 173, 221, 246, 274, 287), but the compat router's refresh is an intentional no-op in thi
- `routes/procurement/purchase-order/_components/po-component.tsx:101` [quality] — PO combines independent filter clauses with "," ([params.filter, poType].join(",")) while the PR list and useDataGridState combine clauses w
- `routes/procurement/purchase-order/_components/po-from-pr-dialog.tsx:123` [correctness] — handleNext does setGroupedData(json.data.groups) without guarding json.data — if the group endpoint returns 200 with an unexpected body shap
- `routes/procurement/approval/_components/approval-component.tsx:122` [correctness] — Dynamically interpolated Tailwind classes `bg-${card.color}/10` and `text-${card.color}` cannot be detected by Tailwind v4's source scanner.
- `routes/procurement/goods-receive-note/_components/grn-po-wizard-dialog.tsx:256` [quality] — In `VendorStep`, the `Search` icon uses `absolute top-1/2 left-3 -translate-y-1/2` but its wrapping `<div>` has no `relative` class, so the 
- `routes/procurement/goods-receive-note/_components/grn-footer-action.tsx:1` [quality] — `GrnFooterAction` is dead code — grep finds no imports of `grn-footer-action` or `GrnFooterAction` anywhere in the repo (the commit/void but
- `routes/procurement/goods-receive-note/_components/use-grn-form-actions.ts:278` [quality] — `router.refresh()` (also line 290, and cn-form.tsx:182) is a guaranteed no-op in this SPA — the compat layer in lib/compat/navigation.ts imp
- `routes/procurement/purchase-request-template/_components/prt-card.tsx:50` [quality] — Hardcoded English strings bypass i18n in the PRT module: "Active"/"Inactive" badge and the "Workflow"/"Department" labels in prt-card.tsx, t
- `routes/procurement/credit-note/_components/cn-form-schema.ts:78` [quality] — `exchange_rate: z.coerce.number().gt(0, tv("minNumber", { field: tf("exchangeRate"), min: 0 }))` rejects 0 but the error message says the mi
- `routes/procurement/goods-receive-note/_components/use-grn-form-actions.ts:212` [correctness] — In the add path, if createGrn succeeds but the response body lacks `data.id`, `finalize()` shows a success toast but performs no navigation 
- `routes/inventory-management/_shared/entry-notes-dialog.tsx:320` [correctness] — Missing i18n key: the save button renders tc("saving") while isSaving, but `common.saving` does not exist in messages/en.json or messages/th
- `routes/inventory-management/physical-count/_components/pc-component.tsx:251` [correctness] — Retry refetches the wrong query when a previous period is selected. error is derived as `previousPeriodId ? errorSelected : errorCurrent` (l
- `routes/inventory-management/spot-check/_components/sc-entry-component.tsx:156` [correctness] — handleRefresh shows a success toast even when the refresh fails. TanStack Query's refetch() resolves with a result object and does not rejec
- `routes/inventory-management/period-end/_components/pe-review.tsx:62` [quality] — Unhandled error path: usePeriodEndReview() destructures data/isLoading/isFetching/refetch but never the error. If the review fetch fails, is
- `routes/inventory-management/period-end/_components/pe-history.tsx:38` [quality] — Dead fetch / unfinished UI: PeHistory calls usePeriodEnd() and maps `items = data?.data ?? []`, but the render is `isLoading ? skeleton : it
- `routes/inventory-management/transaction/_components/transaction-component.tsx:407` [quality] — Hardcoded English UI strings bypass i18n in the transaction module: the mobile filter sheet button literal "Done" (line 407 — tc("done") exi
- `routes/system-admin/workflow/_components/use-wf-row-mutations.ts:31` [quality] — Duplicate error toast: `runMutation` calls `toast.error(err.message)` in onError and then rejects; the caller `handle()` catches the same er
- `routes/system-admin/query-dataset/_components/sql-editor.tsx:380` [quality] — `monaco.languages.registerCompletionItemProvider("sql", ...)` is called in onMount with no disposal. Monaco is a global singleton that survi
- `routes/system-admin/document/_components/document-component.tsx:120` [correctness] — The file-type filter is applied client-side to only the currently loaded page (`allDocuments.filter(...)`) while pagination remains server-d
- `routes/system-admin/config-email/_components/config-email-component.tsx:54` [security] — The SMTP password is returned by `GET app-config key=report_email`, stored in react-query cache and reset into a form field (`smtp_password`
- `routes/system-admin/role/_components/permission-matrix.tsx:75` [quality] — Dead code: `PermissionMatrix` is exported but never imported anywhere in the repo (role-form uses PermissionPicker instead). Verified via re
- `routes/system-admin/_components/signature-config.tsx:281` [quality] — Dead code: the 680-line `SignatureConfig` component (drag-and-drop signature editor with workflow import) is not imported by any route or co
- `routes/system-admin/notification-template/_components/noti-tmpl.tsx:29` [correctness] — `data?.paginate.total ?? 0` chains optionally on `data` but not on `paginate`. Every other system-admin component uses `data?.paginate?.tota
- `routes/vendor-management/vendor/_components/vendor-address.tsx:198` [quality] — resolveFromPostalCode rejections are unhandled: the mount useEffect calls resolveFromPostalCode(postalCode).then(...) with no .catch, and ha
- `routes/vendor-management/vendor/_components/vendor-form.tsx:273` [quality] — Leftover debug logging marked '🐛 DEBUG' in the submit error handler: console.warn("[vendor-form] validation failed:", errors) and console.wa
- `routes/vendor-management/vendor/_components/vendor-card.tsx:30` [correctness] — Grid-view VendorCard reads the primary contact only from item.tb_vendor_contact (marked @deprecated in types/vendor.ts: 'use contacts'). Eve
- `routes/vendor-management/vendor/_components/vendor-address.tsx:418` [quality] — Template literal missing a space: `h-7 text-xs${ ... ? "ring-destructive ring-1" : ""}` produces the class string 'h-7 text-xsring-destructi
- `routes/vendor-management/price-list/_components/pl-detail-view.tsx:1` [quality] — Dead code surviving the migration: five files in this zone are not imported by anything (verified by symbol and path grep across the repo): 
- `routes/vendor-management/vendor/page.tsx:6` [quality] — Stale Next.js-era JSDoc throughout the zone's page/_content files: comments still describe components as 'Server Component', reference 'Next
- `routes/vendor-management/request-price-list/_components/rfp-vendor-section.tsx:150` [quality] — handleCopyUrl calls navigator.clipboard.writeText(url) without awaiting or handling rejection, then unconditionally sets copied=true — on cl
- `routes/operation-plan/recipe/_components/use-recipe-cost-calc.ts:84` [perf] — The useEffect dependency array is `[computed, form]`, but `computed` is a fresh object literal built on every render, so the dependency neve
- `routes/operation-plan/equipment/_components/eq-image-field.tsx:49` [quality] — `const previewUrl = file ? URL.createObjectURL(file) : null;` creates a new blob object URL during every render (a render-phase side effect)
- `routes/operation-plan/equipment/[id]/_content.tsx:22` [quality] — Not-found messages are hardcoded English strings that bypass i18n: "Equipment not found" here, "Cuisine not found" in cuisine/[id]/_content.
- `routes/operation-plan/recipe/_components/use-recipe-gallery.ts:156` [quality] — `move()` (and `remove()` at line 139-141) mix closure state with functional updates: the index/target is computed from the `items` snapshot 
- `routes/store-operation/wastage-reporting/_components/wr-item-table.tsx:153` [quality] — LossValueCell contains a useEffect that does `form.setValue(`items.${index}.unit_cost`, unitCost)` — writing the watched value back to the s
- `routes/store-operation/store-requisition/_components/sr-component.tsx:216` [correctness] — Index misalignment in active-filter removal: `selectedStatusLabels = selectedStatuses.map(...).filter(Boolean)` drops entries whose status k
- `routes/store-operation/store-requisition/_components/sr-card.tsx:82` [quality] — i18n inconsistency: the mobile/grid card status badge renders `config.label` from SR_STATUS_CONFIG, which createStatusConfig auto-generates 
- `routes/store-operation/store-requisition/_components/sr-component.tsx:580` [quality] — Desktop grid display mode has no pagination: when the user toggles to grid view on desktop (isGridMode true, useInfiniteScroll false), SrCar
- `routes/store-operation/store-requisition/_components/sr-component.tsx:241` [quality] — Dead alias: `const fromLocationLabelMap = locationLabelMap;` — both from/to badges read the same map; the alias adds nothing.
- `routes/store-operation/store-requisition/_components/sr-form.tsx:116` [quality] — The profile-defaults useEffect re-runs whenever any dep changes (profile/defaultBu object identity changes on every refetch, plus `t`), and 
- `routes/product-management/product/_components/pd-info-summary.tsx:31` [quality] — ProductInfoSummary (entire 186-line file) is dead code — grep over the whole repo finds no import of ProductInfoSummary or pd-info-summary o
- `routes/product-management/category/_components/category-form-schema.ts:34` [quality] — Exported getDefaultValues() is never imported anywhere (category-form.tsx, category-dialog.tsx and category-component.tsx import only catego
- `routes/product-management/product/_components/pd-card.tsx:60` [quality] — Status badge text is hardcoded English: {isActive ? "Active" : "Inactive"}. The desktop list view translates the same status via getProductS
- `routes/product-management/product/_components/pd-images.tsx:69` [quality] — User-facing strings in the image components bypass i18n entirely: toasts (`${valid.length} image(s) uploaded`, "Image deleted", rejection me
- `routes/product-management/product/_components/pd-form.tsx:434` [correctness] — ProductEcoLabelSection is rendered without its readOnly prop even when the form mode is "view", so the Add/Edit/Delete eco-label buttons rem
- `routes/product-management/category/_components/use-category-dialog.ts:84` [quality] — The hook's onSubmit option and returned handleSubmit are dead: category-component.tsx line 143 passes onSubmit: () => {} and never destructu
- `routes/product-management/category/_components/use-category-tree.ts:44` [perf] — The tree is rebuilt by an un-memoized IIFE on every render, with subCategories.find()/categories.find() inside the per-item map (O(itemGroup
- `routes/external/pl/_components/moq-tiers-sub-table.tsx:54` [correctness] — hasLocalChanges.current is set true on the first local edit and never reset. The sync effect (`if (!hasLocalChanges.current) setLocalTiers(t
- `routes/external/pl/_components/price-list-external-product-table.tsx:83` [correctness] — A single pagination/sorting state is shared by both the edit-mode table (one row per detail line) and the view-mode table (grouped rows, few
- `routes/report/schedules/_components/schedule-component.tsx:45` [quality] — Delete failure fallback toast uses t('deleteConfirm') — the confirmation-question string — as the error message when err is not an Error ins
- `routes/report/list/_components/report-component.tsx:84` [correctness] — Group filter is applied client-side to only the current server page (acknowledged in the code comment), but DataGrid still gets recordCount=
- `routes/report/list/_components/report-param-dialog.tsx:36` [quality] — ReportParamDialogProps declares buCode and ReportComponent passes buCode={buCode}, but the prop is never destructured or used inside ReportP
- `routes/report/list/_components/report-param-dialog.tsx:261` [perf] — parseReportDialog(dialogXml) runs a full DOMParser XML parse on every render of ReportParamDialog (no memoization), and enrichedFields is re
- `routes/report/history/_components/history-component.tsx:174` [quality] — GridContent hardcodes English UI strings 'Loading more…' and 'Scroll to load more' instead of using use-intl translations, breaking the th l
- `routes/report/report-landing.tsx:621` [quality] — FooterBand renders two call-to-action buttons (footerBtnTemplates 'Templates', footerBtnBuilder 'Builder') with no onClick handler and no hr
- `routes/report/list/_components/report-component.tsx:120` [security] — globalThis.window.open(url, '_blank') (fallback at line 113 and toast action at line 120) opens the backend-provided viewer URL without 'noo
- `scripts/deploy-s3.sh:23` [quality] — The S3 sync applies `Cache-Control: public,max-age=31536000,immutable` to EVERYTHING in dist/ except index.html and config*.json — not just 
- `docker/40-render-config-json.sh:13` [correctness] — X_APP_ID and WS_URL are interpolated into config.json via printf %s with no JSON escaping. A value containing a double-quote or backslash pr
- `docker/40-render-config-json.sh:7` [correctness] — Neither the render script nor docker/nginx.conf.template guards against BACKEND_URL having a trailing slash. With `proxy_pass ${BACKEND_URL}
- `vitest.config.ts:6` [quality] — vite.config.ts compiles all components through babel-plugin-react-compiler, but vitest.config.ts uses a plain `react()` plugin. Tests theref
- `docker/nginx.conf.template:9` [security] — The nginx vhost enables gzip but sets no `gzip_vary on`, so any intermediary cache may serve gzipped bodies to clients that did not send Acc
- `vite.config.ts:23` [security] — The dev proxy hardcodes `secure: false`, disabling TLS certificate verification for whatever VITE_DEV_PROXY_TARGET points at — including whe
- `scripts/codemods/nextpage-to-route.sh:13` [quality] — The generateMetadata stripper only matches `generateMetadata()` with literally empty parens and at most one level of nested braces in the bo

## Reviewed inline (workflow agent failed)

- **routes-dashboard** (routes/dashboard, routes/profile, routes/notifications) — reviewed by hand after the workflow reviewer died (API Overloaded → monthly spend limit). No confirmed bugs. Minor notes: optimistic widget reorder does not roll back on a failed PATCH; `inferWidgetTypeFromShape` has a dead `"bar"` branch; `change-password-dialog` new_password input misses the `disabled={isPending}` its siblings have.
