# Dashboard Platform Config — Plan 4/4: carmen-inventory-frontend-react Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** หน้า `/dashboard` แบ่งเป็น "Dashboard ของ BU" (บน) กับ "ของฉัน" (ล่าง) และทุกหน้า module dashboard ต่อท้ายด้วย "เพิ่มเติมของ BU" — ทุกคนเห็น แก้ได้เฉพาะคนที่มี `dashboard.bu_widget.*`

**Architecture:** ย้ายชิ้นส่วน widget ที่ใช้ร่วม (`SortableWidgetItem`, `WidgetConfigDialog`, `widget-shape`, `widget-param-fields`, `widget-display-fields`) จาก `routes/dashboard/` ไป `components/dashboard-widget/` แล้วให้ `SortableWidgetItem` มี prop `editable` · hook ใหม่ `hooks/use-bu-dashboard-widgets.ts` (ข้าม module จึงอยู่ `hooks/`) · คอมโพเนนต์ `components/dashboard-widget/bu-widget-section.tsx` ใช้ทั้งหน้า `/dashboard` และหน้า module

**Tech Stack:** Vite · React 19 · React Router 7 · TanStack Query · dnd-kit · use-intl · sonner · Vitest

**Spec:** `docs/superpowers/specs/2026-10-06-dashboard-platform-config-design.md` (§10 มีผลเหนือส่วนก่อนหน้า) · API: ตาราง "gateway → platform/FE" ใน Plan 1

**Repo:** รีโปนี้ · branch `feature/dashboard-platform-config` (มีอยู่แล้ว — spec อยู่บน branch นี้)

## Global Constraints

- **ไม่เขียนเทสต์ใหม่** (preference ของ user) — `bunx tsc --noEmit && bun run lint && bun test:run` ต้องเขียวทุก task; เทสต์เดิมที่ import path ที่ย้ายต้องแก้ path
- **ESLint module boundary**: `components/` `hooks/` ห้าม import `@/routes/**`; `routes/A` ห้าม import `routes/B`
- i18n ครบทั้ง `messages/en.json` และ `messages/th.json` · **ห้ามมี `{{` `}}` ใน message** (ICU พังทั้งหน้า) · placeholder ใช้ `{name}`
- permission key ต้องตรงกับที่ seed จริง (`dashboard.bu_widget.{view,create,update,delete}` — Plan 1 Task 3)
- ไม่ผูก license feature ใหม่ (`LICENSE_ENFORCEMENT` เปิดทุก env) — ไม่แตะ `constant/module-list.ts`
- รายการ/คอลัมน์/ids ที่ส่งเข้า dnd หรือ grid ต้อง memoize · ใช้ token สี/ขนาดที่มีอยู่ ห้ามขนาดตัวอักษรดิบนอก ladder
- toast จาก `sonner`
- module string: `procurement` `inventory` `product` `config` `vendor-management` `operation-plan` (ตรงกับ `hooks/use-dashboard-widgets.ts`) และ `main` = หน้าหลัก
- deploy = `vercel --prod` จากเครื่องเท่านั้น และ **หลัง** backend-v2 + micro-data + seed/assign permission (spec §8)
- commit message ภาษาไทย

## Review Focus

1. **BU ไม่มี widget และผู้ใช้ไม่มีสิทธิ์แก้** → ซ่อนส่วน BU ทั้งก้อน ไม่เหลือหัวข้อว่าง (Task 3 Step 2, ตรวจมือ Task 5)
2. **empty state เดิม** ขึ้นเมื่อ **ทั้งสองส่วน** ว่างเท่านั้น (Task 4 Step 2)
3. **ผู้ใช้ไม่มีสิทธิ์** → ไม่มีปุ่มลาก/ลบ/ตั้งค่า/เปลี่ยนชนิดกราฟบน BU widget (Task 1 Step 3, Task 3)
4. **backend ยังไม่ deploy** (`GET …/bu` ตอบ 404/500) → หน้าไม่พัง ส่วน BU ซ่อนตัวเงียบ ๆ ไม่มี toast error (Task 2 Step 3, Task 3 Step 2)
5. **บันทึกครั้งแรกตอน `deploy_state.customized_at == null`** → toast เตือนครั้งเดียวต่อการโหลดหน้า (Task 3 Step 3)

