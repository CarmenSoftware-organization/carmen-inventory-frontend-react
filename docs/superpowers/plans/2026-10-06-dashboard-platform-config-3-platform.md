# Dashboard Platform Config — Plan 3/4: carmen-platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** หน้า "Dashboard Templates" ใน carmen-platform สามแท็บ — จัดการ system widgets, จัดการชุด default ของ BU และ deploy ชุด default ไปหลาย BU พร้อมสถานะต่อ BU

**Architecture:** service ใหม่ `dashboardTemplateService` เรียก `/api-system/dashboard-templates*` (Plan 1) หน้า `DashboardTemplateManagement` ถือ `TabStrip` และ render panel ของแท็บ: `TemplateListPanel` (ใช้ซ้ำทั้ง system/bu_default ต่างกันที่ `kind`) และ `DeployPanel` (วน BU ด้วย `mapWithConcurrency` ที่มีอยู่) ชิ้นส่วนที่มีชื่ออยู่ใน `src/pages/dashboardTemplates/`

**Tech Stack:** React · Vite · TypeScript · axios (`services/api`) · sonner · lucide-react · vitest

**Spec:** `carmen-inventory-frontend-react/docs/superpowers/specs/2026-10-06-dashboard-platform-config-design.md` (§10 มีผลเหนือส่วนก่อนหน้า) · API: ตาราง "gateway → platform/FE" ใน Plan 1

**Repo:** `/Users/samutpra/GitHub/carmensoftware-organize/carmen-platform` · branch `feature/dashboard-platform-config` จาก `main`

## Global Constraints

- **ไม่เขียนเทสต์ใหม่** (preference ของ user) — `bun run typecheck && bun run lint && bun run test` ต้องเขียวทุก task
- **ห้ามแก้ `src/components/ui/`** และ **ห้ามเพิ่ม library** (ไม่มี dnd → เรียงด้วยปุ่มขึ้น/ลง)
- type ที่ใช้ร่วมอยู่ `src/types/index.ts` (field ใหม่ optional)
- toast จาก `sonner` (warning = สำเร็จบางส่วน, info = ไม่มีอะไรทำ) · ห้าม `alert/confirm`
- ลบใช้ `<ConfirmDialog>` · status ใช้ `<Badge variant="success|secondary|warning|destructive|outline">` · title ผ่าน `<PageHeader>` · section nav ใช้ `<TabStrip>`
- gate สิทธิ์ 3 จุดด้วยคีย์เดียวกัน: route (`PrivateRoute requiredPermission`), nav item, ปุ่ม (`<Can permission>`) — permission ฝั่ง platform ลงท้าย `.read` · ใช้ `PLATFORM_SCOPED_RECORD` กับ record ระดับ platform
- i18n: `en.ts` เป็นต้นแบบ, `th.ts` ต้องมีคีย์ครบ (type-checked) · interpolation `{{name}}`
- catch: `getErrorDetail(err, t)` / `isVersionConflict` / `notifyVersionConflict`
- BU list: `fetchAllBusinessUnits({ sort: 'code:asc', label })` — ห้าม `perpage: -1`
- module: `procurement` `inventory` `product` `config` `vendor-management` `operation-plan` `store-operation`; bu_default มี `main` (= `module: null`) เพิ่ม
- allow/deny = BU **code** (`BusinessUnitMultiSelect keyBy="code"`)
- commit message ภาษาไทย

## Review Focus

1. **เปลี่ยน dataset แล้ว widget type เดิมไม่อยู่ใน `supported_renders`** → รีเซ็ตเป็นตัวแรกที่รองรับ ไม่ส่งค่าที่ backend จะตอบ 422 (Task 3 Step 2)
2. **409 ระหว่าง deploy** → หยุดทั้งรอบ (ไม่ยิง BU ที่เหลือ) และบอกให้โหลดสถานะใหม่ (Task 4 Step 3)
3. **ปิดหน้าระหว่าง deploy** → abort ทุก request ที่ค้าง และไม่ setState หลัง unmount (Task 4 Step 2–3)
4. **ผู้ใช้ที่มีแค่ `.read`** → ไม่เห็นปุ่มเขียน/แท็บ Deploy แต่ยังดูรายการได้ (Task 1 Step 6, Task 2, Task 4)
5. **ปุ่มขึ้น/ลงที่ขอบรายการ** → disabled ไม่ส่ง reorder ที่ไม่เปลี่ยนอะไร (Task 2 Step 1–2)

---