---

### Task 1: ย้ายชิ้นส่วน widget ไป `components/dashboard-widget/` + prop `editable`

**Files:**
- Move: `routes/dashboard/sortable-widget-item.tsx` → `components/dashboard-widget/sortable-widget-item.tsx`
- Move: `routes/dashboard/widget-config-dialog.tsx` → `components/dashboard-widget/widget-config-dialog.tsx`
- Move: `routes/dashboard/widget-shape.ts` → `components/dashboard-widget/widget-shape.ts`
- Move: `routes/dashboard/widget-param-fields.tsx` → `components/dashboard-widget/widget-param-fields.tsx`
- Move: `routes/dashboard/widget-display-fields.tsx` → `components/dashboard-widget/widget-display-fields.tsx`
- Move: `routes/dashboard/__tests__/widget-shape.test.ts` → `components/dashboard-widget/__tests__/widget-shape.test.ts`
- Modify: `routes/dashboard/dashboard-component.tsx` (import บรรทัด 50, 62, 63)
- Modify: `components/dashboard-widget/dashboard-widget-grid.tsx:325` (คอมเมนต์อ้าง path เก่า)

**Interfaces:**
- Produces: `SortableWidgetItem` props เดิม + `editable?: boolean` (default `true` — personal ไม่เปลี่ยนพฤติกรรม)

- [ ] **Step 1: ย้ายด้วย git**

```bash
for f in sortable-widget-item.tsx widget-config-dialog.tsx widget-shape.ts widget-param-fields.tsx widget-display-fields.tsx; do
  git mv "routes/dashboard/$f" "components/dashboard-widget/$f"
done
git mv routes/dashboard/__tests__/widget-shape.test.ts components/dashboard-widget/__tests__/widget-shape.test.ts
```

- [ ] **Step 2: แก้ import**

- ไฟล์ที่ย้าย import กันเองแบบ `./widget-shape` — ยังใช้ได้
- `dashboard-component.tsx`: `./sortable-widget-item` / `./widget-config-dialog` / `./widget-shape` → `@/components/dashboard-widget/<ชื่อเดิม>`
- test ใช้ `"../widget-shape"` — โครง `__tests__/` เหมือนเดิมจึงยังถูก
- `grep -rn "routes/dashboard/\(sortable-widget-item\|widget-config-dialog\|widget-shape\|widget-param-fields\|widget-display-fields\)" --include=*.ts --include=*.tsx .` ต้องว่าง

- [ ] **Step 3: prop `editable`**

ใน props ของ `sortable-widget-item.tsx` (53-67):

```tsx
  /** false = อ่านอย่างเดียว: ไม่มีปุ่มลาก ลบ ตั้งค่า และเปลี่ยนชนิดกราฟ (BU widget สำหรับผู้ไม่มีสิทธิ์แก้) */
  editable?: boolean;
```

- destructure `editable = true`
- `useSortable({ id: widget.id, disabled: !editable })`
- ห่อ drag handle, ปุ่มลบ, ปุ่ม gear และเมนูชนิดกราฟด้วย `{editable && (...)}` — การแสดงผล widget และ `onVisible` คงเดิม
- `UnsupportedCard` ภายในไฟล์: ปุ่มลบโผล่เฉพาะ `editable` (ส่ง prop ต่อเข้าไป)

- [ ] **Step 4: ตรวจ + Commit**

Run: `bunx tsc --noEmit && bun run lint && bun test:run`
Expected: ผ่าน

```bash
git add -A components/dashboard-widget routes/dashboard
git commit -m "refactor(dashboard): ย้ายชิ้นส่วน widget ที่ใช้ร่วมไป components/dashboard-widget และเพิ่มโหมดอ่านอย่างเดียว"
```

---

### Task 2: endpoint, query key, permission, types, hook `use-bu-dashboard-widgets`

**Files:**
- Modify: `constant/api-endpoints.ts` (ข้าง `DASHBOARD_*` ~87-101 เรียงตามตัวอักษร)
- Modify: `constant/query-keys.ts:26-32`
- Modify: `constant/permissions.ts:158-175`
- Modify: `types/dashboard-widget.ts` (`WidgetConfig` 174-182 + ท้ายไฟล์ ~296-301)
- Create: `hooks/use-bu-dashboard-widgets.ts`

**Interfaces:**
- Produces:
  - `API_ENDPOINTS.DASHBOARD_BU_WIDGETS(buCode, module?)`, `DASHBOARD_BU_WIDGET_BY_ID(buCode, id)`, `DASHBOARD_BU_WIDGET_REORDER(buCode)`, `DASHBOARD_LAB_BU_WIDGET_DATA(buCode, widgetId)`
  - `QUERY_KEYS.BU_DASHBOARD_WIDGETS`, `QUERY_KEYS.BU_DASHBOARD_WIDGET_DATA`
  - `PERMISSIONS.dashboard.bu_widget.{view,create,update,delete}`
  - types `BuDashboardWidget`, `BuDeployState`, `BuDashboardWidgetListResponse`, `CreateBuDashboardWidgetDto`
  - hooks `useBuDashboardWidgets(module)`, `buDashboardWidgetDataQueryOptions(buCode, widgetId, enabled)`, `useCreateBuDashboardWidget()`, `useUpdateBuDashboardWidget()`, `useDeleteBuDashboardWidget()`, `useReorderBuDashboardWidgets()`

- [ ] **Step 1: endpoints + keys + permission**

```ts
  DASHBOARD_BU_WIDGETS: (buCode: string, module?: string) =>
    `/api/proxy/api/${buCode}/dashboard-widgets/bu${module ? `?module=${encodeURIComponent(module)}` : ""}`,
  DASHBOARD_BU_WIDGET_BY_ID: (buCode: string, id: string) =>
    `/api/proxy/api/${buCode}/dashboard-widgets/bu/${id}`,
  DASHBOARD_BU_WIDGET_REORDER: (buCode: string) =>
    `/api/proxy/api/${buCode}/dashboard-widgets/bu/reorder`,
  DASHBOARD_LAB_BU_WIDGET_DATA: (buCode: string, widgetId: string) =>
    `/api/proxy/api/${buCode}/dashboard-lab/widgets/${widgetId}/data?scope=bu`,
```

(ห้ามใช้ `DASHBOARD_WIDGETS(buCode, "bu")` ที่มีอยู่ — URL เดียวกันแต่คนละความหมาย)

`query-keys.ts`: `BU_DASHBOARD_WIDGETS: "bu-dashboard-widgets",` · `BU_DASHBOARD_WIDGET_DATA: "bu-dashboard-widget-data",`

`permissions.ts`:

```ts
  dashboard: {
    view: "dashboard.view",
    widget: crud("dashboard.widget"),
    bu_widget: crud("dashboard.bu_widget"),
    dataset: { view: "dashboard.dataset.view", create: "dashboard.dataset.create" },
  },
```

รัน `bun test:run constant` — ถ้ามีเทสต์ที่บังคับว่าทุก permission key ต้องอยู่ใน fixture ของ DB ให้เพิ่มคีย์ใหม่ตามวิธีที่ไฟล์นั้นบอก

- [ ] **Step 2: types**

`WidgetConfig` (174) เพิ่ม `export` แล้วต่อท้ายไฟล์:

```ts
// BU widget — widget ระดับ BU ที่ทุกคนใน BU เห็น; module null = หน้า /dashboard หลัก
export type BuDashboardWidget = WidgetConfig & { module: string | null };

/** แถว deploy ของ tenant (null = ยังไม่เคย deploy และยังไม่เคยแก้เอง) */
export interface BuDeployState {
  deployed_version: number;
  deployed_at: string | null;
  customized_at: string | null;
}

export interface BuDashboardWidgetListResponse {
  items: readonly BuDashboardWidget[];
  count: number;
  deploy_state: BuDeployState | null;
}

export type CreateBuDashboardWidgetDto = CreateWidgetDto & { module: string | null };
```