### Task 1: types, service, route, nav, i18n, โครงหน้าพร้อมแท็บ

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/services/dashboardTemplateService.ts`
- Create: `src/pages/DashboardTemplateManagement.tsx`
- Create: `src/pages/dashboardTemplates/modules.ts`
- Modify: `src/App.tsx` (lazy import ~37-43, route ข้าง `/report-templates` ~357-380)
- Modify: `src/components/nav/platformNav.ts:27-28`
- Modify: `src/components/Breadcrumbs.tsx:22`
- Modify: `src/constants/featureFlags.ts:60`
- Modify: `src/i18n/en.ts`, `src/i18n/th.ts`

**Interfaces:**
- Produces:
  - types `DashboardTemplateKind`, `DashboardTemplate`, `DashboardTemplateInput`, `DashboardDatasetParam`, `DashboardDatasetInfo`, `DashboardDeployStatusValue`, `DashboardDeployStatus`, `DashboardDeployMode`, `DashboardDeployResult`
  - `dashboardTemplateService.{list, create, update, remove, reorder, datasets, version, deployStatus, deploy}`
  - `DASHBOARD_MODULES`, `MAIN_MODULE`, `toWireModule(m)`, `MODULE_LABEL_KEY`
  - page `/dashboard-templates?tab=system|bu_default|deploy`

- [ ] **Step 1: types (`src/types/index.ts`)**

```ts
export type DashboardTemplateKind = 'system' | 'bu_default';

export interface DashboardTemplate {
  id: string;
  kind: DashboardTemplateKind;
  module: string | null;
  dataset_id: string;
  widget_type: string;
  title?: string | null;
  order_index: number;
  params?: Record<string, string | number> | null;
  display?: Record<string, unknown> | null;
  allow_business_unit?: string[] | null;
  deny_business_unit?: string[] | null;
  is_active: boolean;
  doc_version?: number;
  created_at?: string;
  updated_at?: string;
}

export type DashboardTemplateInput = Omit<DashboardTemplate, 'id' | 'doc_version' | 'created_at' | 'updated_at'>;

export interface DashboardDatasetParam {
  name: string;
  label: string;
  type: string;
  required: boolean;
  default?: string | number;
  options?: string[];
}

export interface DashboardDatasetInfo {
  id: string;
  name: string;
  description?: string;
  shape: string;
  category: string;
  unit?: string;
  params: DashboardDatasetParam[];
  supported_renders: string[];
}

export type DashboardDeployStatusValue = 'never' | 'customized' | 'outdated' | 'current';

export interface DashboardDeployStatus {
  version: number;
  status: DashboardDeployStatusValue;
  deployed_version: number | null;
  deployed_at: string | null;
  customized_at: string | null;
}

export type DashboardDeployMode = 'skip_customized' | 'overwrite';

export interface DashboardDeployResult {
  result: 'deployed' | 'skipped';
  count?: number;
}
```

- [ ] **Step 2: service**

```ts
import api from './api';
import type {
  DashboardTemplate, DashboardTemplateInput, DashboardTemplateKind, DashboardDatasetInfo,
  DashboardDeployStatus, DashboardDeployMode, DashboardDeployResult,
} from '../types';

const BASE = '/api-system/dashboard-templates';
// gateway ห่อ envelope { data } — ตาม src/services/CLAUDE.md
const unwrap = <T>(res: { data: unknown }): T => {
  const body = res.data as { data?: T } | T;
  return ((body as { data?: T })?.data ?? body) as T;
};

const dashboardTemplateService = {
  list: async (kind: DashboardTemplateKind, module?: string): Promise<DashboardTemplate[]> => {
    const q = new URLSearchParams({ kind, ...(module ? { module } : {}) });
    const inner = unwrap<DashboardTemplate[] | { data: DashboardTemplate[] }>(await api.get(`${BASE}?${q}`));
    return Array.isArray(inner) ? inner : inner?.data ?? [];
  },
  create: async (data: DashboardTemplateInput): Promise<{ id: string }> => unwrap(await api.post(BASE, data)),
  update: async (id: string, data: Partial<DashboardTemplateInput> & { doc_version?: number }) =>
    unwrap<{ id: string; doc_version: number }>(await api.patch(`${BASE}/${id}`, data)),
  remove: async (id: string): Promise<void> => {
    await api.delete(`${BASE}/${id}`);
  },
  reorder: async (kind: DashboardTemplateKind, module: string, items: { id: string; order_index: number }[]) =>
    unwrap<{ reordered: number }>(await api.patch(`${BASE}/reorder`, { kind, module, items })),
  datasets: async (): Promise<DashboardDatasetInfo[]> =>
    unwrap<{ items: DashboardDatasetInfo[] }>(await api.get(`${BASE}/datasets`)).items ?? [],
  version: async (): Promise<number> => unwrap<{ version: number }>(await api.get(`${BASE}/bu-default/version`)).version,
  deployStatus: async (buCode: string, signal?: AbortSignal): Promise<DashboardDeployStatus> =>
    unwrap(await api.get(`${BASE}/deploy/${encodeURIComponent(buCode)}/status`, { signal })),
  deploy: async (buCode: string, mode: DashboardDeployMode, expectedVersion: number, signal?: AbortSignal) =>
    unwrap<DashboardDeployResult>(
      await api.post(`${BASE}/deploy/${encodeURIComponent(buCode)}`, { mode, expected_version: expectedVersion }, { signal }),
    ),
};