- [ ] **Step 3: hook**

`hooks/use-bu-dashboard-widgets.ts` (ยกโครงจาก `routes/dashboard/use-my-dashboard-widgets.ts` — ตรวจชื่อ/path จริงของ `httpClient`, `ApiError.from`, `CACHE_DYNAMIC`, `useBuCode` จากไฟล์นั้น):

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { ApiError } from "@/lib/api-error";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import { httpClient } from "@/lib/http-client";
import type {
  BuDashboardWidgetListResponse,
  CreateBuDashboardWidgetDto,
  DashboardDatasetDetail,
  UpdateMyDashboardWidgetDto,
} from "@/types/dashboard-widget";

/** module: "main" = หน้า /dashboard หลัก หรือชื่อ module dashboard */
export function useBuDashboardWidgets(module: string) {
  const buCode = useBuCode();
  return useQuery<BuDashboardWidgetListResponse, ApiError>({
    queryKey: [QUERY_KEYS.BU_DASHBOARD_WIDGETS, buCode, module],
    queryFn: async () => {
      const res = await httpClient.get(API_ENDPOINTS.DASHBOARD_BU_WIDGETS(buCode!, module));
      if (!res.ok) throw await ApiError.from(res, "Failed to fetch BU dashboard widgets");
      const json = await res.json();
      return json.data as BuDashboardWidgetListResponse;
    },
    enabled: !!buCode,
    retry: false,
    ...CACHE_DYNAMIC,
  });
}

export function buDashboardWidgetDataQueryOptions(buCode: string | undefined, widgetId: string, enabled = true) {
  return {
    queryKey: [QUERY_KEYS.BU_DASHBOARD_WIDGET_DATA, buCode, widgetId] as const,
    queryFn: async (): Promise<DashboardDatasetDetail> => {
      const res = await httpClient.get(API_ENDPOINTS.DASHBOARD_LAB_BU_WIDGET_DATA(buCode!, widgetId));
      if (!res.ok) throw await ApiError.from(res, "Failed to fetch BU widget data");
      const json = await res.json();
      return json.data as DashboardDatasetDetail;
    },
    enabled: !!buCode && enabled,
    ...CACHE_DYNAMIC,
  };
}

function useInvalidateBuWidgets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BU_DASHBOARD_WIDGETS] });
}

export function useCreateBuDashboardWidget() {
  const buCode = useBuCode();
  const invalidate = useInvalidateBuWidgets();
  return useMutation<{ id: string }, ApiError, CreateBuDashboardWidgetDto>({
    mutationFn: async (dto) => {
      const res = await httpClient.post(API_ENDPOINTS.DASHBOARD_BU_WIDGETS(buCode!), dto);
      if (!res.ok) throw await ApiError.from(res, "Failed to create BU widget");
      return (await res.json()).data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateBuDashboardWidget() {
  const buCode = useBuCode();
  const invalidate = useInvalidateBuWidgets();
  return useMutation<unknown, ApiError, UpdateMyDashboardWidgetDto & { id: string }>({
    mutationFn: async ({ id, ...dto }) => {
      const res = await httpClient.patch(API_ENDPOINTS.DASHBOARD_BU_WIDGET_BY_ID(buCode!, id), dto);
      if (!res.ok) throw await ApiError.from(res, "Failed to update BU widget");
      return (await res.json()).data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteBuDashboardWidget() {
  const buCode = useBuCode();
  const invalidate = useInvalidateBuWidgets();
  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      const res = await httpClient.delete(API_ENDPOINTS.DASHBOARD_BU_WIDGET_BY_ID(buCode!, id));
      if (!res.ok) throw await ApiError.from(res, "Failed to delete BU widget");
    },
    onSuccess: invalidate,
  });
}

export function useReorderBuDashboardWidgets() {
  const buCode = useBuCode();
  const invalidate = useInvalidateBuWidgets();
  return useMutation<unknown, ApiError, { items: { id: string; order_index: number }[] }>({
    mutationFn: async (body) => {
      const res = await httpClient.patch(API_ENDPOINTS.DASHBOARD_BU_WIDGET_REORDER(buCode!), body);
      if (!res.ok) throw await ApiError.from(res, "Failed to reorder BU widgets");
      return (await res.json()).data;
    },
    onSuccess: invalidate,
  });
}
```

(import `useBuCode` จาก path ที่ `use-my-dashboard-widgets.ts` ใช้)
**toast error จาก query**: `components/api-error-toaster.tsx` toast error ทั่วไปอยู่ (ยกเว้น 401/403) — ตรวจว่ามันฟัง query error ด้วยหรือไม่ และมีทางปิดต่อ query (เช่น `meta`) หรือไม่ ถ้า toast และไม่มีทางปิด ให้หยุดรายงาน (Review Focus ข้อ 4)

- [ ] **Step 4: ตรวจ + Commit**

Run: `bunx tsc --noEmit && bun run lint && bun test:run`

```bash
git add constant types hooks/use-bu-dashboard-widgets.ts
git commit -m "feat(dashboard): เพิ่ม endpoint, สิทธิ์ และ hook ของ BU dashboard widget"
```

---

### Task 3: `BuWidgetSection` — ส่วน BU ที่ใช้ร่วมทั้งหน้าหลักและหน้า module

**Files:**
- Create: `components/dashboard-widget/bu-widget-section.tsx`
- Create (ถ้าไฟล์หลักเกิน ~300 บรรทัด): `components/dashboard-widget/use-bu-widget-handlers.ts`
- Modify: `messages/en.json`, `messages/th.json` (namespace `dashboard.buWidget`)

**Interfaces:**
- Consumes: hook Task 2 · `SortableWidgetItem({ widget, detail, isLoading, onDelete, dataset, onConfigure, onVisible, onChangeType, editable })` และ `WidgetConfigDialog({ open, onOpenChange, dataset, initialParams, initialDisplay, widgetType, isPending, onSubmit })` (Task 1) · `defaultWidgetTypeFor`, `SUPPORTED_SHAPES` (`widget-shape`) · `useDashboardDatasets()` (`hooks/use-dashboard-dataset`) · `LookupDataset`, `DeleteDialog`, `WidgetSkeletonCards` (import path ตาม `dashboard-component.tsx` L1-63) · `useCan()`
- Produces: `BuWidgetSection({ module, title }: { module: string; title: string })`

- [ ] **Step 1: i18n**

`messages/en.json` ใต้ `dashboard`:

```json
"buWidget": {
  "sectionMain": "Business unit dashboard",
  "sectionModule": "More from your business unit",
  "add": "Add widget",
  "entity": "BU widget",
  "empty": "No business unit widgets yet. Add one to share it with everyone in this business unit.",
  "deleteTitle": "Remove BU widget",
  "deleteConfirm": "Remove \"{title}\" for everyone in this business unit?",
  "customizeWarning": "This business unit's dashboard now differs from the platform default, so future platform updates will no longer be applied automatically."
}
```

`th.json` แปลครบ เช่น `sectionMain` "Dashboard ของ BU" · `sectionModule` "เพิ่มเติมของ BU" · `add` "เพิ่ม widget" · `entity` "widget ของ BU" · `empty` "ยังไม่มี widget ของ BU เพิ่มเพื่อให้ทุกคนใน BU นี้เห็น" · `deleteTitle` "ลบ widget ของ BU" · `deleteConfirm` "ลบ \"{title}\" ออกสำหรับทุกคนใน BU นี้?" · `customizeWarning` "dashboard ของ BU นี้ต่างจากค่า default ของ platform แล้ว การอัปเดตจาก platform ครั้งต่อไปจะไม่ถูกนำมาใช้อัตโนมัติ" — ห้ามมี `{{`

- [ ] **Step 2: data + การซ่อน**

```tsx
export function BuWidgetSection({ module, title }: { module: string; title: string }) {
  const t = useTranslations("dashboard.buWidget");
  const tt = useTranslations("toast");
  const buCode = useBuCode();
  const { can } = useCan();
  const canEdit = can(PERMISSIONS.dashboard.bu_widget.update);
  const canCreate = can(PERMISSIONS.dashboard.bu_widget.create);
  const { data, isLoading, isError } = useBuDashboardWidgets(module);
  const items = useMemo(
    () => [...(data?.items ?? [])].sort((a, b) => a.order_index - b.order_index),
    [data?.items],
  );
  // hooks ที่เหลือ (datasets, mutations, visibleIds, sensors, useQueries) ต้องประกาศ "ก่อน" early return ทั้งหมด

  if (isError) return null; // backend ยังไม่ deploy / ล่ม → ซ่อนเงียบ ๆ
  if (!isLoading && items.length === 0 && !canCreate) return null;
  // …render
}
```

render: `<section>` + หัวข้อ `<h2>` ใช้คลาสเดียวกับหัวข้อ `SavedWidgetsSection` (`dashboard-component.tsx:396-418`) · `LookupDataset` (`excludeIds` = ไม่มี, `shapes={SUPPORTED_SHAPES}`, placeholder `+ ${t("add")}`) เฉพาะ `canCreate` · loading → `WidgetSkeletonCards` · ว่าง (และ `canCreate`) → ข้อความ `empty`

- [ ] **Step 3: handler + เตือนครั้งแรก**

```tsx
  const warnedRef = useRef(false);
  const customizedAt = data?.deploy_state?.customized_at ?? null;
  const warnOnce = useCallback(() => {
    if (warnedRef.current || customizedAt) return;
    warnedRef.current = true;
    toast.warning(t("customizeWarning"));
  }, [customizedAt, t]);

  const wireModule = module === "main" ? null : module;
  const nextOrder = useMemo(() => (items.at(-1)?.order_index ?? 0) + 10, [items]);
```

ทุก mutation ส่ง `{ onSuccess: warnOnce }` เป็น option ตอน `mutate`:
- `handleAdd(ds)`: dataset มี `params` ที่ต้องกรอก → `setPendingAdd(ds)` (เปิด `WidgetConfigDialog`) · ไม่งั้น `createWidget.mutate({ dataset_id: ds.id, widget_type: defaultWidgetTypeFor(ds), title: ds.name, module: wireModule, order_index: nextOrder }, { onSuccess: () => { warnOnce(); toast.success(tt("createSuccess", { entity: t("entity") })); } })`
- `handleCreateWithParams(params, display)` / `handleConfigure(params, display)` / `handleChangeType(w, type)` → create/update ตามแบบ `dashboard-component.tsx:248-317` (ไม่ทำ optimistic — invalidate พอ) · group widget (`status-group`) **ไม่รองรับ** ใน BU รอบนี้
- `handleDragEnd(event)`:

```tsx
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((w) => w.id === active.id);
    const newIndex = items.findIndex((w) => w.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex).map((w, i) => ({ ...w, order_index: (i + 1) * 10 }));
    queryClient.setQueryData<BuDashboardWidgetListResponse>(
      [QUERY_KEYS.BU_DASHBOARD_WIDGETS, buCode, module],
      (old) => (old ? { ...old, items: reordered } : old),
    );
    reorder.mutate(
      { items: reordered.map(({ id, order_index }) => ({ id, order_index })) },
      {
        onSuccess: warnOnce,
        onError: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BU_DASHBOARD_WIDGETS] }),
      },
    );
  };
```

- ลบ: `DeleteDialog` ข้อความ `deleteTitle` / `deleteConfirm` (`title` = `w.title ?? dataset name`) → `deleteWidget.mutate(id, { onSuccess: warnOnce })`

grid (`ids`, `datasetsById`, `sensors` ต้อง memoize · `visibleIds/markVisible` ยกจาก `dashboard-component.tsx:142-158`):

```tsx
  const dataQueries = useQueries({
    queries: items.map((w) => buDashboardWidgetDataQueryOptions(buCode, w.id, visibleIds.has(w.id))),
  });
  // …
  <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={canEdit ? handleDragEnd : undefined}>
    <SortableContext items={ids} strategy={rectSortingStrategy}>
      <ul className="grid auto-rows-[4rem] grid-cols-1 gap-3 md:grid-cols-6 lg:grid-cols-12">
        {items.map((w, i) => (
          <SortableWidgetItem
            key={w.id}
            widget={w}
            dataset={datasetsById.get(w.dataset_id)}
            detail={dataQueries[i]?.data}
            isLoading={dataQueries[i]?.isLoading ?? true}
            editable={canEdit}
            onDelete={() => setPendingDelete(w)}
            onConfigure={() => setPendingConfig(w)}
            onVisible={markVisible}
            onChangeType={(type) => handleChangeType(w, type)}
          />
        ))}
      </ul>
    </SortableContext>
  </DndContext>
```

ปุ่มลบ (`useDeleteBuDashboardWidget`) แสดงตาม `editable` ทั้งก้อน — ถ้าต้องแยก `delete` ออกจาก `update` ให้ส่ง `onDelete` เป็น `undefined` เมื่อไม่มี `can(PERMISSIONS.dashboard.bu_widget.delete)` (ตรวจว่า `SortableWidgetItem` รองรับ `onDelete` optional — ถ้าไม่ ให้คงแบบ `editable` ทั้งก้อน)

- [ ] **Step 4: ตรวจ + Commit**

Run: `bunx tsc --noEmit && bun run lint && bun test:run`

```bash
git add components/dashboard-widget messages
git commit -m "feat(dashboard): เพิ่มส่วน BU widget ที่ทุกคนใน BU เห็นและแก้ได้ตามสิทธิ์"
```

---

### Task 4: วางส่วน BU บน `/dashboard` และทุกหน้า module

**Files:**
- Modify: `routes/dashboard/dashboard-component.tsx` (L100-135 `DashboardComponent`, L439-442 EmptyState)
- Modify: `routes/procurement/procurement-dashboard.tsx`
- Modify: `routes/inventory-management/inventory-dashboard.tsx`
- Modify: `routes/product-management/product-dashboard.tsx`
- Modify: `routes/vendor-management/vendor-dashboard.tsx`
- Modify: `routes/config/config-dashboard.tsx`
- Modify: `routes/operation-plan/operation-dashboard.tsx`

**Interfaces:**
- Consumes: `BuWidgetSection` (Task 3), `useBuDashboardWidgets` (Task 2)

- [ ] **Step 1: หน้า `/dashboard`**

ใน `DashboardComponent` (L129-131):

```tsx
<Reveal delay={100}>
  <BuWidgetSection module="main" title={tBu("sectionMain")} />
</Reveal>
<Reveal delay={150}>
  <SavedWidgetsSection />
</Reveal>
```

(`const tBu = useTranslations("dashboard.buWidget")`) · หัวข้อ personal คงเป็น `savedWidget.section` ("Saved Widgets" / "วิดเจ็ตที่บันทึก") — แยกจากหัวข้อ BU ชัดอยู่แล้ว

- [ ] **Step 2: empty state เมื่อทั้งสองส่วนว่าง**

ใน `SavedWidgetsSection`:

```tsx
const buQuery = useBuDashboardWidgets("main");
const buEmpty = buQuery.isError || (buQuery.data?.items.length ?? 0) === 0;
// L439-442
{!isLoading && !isError && renderable.length === 0 && groupItems.length === 0 && buEmpty && <EmptyState />}
```

query key เดียวกับใน `BuWidgetSection` → TanStack dedupe ไม่ยิงซ้ำ

- [ ] **Step 3: หน้า module ที่ใช้ `DashboardWidgetGrid`** (procurement / inventory / product / vendor)

`DashboardWidgetGrid` ครอบทั้งหน้า (`<div className="space-y-4 p-3">`) → ต่อส่วน BU หลัง grid:

```tsx
export function Component() {
  const t = useTranslations("procurement.dashboard");
  const tBu = useTranslations("dashboard.buWidget");
  const query = useProcurementWidgets();
  return (
    <>
      <DashboardWidgetGrid title={t("title")} description={t("description")} moduleName="procurement" subTileFor={subTileFor} query={query} />
      <div className="px-3 pb-3">
        <BuWidgetSection module="procurement" title={tBu("sectionModule")} />
      </div>
    </>
  );
}
```

ปรับตามโครงจริงของแต่ละไฟล์ · module: `procurement`, `inventory`, `product`, `vendor-management` (**ไม่ใช่** `vendor`)
ถ้าหน้าตา card ของ `SortableWidgetItem` ต่างจาก card ของ grid module ชัดเจน ให้จดไว้รายงานใน Task 5 — **อย่าแก้** `dashboard-widget-grid.tsx` (1123 บรรทัด) ในรอบนี้

- [ ] **Step 4: หน้า config และ operation-plan** (layout ของตัวเอง มี `Section` ภายในไฟล์)

วาง `<BuWidgetSection module="config" title={tBu("sectionModule")} />` / `module="operation-plan"` เป็นส่วนสุดท้ายในคอนเทนเนอร์หลักของหน้า ระยะห่างเท่ากับ `Section` อื่นในไฟล์

- [ ] **Step 5: ตรวจ + Commit**

Run: `bunx tsc --noEmit && bun run lint && bun test:run`
Expected: ผ่าน; ESLint ไม่ฟ้อง cross-module

```bash
git add routes
git commit -m "feat(dashboard): แสดง BU widget บนหน้า dashboard หลักและต่อท้ายทุกหน้า module dashboard"
```

---

### Task 5: ตรวจมือในเบราว์เซอร์ + PR

- [ ] **Step 1: เตรียม** — Plan 1 + 2 รันในเครื่อง (`VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`) · deploy ชุด default ให้ BU ทดสอบผ่านหน้า platform (Plan 3) หรือ curl (Plan 2 Task 5) · user สองคน: (A) มี `dashboard.bu_widget.*` (B) ไม่มี

- [ ] **Step 2: ตรวจ** (Radix menu/ปุ่มบางตัวคลิกด้วย ref ไม่ติด — ใช้ JS `.click()`)
  1. A เปิด `/dashboard` → "Dashboard ของ BU" อยู่บน แสดงชุดที่ deploy · ส่วน personal อยู่ล่างเหมือนเดิม
  2. A ลากสลับ widget ของ BU → network มี `PATCH …/bu/reorder` **ครั้งเดียว** · toast `customizeWarning` ขึ้นครั้งเดียว · ลากอีกไม่เตือนซ้ำ
  3. หน้า platform แท็บ Deploy → BU นี้ขึ้น `Customised`
  4. B เปิด `/dashboard` → เห็นส่วน BU แต่ไม่มีปุ่มลาก/ลบ/gear/เปลี่ยนชนิด และไม่มีช่องเพิ่ม
  5. BU ที่ไม่มี BU widget: B ไม่เห็นส่วน BU เลย · A เห็นหัวข้อ + `empty` + ช่องเพิ่ม
  6. user ที่ไม่มี personal widget ใน BU ที่มี BU widget → ไม่ขึ้น EmptyState ใหญ่
  7. หน้า procurement / inventory / product / vendor / config / operation-plan → system widgets เหมือนก่อนเปลี่ยน (เทียบภาพกับ `main`) และส่วน "เพิ่มเติมของ BU" อยู่ท้าย (ซ่อนสำหรับ B เมื่อว่าง)
  8. หยุด gateway ชั่วคราว → `/dashboard` ไม่พัง ส่วน BU หาย ไม่มี toast error จาก BU query
  9. สลับภาษา th/en → ไม่มีคีย์หลุด
- [ ] **Step 3: แก้สิ่งที่พบ แล้ว `bunx tsc --noEmit && bun run lint && bun test:run`**

- [ ] **Step 4: PR** (ภาษาอังกฤษ, ห้าม squash) — ลำดับ deploy: backend-v2 → micro-data (`cmd/migrate` ครบทุก tenant) → seed + assign `dashboard.bu_widget.*` ให้ admin ทุก BU → carmen-platform → FE (`vercel --prod`) · FE ที่ขึ้นก่อน backend ไม่พัง (ส่วน BU ซ่อน)