export default dashboardTemplateService;
```

ตรวจ envelope จริงด้วย curl (Plan 1 Task 8) แล้วปรับ `unwrap`/`list` ถ้าซ้อนต่างไป

- [ ] **Step 3: modules (`src/pages/dashboardTemplates/modules.ts`)**

```ts
import type { TKey } from '../../i18n/types';

export const DASHBOARD_MODULES = [
  'procurement', 'inventory', 'product', 'config', 'vendor-management', 'operation-plan', 'store-operation',
] as const;
export const MAIN_MODULE = 'main';

/** module ใน wire: 'main' → null */
export const toWireModule = (m: string): string | null => (m === MAIN_MODULE ? null : m);

export const MODULE_LABEL_KEY: Record<string, TKey> = {
  main: 'pages.dashboardTemplates.module.main',
  procurement: 'pages.dashboardTemplates.module.procurement',
  inventory: 'pages.dashboardTemplates.module.inventory',
  product: 'pages.dashboardTemplates.module.product',
  config: 'pages.dashboardTemplates.module.config',
  'vendor-management': 'pages.dashboardTemplates.module.vendorManagement',
  'operation-plan': 'pages.dashboardTemplates.module.operationPlan',
  'store-operation': 'pages.dashboardTemplates.module.storeOperation',
};
```

(ตรวจ path ของ `TKey` จริงใน `src/i18n/types.ts`)

- [ ] **Step 4: i18n — en (th แปลทุกคีย์ในตำแหน่งชื่อเดียวกัน)**

```ts
nav: { /* … */ dashboardTemplates: 'Dashboard Templates' },
breadcrumb: { /* … */ dashboardTemplates: 'Dashboard Templates' },
entity: { /* … */ dashboardTemplate: { title: 'Dashboard widget', sentence: 'Dashboard widget', lower: 'dashboard widget' } },
pages: {
  /* … */
  dashboardTemplates: {
    subtitle: 'System widgets shown on every BU module dashboard, and the default BU dashboard deployed to business units',
    tabSystem: 'System widgets',
    tabBuDefault: 'BU default',
    tabDeploy: 'Deploy',
    moduleLabel: 'Page',
    module: {
      main: 'Main dashboard', procurement: 'Procurement', inventory: 'Inventory', product: 'Product',
      config: 'Configuration', vendorManagement: 'Vendor management', operationPlan: 'Operation plan',
      storeOperation: 'Store operation',
    },
    versionBadge: 'Version {{version}}',
    addWidget: 'Add widget',
    empty: 'No widgets on this page yet',
    columnTitle: 'Title',
    columnDataset: 'Dataset',
    columnType: 'Type',
    columnStatus: 'Status',
    moveUp: 'Move up',
    moveDown: 'Move down',
    reorderFailed: 'Could not change the order: {{detail}}',
    loadFailed: 'Could not load widgets: {{detail}}',
    datasetMissing: 'Dataset no longer exists',
    deleteTitle: 'Delete widget',
    deleteDescription: 'Remove this widget template? Business units that already received it keep their copy until the next deploy.',
    dialogCreateTitle: 'Add widget',
    dialogEditTitle: 'Edit widget',
    fieldDataset: 'Dataset',
    fieldDatasetPlaceholder: 'Choose a dataset',
    fieldWidgetType: 'Widget type',
    fieldTitle: 'Title',
    fieldTitlePlaceholder: 'Defaults to the dataset name',
    fieldParams: 'Parameters',
    fieldActive: 'Active',
    fieldAllowBu: 'Only these business units',
    fieldAllowBuHint: 'Leave empty to show on every business unit',
    fieldDenyBu: 'Hide from these business units',
    saveFailed: 'Could not save the widget: {{detail}}',
    deployHint: 'Deploy copies the BU default (version {{version}}) into each selected business unit and replaces its BU dashboard.',
    columnBu: 'Business unit',
    columnDeployStatus: 'Status',
    columnDeployedVersion: 'Deployed version',
    columnDeployedAt: 'Deployed at',
    columnCustomizedAt: 'Customised at',
    status: { never: 'Never deployed', customized: 'Customised', outdated: 'Outdated', current: 'Up to date', unknown: 'Not checked', error: 'Error' },
    refreshStatus: 'Refresh status',
    selectOutdated: 'Select outdated',
    modeLabel: 'Mode',
    modeSkip: 'Skip customised business units',
    modeOverwrite: 'Overwrite everything',
    deployButton: 'Deploy to {{count}} business unit(s)',
    overwriteTitle: 'Overwrite customised dashboards?',
    overwriteDescription: '{{count}} selected business unit(s) changed their BU dashboard by hand. Their changes will be replaced.',
    typeToConfirm: 'Type {{code}} to confirm',
    rowDeployed: 'Deployed {{count}} widget(s)',
    rowSkipped: 'Skipped (customised)',
    deployDone: 'Deploy finished: {{ok}} deployed, {{skipped}} skipped',
    deployPartial: 'Deploy finished with errors: {{ok}} deployed, {{skipped}} skipped, {{failed}} failed',
    deployConflict: 'The BU default changed while deploying. The run was stopped; refresh the status and deploy again.',
    stop: 'Stop',
  },
},
```

ถ้า repo มีรูป plural (`{{count#one|many}}`) ที่หน้าอื่นใช้กับข้อความแบบนี้ ให้ใช้ตามนั้นแทน `(s)`

- [ ] **Step 5: route + nav + breadcrumb + feature flag**

`App.tsx`:

```tsx
const DashboardTemplateManagement = lazy(() => import('./pages/DashboardTemplateManagement'));
// ข้าง route /report-templates
<Route path="/dashboard-templates" element={
  <PrivateRoute requiredPermission="dashboard_template.read" feature="dashboard_templates">
    <DashboardTemplateManagement />
  </PrivateRoute>
} />
```

`platformNav.ts` ต่อจาก `/report-form-groups` (group ต้องติดกัน):

```ts
  { path: '/dashboard-templates', labelKey: 'nav.dashboardTemplates', icon: LayoutDashboard, permission: 'dashboard_template.read', groupKey: 'navGroup.content', feature: 'dashboard_templates' },
```

(import `LayoutDashboard` จาก lucide-react)
`Breadcrumbs.tsx` `SEGMENT_KEYS`: `'dashboard-templates': 'breadcrumb.dashboardTemplates',`
`featureFlags.ts`: `{ key: 'dashboard_templates', labelKey: 'nav.dashboardTemplates', groupKey: 'navGroup.content', defaultState: 'active' },`

- [ ] **Step 6: หน้า + แท็บ**

```tsx
type Tab = 'system' | 'bu_default' | 'deploy';
const TAB_ORDER: Tab[] = ['system', 'bu_default', 'deploy'];
const TAB_LABEL: Record<Tab, TKey> = {
  system: 'pages.dashboardTemplates.tabSystem',
  bu_default: 'pages.dashboardTemplates.tabBuDefault',
  deploy: 'pages.dashboardTemplates.tabDeploy',
};

export default function DashboardTemplateManagement() {
  const { t } = useI18n();
  const { hasPermission } = useAuth();
  const [params, setParams] = useSearchParams();
  const canDeploy = hasPermission('dashboard_template.deploy', { clusterId: PLATFORM_SCOPED_RECORD });

  const tabs = useMemo<TabStripItem<Tab>[]>(
    () => TAB_ORDER.filter((id) => id !== 'deploy' || canDeploy).map((id) => ({ id, label: t(TAB_LABEL[id]) })),
    [canDeploy, t],
  );
  const requested = params.get('tab');
  const tab: Tab = tabs.find((x) => x.id === requested)?.id ?? 'system';

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <PageHeader title={t('nav.dashboardTemplates')} subtitle={t('pages.dashboardTemplates.subtitle')} />
        <TabStrip tabs={tabs} value={tab} onChange={(next) => setParams({ tab: next }, { replace: true })} />
        {tab === 'deploy' ? <DeployPanel /> : <TemplateListPanel key={tab} kind={tab} />}
      </div>
    </Layout>
  );
}
```

ระหว่าง Task 1 ที่ panel ยังไม่มี ให้ export `TemplateListPanel`/`DeployPanel` เป็นคอมโพเนนต์คืน `null` ในไฟล์ของมันเอง แล้ว Task 2/4 เติม · ตรวจ import ของ `Layout/PageHeader/TabStrip/useI18n/useAuth/PLATFORM_SCOPED_RECORD` จาก `ReportTemplateManagement.tsx` และ `LicenseCatalog.tsx`

- [ ] **Step 7: ตรวจ + Commit**

Run: `bun run typecheck && bun run lint && bun run test`
Expected: ผ่าน

```bash
git add src
git commit -m "feat(dashboard-templates): เพิ่ม service, route, เมนู และโครงหน้า Dashboard Templates"
```

---

### Task 2: `TemplateListPanel` — รายการต่อ module + เรียงขึ้น/ลง + ลบ

**Files:**
- Modify: `src/pages/dashboardTemplates/TemplateListPanel.tsx`
- Create: `src/pages/dashboardTemplates/useDashboardDatasets.ts`
- Create: `src/pages/dashboardTemplates/reorderItems.ts`

**Interfaces:**
- Consumes: `dashboardTemplateService` (Task 1), `DASHBOARD_MODULES`, `MAIN_MODULE`, `MODULE_LABEL_KEY`
- Produces: `TemplateListPanel({ kind }: { kind: DashboardTemplateKind })` · `useDashboardDatasets(): { datasets: DashboardDatasetInfo[]; byId: Map<string, DashboardDatasetInfo>; loading: boolean }` · `moveItem(items, index, dir): { id: string; order_index: number }[]`

- [ ] **Step 1: helpers**

`reorderItems.ts`:

```ts
/** สลับ index กับเพื่อนบ้านแล้วคืน order_index ใหม่ทั้งชุด (10, 20, 30 …) — ขอบรายการคืน [] */
export function moveItem<T extends { id: string }>(items: T[], index: number, dir: -1 | 1): { id: string; order_index: number }[] {
  const target = index + dir;
  if (target < 0 || target >= items.length) return [];
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((it, i) => ({ id: it.id, order_index: (i + 1) * 10 }));
}
```

`useDashboardDatasets.ts`:

```ts
export function useDashboardDatasets() {
  const { t } = useI18n();
  const [datasets, setDatasets] = useState<DashboardDatasetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    dashboardTemplateService
      .datasets()
      .then((d) => { if (!cancelled) setDatasets(d); })
      .catch((err) => { if (!cancelled) toast.error(t('pages.dashboardTemplates.loadFailed', { detail: getErrorDetail(err, t) })); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [t]);
  const byId = useMemo(() => new Map(datasets.map((d) => [d.id, d])), [datasets]);
  return { datasets, byId, loading };
}
```

- [ ] **Step 2: panel**

state: `module` (system เริ่ม `'procurement'`, bu_default เริ่ม `MAIN_MODULE`), `items: DashboardTemplate[]`, `loading`, `busy`, `deleteId`, `editing: DashboardTemplate | 'new' | null`, `version: number | null` (bu_default)

```tsx
const load = useCallback(async () => {
  setLoading(true);
  try {
    const rows = await dashboardTemplateService.list(kind, module);
    setItems([...rows].sort((a, b) => a.order_index - b.order_index));
    if (kind === 'bu_default') setVersion(await dashboardTemplateService.version());
  } catch (err) {
    toast.error(t('pages.dashboardTemplates.loadFailed', { detail: getErrorDetail(err, t) }));
  } finally {
    setLoading(false);
  }
}, [kind, module, t]);
useEffect(() => { void load(); }, [load]);

const handleMove = async (index: number, dir: -1 | 1) => {
  const payload = moveItem(items, index, dir);
  if (payload.length === 0) return;
  setBusy(true);
  try {
    await dashboardTemplateService.reorder(kind, module, payload);
    await load();
  } catch (err) {
    toast.error(t('pages.dashboardTemplates.reorderFailed', { detail: getErrorDetail(err, t) }));
  } finally {
    setBusy(false);
  }
};
```

UI:
- แถบบน: `<Select>` module (bu_default มี `main` ตัวแรก; label จาก `MODULE_LABEL_KEY`) · bu_default แสดง `<Badge variant="outline">{t('pages.dashboardTemplates.versionBadge', { version })}</Badge>` · ปุ่ม `addWidget` (`Plus` icon `mr-2 h-4 w-4`) ใน `<Can permission="dashboard_template.create" clusterId={PLATFORM_SCOPED_RECORD}>`
- ตาราง `<table>` ธรรมดา (หน้า config ของ repo ไม่ใช้ DataTable): title (fallback `byId.get(id)?.name ?? dataset_id`) · dataset id (ไม่อยู่ใน `byId` และ datasets โหลดแล้ว → `<Badge variant="destructive">{t('pages.dashboardTemplates.datasetMissing')}</Badge>`) · widget type · status (`is_active` → `success`/`secondary` + `common.status.active|inactive`) · actions
- actions ใน `<Can permission="dashboard_template.update" clusterId={PLATFORM_SCOPED_RECORD}>`: `ArrowUp` (`disabled={busy || i === 0}`, `aria-label={moveUp}`), `ArrowDown` (`disabled={busy || i === items.length - 1}`), แก้ไข (`Pencil` → `setEditing(row)`) · ใน `<Can permission="dashboard_template.delete" …>`: ลบ (`Trash2` → `setDeleteId(row.id)`)
- ลบ: `<ConfirmDialog open={deleteId !== null} … confirmVariant="destructive" onConfirm={handleConfirmDelete}>` แบบ `ReportTemplateManagement.tsx:207-224, 572-580` (toast `toast.deleted` + `entity.dashboardTemplate.title`) แล้ว `load()`
- loading: skeleton เมื่อ `loading && items.length === 0` · ว่าง → `ListEmptyState` ข้อความ `empty`
- ถ้าไฟล์เกิน ~250 บรรทัดให้แยก `TemplateRow.tsx`

- [ ] **Step 3: ตรวจ + Commit**

Run: `bun run typecheck && bun run lint && bun run test`

```bash
git add src/pages/dashboardTemplates
git commit -m "feat(dashboard-templates): แสดงรายการ widget ต่อหน้า พร้อมเรียงลำดับและลบ"
```

---

### Task 3: `TemplateEditDialog` — เพิ่ม/แก้ widget

**Files:**
- Create: `src/pages/dashboardTemplates/TemplateEditDialog.tsx`
- Create: `src/pages/dashboardTemplates/DatasetParamFields.tsx`
- Modify: `src/pages/dashboardTemplates/TemplateListPanel.tsx` (render dialog เมื่อ `editing !== null`)

**Interfaces:**
- Consumes: `useDashboardDatasets` (Task 2), `BusinessUnitMultiSelect` (`src/components/BusinessUnitMultiSelect.tsx` — `{ value: string[]; onChange: (ids: string[]) => void; disabled?; keyBy?: 'id' | 'code' }`)
- Produces: `TemplateEditDialog({ open, onOpenChange, kind, module, template, datasets, byId, nextOrderIndex, onSaved })` · `DatasetParamFields({ params, value, onChange, disabled })`

- [ ] **Step 1: shell + state**

`Dialog/DialogContent/DialogHeader/DialogTitle/DialogFooter` จาก `components/ui/dialog` · form เป็น `useState`
state: `datasetId`, `widgetType`, `title`, `params: Record<string, string | number>`, `isActive`, `allowBu: string[]`, `denyBu: string[]`, `saving`, `error`
ค่าเริ่ม: จาก `template` (ถ้ามี) ไม่งั้นว่าง และ `isActive = true` — reset ทุกครั้งที่ `open` เปลี่ยนเป็น true

- [ ] **Step 2: dataset + widget type + params**

```tsx
const dataset = datasetId ? byId.get(datasetId) : undefined;
const renders = dataset?.supported_renders ?? [];

const handleDatasetChange = (id: string) => {
  const ds = byId.get(id);
  const supported = ds?.supported_renders ?? [];
  setDatasetId(id);
  setWidgetType((cur) => (supported.includes(cur) ? cur : supported[0] ?? ''));
  setParams(Object.fromEntries((ds?.params ?? []).filter((p) => p.default !== undefined).map((p) => [p.name, p.default as string | number])));
};
```

- dataset: `<Select>` จาก `datasets` เรียง `category` แล้ว `name` แสดง `name · shape` — ถ้า repo มี combobox ค้นหาได้ใน `src/components/` ให้ใช้ตัวนั้นแทน (ค้นก่อน ไม่สร้างใหม่)
- widget type: `<Select>` จาก `renders`, disabled จนกว่าจะเลือก dataset
- `DatasetParamFields`: `options?.length` → `<Select>` · `type === 'number'` → `<Input type="number">` (เก็บเป็น number) · อื่น ๆ → `<Input>`; label `p.label` + `*` เมื่อ `required`
- `kind === 'system'`: `BusinessUnitMultiSelect keyBy="code"` สองช่อง (`fieldAllowBu` + hint, `fieldDenyBu`)
- `isActive`: Switch/checkbox แบบที่ฟอร์มอื่นของ repo ใช้

- [ ] **Step 3: save**

```tsx
const handleSave = async () => {
  if (!datasetId || !widgetType) return;
  setSaving(true);
  setError(null);
  const common = {
    dataset_id: datasetId,
    widget_type: widgetType,
    title: title.trim() || null,
    params: Object.keys(params).length ? params : null,
    is_active: isActive,
    ...(kind === 'system'
      ? { allow_business_unit: allowBu.length ? allowBu : null, deny_business_unit: denyBu.length ? denyBu : null }
      : {}),
  };
  try {
    if (template) {
      await dashboardTemplateService.update(template.id, {
        ...common,
        ...(template.doc_version != null ? { doc_version: template.doc_version } : {}),
      });
      toast.success(t('toast.saved'));
    } else {
      await dashboardTemplateService.create({ ...common, kind, module: toWireModule(module), order_index: nextOrderIndex });
      toast.success(t('toast.created', { entity: t('entity.dashboardTemplate.title') }));
    }
    onSaved();
    onOpenChange(false);
  } catch (err) {
    if (isVersionConflict(err)) {
      notifyVersionConflict(t);
      onSaved();
      onOpenChange(false);
      return;
    }
    setError(t('pages.dashboardTemplates.saveFailed', { detail: getErrorDetail(err, t) }));
  } finally {
    setSaving(false);
  }
};
```

`nextOrderIndex` = `Math.max(0, ...items.map((i) => i.order_index)) + 10` ส่งมาจาก panel · ปุ่ม save: `Loader2` + disabled ตอน `saving` หรือยังไม่เลือก dataset/type · แสดง `error` ในกล่องแจ้งเตือนของ dialog (422 จาก backend มาทางนี้)

- [ ] **Step 4: ตรวจ + Commit**

Run: `bun run typecheck && bun run lint && bun run test`

```bash
git add src/pages/dashboardTemplates
git commit -m "feat(dashboard-templates): เพิ่ม dialog เพิ่ม/แก้ widget เลือก dataset ชนิดกราฟ พารามิเตอร์ และ BU ที่เห็น"
```

---

### Task 4: `DeployPanel` — สถานะต่อ BU + deploy

**Files:**
- Modify: `src/pages/dashboardTemplates/DeployPanel.tsx`
- Create: `src/pages/dashboardTemplates/OverwriteConfirmDialog.tsx`
- Create: `src/pages/dashboardTemplates/deployRowState.ts`

**Interfaces:**
- Consumes: `dashboardTemplateService.{version, deployStatus, deploy}`, `fetchAllBusinessUnits` (`src/utils/fetchAllBusinessUnits.ts`), `mapWithConcurrency(items, limit, fn, onSettled?)` (`src/utils/concurrent.ts` — ไม่ reject, ไม่มี abort)
- Produces: `DeployPanel()`

- [ ] **Step 1: row state**

```ts
import type { DashboardDeployStatus, DashboardDeployStatusValue } from '../../types';

export interface DeployRowState {
  status?: DashboardDeployStatus;
  checking: boolean;
  deploying: boolean;
  outcome?: { kind: 'deployed'; count: number } | { kind: 'skipped' } | { kind: 'error'; message: string };
}

export type DeployRowStatus = DashboardDeployStatusValue | 'unknown' | 'error';

export const deployRowStatusOf = (s: DeployRowState | undefined): DeployRowStatus =>
  s?.outcome?.kind === 'error' ? 'error' : s?.status?.status ?? 'unknown';

export const DEPLOY_BADGE: Record<DeployRowStatus, 'success' | 'warning' | 'secondary' | 'destructive' | 'outline'> = {
  current: 'success',
  outdated: 'warning',
  customized: 'secondary',
  never: 'outline',
  unknown: 'outline',
  error: 'destructive',
};
```

- [ ] **Step 2: โหลด BU + สถานะ + unmount safety**

```tsx
const [bus, setBus] = useState<BusinessUnit[]>([]);
const [version, setVersion] = useState(0);
const [rowState, setRowState] = useState<Record<string, DeployRowState>>({});
const cancelledRef = useRef(false);
const stopRef = useRef(false);
const controllersRef = useRef<Map<string, AbortController>>(new Map());

useEffect(() => {
  cancelledRef.current = false;
  const controllers = controllersRef.current;
  return () => {
    cancelledRef.current = true;
    controllers.forEach((c) => c.abort());
    controllers.clear();
  };
}, []);

const patchRow = useCallback((code: string, partial: Partial<DeployRowState>) => {
  if (cancelledRef.current) return;
  setRowState((prev) => ({ ...prev, [code]: { checking: false, deploying: false, ...prev[code], ...partial } }));
}, []);

const checkRow = useCallback(async (bu: BusinessUnit) => {
  patchRow(bu.code, { checking: true });
  try {
    const status = await dashboardTemplateService.deployStatus(bu.code);
    patchRow(bu.code, { status, checking: false });
  } catch (err) {
    patchRow(bu.code, { checking: false, outcome: { kind: 'error', message: getErrorDetail(err, t) } });
  }
}, [patchRow, t]);

const refreshAll = useCallback(async (list: BusinessUnit[]) => {
  setVersion(await dashboardTemplateService.version());
  await mapWithConcurrency(list, 4, (bu) => checkRow(bu));
}, [checkRow]);
```

mount: `fetchAllBusinessUnits({ sort: 'code:asc', label: 'DashboardDeploy.bus' })` → `setBus` → `refreshAll(list)` (catch → toast `loadFailed`)

- [ ] **Step 3: เลือก + deploy**

- `const [selected, setSelected] = useState<Set<string>>(new Set())` (key = `bu.code`) — คอลัมน์ checkbox ทำเอง + checkbox หัวตาราง "เลือกทั้งหมด" (DataTable ไม่มี controlled selection)
- `selectOutdated`: `setSelected(new Set(bus.filter((b) => ['outdated', 'never'].includes(deployRowStatusOf(rowState[b.code]))).map((b) => b.code)))`
- mode: radio `skip_customized` (ค่าเริ่ม) / `overwrite`
- ปุ่ม deploy (`deployButton` ใส่ `count: selected.size`; disabled เมื่อ `selected.size === 0 || running`) → ถ้า `overwrite` และ BU ที่เลือกมีสถานะ `customized` ≥ 1 → เปิด `OverwriteConfirmDialog` ไม่งั้น `runDeploy()`

```tsx
const runDeploy = async () => {
  const targets = bus.filter((b) => selected.has(b.code));
  stopRef.current = false;
  setRunning(true);
  let ok = 0;
  let skipped = 0;
  let failed = 0;
  let conflict = false;
  await mapWithConcurrency(targets, 3, async (bu) => {
    if (stopRef.current || cancelledRef.current) return;
    const controller = new AbortController();
    controllersRef.current.set(bu.code, controller);
    patchRow(bu.code, { deploying: true, outcome: undefined });
    try {
      const res = await dashboardTemplateService.deploy(bu.code, mode, version, controller.signal);
      if (res.result === 'deployed') ok++;
      else skipped++;
      patchRow(bu.code, {
        outcome: res.result === 'deployed' ? { kind: 'deployed', count: res.count ?? 0 } : { kind: 'skipped' },
      });
      void checkRow(bu);
    } catch (err) {
      if (axios.isCancel(err)) return;
      if ((err as { response?: { status?: number } })?.response?.status === 409) {
        conflict = true;
        stopRef.current = true;
      }
      failed++;
      patchRow(bu.code, { outcome: { kind: 'error', message: getErrorDetail(err, t) } });
    } finally {
      controllersRef.current.delete(bu.code);
      patchRow(bu.code, { deploying: false });
    }
  });
  if (cancelledRef.current) return;
  setRunning(false);
  if (conflict) toast.error(t('pages.dashboardTemplates.deployConflict'));
  else if (failed > 0) toast.warning(t('pages.dashboardTemplates.deployPartial', { ok, skipped, failed }));
  else toast.success(t('pages.dashboardTemplates.deployDone', { ok, skipped }));
};

const handleStop = () => {
  stopRef.current = true;
  controllersRef.current.forEach((c) => c.abort());
};
```

`version` ที่ส่งไปคือค่าที่โหลดตอน refresh — ถ้ามีใครแก้ default ระหว่างนั้น backend ตอบ 409 และรอบจะหยุด (Review Focus ข้อ 2)

- [ ] **Step 4: OverwriteConfirmDialog**

ยกรูปแบบจาก `NewsManagement.tsx:502-503, 727-775`: marker `@@CODE@@` แยกข้อความ `typeToConfirm` · `<Input>` แปลงเป็นตัวใหญ่ (`autoComplete="off"`, `spellCheck={false}`) · ปุ่ม destructive `disabled={input !== 'OVERWRITE'}` · คีย์ `overwriteTitle`, `overwriteDescription` (`count` = จำนวน BU ที่เลือกและสถานะ `customized`)
props: `{ open, onOpenChange, customizedCount, onConfirm }` · reset input ทุกครั้งที่เปิด

- [ ] **Step 5: ตาราง + ส่วนหัว**

- ส่วนหัว: `deployHint` (ใส่ `version`) · ปุ่ม `refreshStatus` (`RefreshCw`, disabled ตอน `running`) · `selectOutdated` · radio mode · ปุ่ม deploy / ปุ่ม `stop` ตอน `running`
- คอลัมน์: checkbox · BU (`code` — `name`) · status (`<Badge variant={DEPLOY_BADGE[s]}>{t(`pages.dashboardTemplates.status.${s}`)}</Badge>` + spinner ตอน `checking/deploying` + บรรทัด `role="status"` แสดง `rowDeployed`/`rowSkipped` หรือ `role="alert"` แสดง error) · deployed version · deployed at · customized at (format ด้วย helper วันที่ที่คอลัมน์ audit ของ repo ใช้)
- กันซ้ำในตัว panel: ถ้า `!hasPermission('dashboard_template.deploy', { clusterId: PLATFORM_SCOPED_RECORD })` คืน `null`
- คีย์ i18n แบบ dynamic `status.${s}` อาจไม่ผ่าน type ของ `t` — ใช้ map `STATUS_LABEL_KEY: Record<DeployRowStatus, TKey>` แทน

- [ ] **Step 6: ตรวจ + Commit**

Run: `bun run typecheck && bun run lint && bun run test`

```bash
git add src/pages/dashboardTemplates
git commit -m "feat(dashboard-templates): เพิ่มแท็บ Deploy แสดงสถานะต่อ BU และ deploy ชุด default ทีละหลาย BU"
```

---

### Task 5: ตรวจมือ + PR

- [ ] **Step 1: ตรวจในเบราว์เซอร์** (Plan 1 + Plan 2 รันในเครื่อง, `bun dev`, บัญชี platform admin)
  1. System widgets → `procurement` เห็น 8 ตัว เรียงตรงกับหน้า procurement dashboard ของ FE
  2. กด ↓ ตัวแรก → ลำดับสลับ รีเฟรชแล้วคงอยู่ · ↑ ตัวแรก / ↓ ตัวสุดท้าย disabled
  3. เพิ่ม widget → เลือก dataset แล้วเปลี่ยนเป็น dataset คนละ shape → widget type รีเซ็ตเป็นตัวที่รองรับ
  4. ตั้ง deny = BU ทดสอบ → หน้า module ของ BU นั้นใน FE ไม่เห็น widget ภายใน 60 วินาที
  5. BU default → `main` เพิ่ม 2 widget → version badge ขยับ
  6. Deploy → BU ที่ไม่เคย deploy ขึ้น `Never deployed` · "เลือกที่ล้าสมัย" → deploy โหมด skip → แถวขึ้น `Deployed 2 widget(s)` แล้วสถานะเป็น `Up to date`
  7. overwrite กับ BU ที่ customized → ต้องพิมพ์ `OVERWRITE` ก่อนกดได้
  8. แก้ BU default ในอีกแท็บระหว่าง deploy หลาย BU → toast `deployConflict` และ BU ที่เหลือไม่ถูกยิง
  9. บัญชีที่มีแค่ `dashboard_template.read` → ไม่เห็นแท็บ Deploy และปุ่มเขียน
- [ ] **Step 2: PR** (ภาษาอังกฤษ, ห้าม squash) — ระบุว่าต้อง deploy หลัง backend-v2 + micro-data และหลัง seed/assign `dashboard_template.*`; push `main` = deploy DEV อัตโนมัติ
