# Widget title หลายภาษา Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้ title ของ dashboard widget ทั้ง 3 ระดับ (template ของ platform / BU / ส่วนตัว) ตั้งได้ทีละภาษา (EN บังคับ, TH ไม่บังคับ) และชื่อตั้งต้นแปลตาม locale ของ UI โดย EN เป็น default

**Architecture:** expand/contract — เพิ่มคอลัมน์ `title_i18n jsonb {en, th?}` ข้าง `title` เดิม (dual-write `title = title_i18n.en`) API ส่ง `title` string เหมือนเดิมพร้อม `title_i18n` ใหม่ client เก่าที่ส่งแค่ `title` จะถูก merge ไม่ลบ `th` ฝั่ง FE มี helper กลางตัวเดียวเลือก title ตาม locale แล้ว fallback ไปชื่อ dataset ที่แปลใน `messages`

**Tech Stack:** Go + GORM (micro-data) · NestJS + Prisma + zod v4 (backend-v2 gateway / micro-cluster) · React + Vite (carmen-platform) · React 19 + use-intl 4 + TanStack Query (รีโปนี้)

**Spec:** `docs/superpowers/specs/2026-10-08-widget-title-i18n-design.md`

## Global Constraints

- รูปข้อมูล: `{ "en": string, "th"?: string }` — key ได้แค่ `en`/`th` · trim · ≤ 255 ตัวอักษร (นับ rune) · สตริงว่าง = ไม่มี key · ไม่เหลือ key = `null` · มี `th` แต่ไม่มี `en` = error 400
- คอลัมน์ `title` เดิม**ห้ามลบ/แก้ type** ทุกการเขียน dual-write `title = title_i18n.en` (หรือ `NULL`)
- response ต้องมีทั้ง `title` (string|null) และ `title_i18n` (object|null)
- request ที่มีแค่ `title` (client เก่า) → `{...existing, en: title}`; `title` ว่าง/null → ล้างทั้งคู่; ส่งทั้งคู่ → ใช้ `title_i18n`
- **ไม่เขียนเทสต์ใหม่** (ค่าตั้งของผู้ใช้) — แต่ต้องรัน typecheck + lint และเทสต์เดิมต้องผ่าน: FE `bun test:run` · backend `jest` (ห้าม `bun test`) · micro-data `go test ./...` · platform `npm test`
- commit message เป็นภาษาไทย · branch `feature/widget-title-i18n` ในทุกรีโป · **อย่า commit `package.json` ที่ค้าง version bump ในรีโปนี้** (ไม่ใช่ของงานนี้)
- ห้ามใส่ `{{` `}}` ในไฟล์แปล (ICU พังทั้งหน้า) · คีย์แปลต้องมีครบทั้ง en/th (`lib/__tests__/i18n-key-parity.test.ts`)
- ลำดับ deploy: migration → micro-data + backend-v2 → seed → carmen-platform + FE (plan นี้ไม่ deploy เอง)

## Review Focus

ผู้ใช้ตั้งค่าให้ไม่เขียนเทสต์ ข้อเหล่านี้จึงตรวจด้วยมือใน Task 10 (เส้นทางที่เทสต์ไม่ครอบและน่าจะพังที่สุด):

1. **client เก่าบันทึก title** (PATCH มีแค่ `title`) บน widget ที่มี `th` แล้ว — ต้องได้ `th` เดิมกลับมา ไม่หาย
2. **widget เก่าที่ title ถูกแช่เป็นชื่อ dataset ภาษาอังกฤษ** (หลัง backfill = `{en: "<ชื่อ dataset>"}`) — ใน UI ภาษาไทยต้องแสดงชื่อ dataset ที่แปลแล้ว ไม่ใช่ภาษาอังกฤษ
3. **deploy template สองภาษาลง BU** — แถวใน `tb_dashboard_bu_widget` ต้องได้ `title_i18n` ครบทั้ง en/th
4. **ส่ง `{th}` อย่างเดียว / locale แปลก (`{"jp": "x"}`) / title ยาว 256 ตัวอักษรไทย** — ต้อง 400 ไม่ใช่ 500 หรือเขียนลง DB
5. **seed รันซ้ำ** — รอบที่สองต้องไม่ retitle ซ้ำ และแถวที่ operator แก้ title แล้วต้องไม่ถูกแตะ

---

## Part A — micro-data (`../micro-data`)

### Task 1: micro-data — คอลัมน์ `title_i18n` + validate/merge + เขียนลง DB

**Files:**
- Create: `migrations/tenant/132_dash_widget_title_i18n.up.sql`
- Create: `migrations/tenant/132_dash_widget_title_i18n.down.sql`
- Create: `service/widget_title.go`
- Modify: `model/dashboard.go` (struct `DashboardBuWidget`, `DashboardPersonalWidget`, `WidgetCreateInput`, `WidgetUpdateInput`)
- Modify: `service/widget_service.go` (`validateCreate` บรรทัด ~52, `validateUpdate` ~121, `BuCreate` ~220, `BuUpdate` ~256, `PersonalCreate` ~368, `PersonalUpdate` ~409)
- Modify: `service/bu_widget_deploy.go` (`validateDeploy` ~77)
- Modify: `db/widget_repo.go` (`insertWidget` ~233)

**Interfaces:**
- Produces (HTTP): ทุก endpoint ของ BU/personal widget + deploy รับ `title_i18n` (object|null) และคืน `title_i18n` ในแถว — gateway (Task 4) ส่งผ่าน body ตรง ๆ
- Produces (Go): `parseTitleI18n(raw json.RawMessage) (map[string]string, bool, error)`, `resolveCreateTitle(in *model.WidgetCreateInput) error`, `titleUpdateFields(existing map[string]string, in model.WidgetUpdateInput) (map[string]any, error)`

- [ ] **Step 1: สร้าง branch**

```bash
cd ../micro-data && git switch main && git pull --ff-only && git switch -c feature/widget-title-i18n
```

- [ ] **Step 2: migration 132 (เจ้าของร่วมกับ backend-v2 Task 2)**

`migrations/tenant/132_dash_widget_title_i18n.up.sql`:

```sql
-- 132_dash_widget_title_i18n.up.sql
-- title หลายภาษา {en, th?} — ขั้น expand: คอลัมน์ title เดิมยังอยู่และถูก dual-write (= title_i18n.en)
-- เจ้าของร่วมกับ backend-v2 prisma-shared-schema-tenant 20261008100000_dashboard_widget_title_i18n
-- IF NOT EXISTS + WHERE title_i18n IS NULL ทั้งคู่ — รันลำดับไหนก็ได้ รันซ้ำได้
ALTER TABLE tb_dashboard_bu_widget ADD COLUMN IF NOT EXISTS title_i18n jsonb;
ALTER TABLE tb_dashboard_personal_widget ADD COLUMN IF NOT EXISTS title_i18n jsonb;

UPDATE tb_dashboard_bu_widget
   SET title_i18n = jsonb_build_object('en', btrim(title))
 WHERE title_i18n IS NULL AND title IS NOT NULL AND btrim(title) <> '';

UPDATE tb_dashboard_personal_widget
   SET title_i18n = jsonb_build_object('en', btrim(title))
 WHERE title_i18n IS NULL AND title IS NOT NULL AND btrim(title) <> '';
```

`migrations/tenant/132_dash_widget_title_i18n.down.sql`:

```sql
-- 132_dash_widget_title_i18n.down.sql
ALTER TABLE tb_dashboard_bu_widget DROP COLUMN IF EXISTS title_i18n;
ALTER TABLE tb_dashboard_personal_widget DROP COLUMN IF EXISTS title_i18n;
```

- [ ] **Step 3: model**

ใน `model/dashboard.go` เพิ่มบรรทัดนี้ต่อจาก `Title` ของทั้ง `DashboardBuWidget` และ `DashboardPersonalWidget`:

```go
	// TitleI18n ชื่อหลายภาษา {en, th?}; nil = ใช้ชื่อตั้งต้นของ dataset (migration 132)
	TitleI18n map[string]string `gorm:"column:title_i18n;serializer:json;type:jsonb" json:"title_i18n"`
```

ใน `WidgetCreateInput` เพิ่มต่อจาก `Title`:

```go
	// TitleI18n ชื่อหลายภาษา — RawMessage เพื่อแยก "ไม่ส่ง" (len 0) ออกจาก null ("null")
	TitleI18n json.RawMessage `json:"title_i18n,omitempty"`
	// ResolvedTitleI18n ค่าที่ validateCreate normalize แล้ว — insertWidget เขียนค่านี้ ไม่ได้มาจาก body
	ResolvedTitleI18n map[string]string `json:"-"`
```

ใน `WidgetUpdateInput` เพิ่มต่อจาก `Title`:

```go
	// TitleI18n แทนที่ทั้งก้อน; null = ล้าง; ไม่ส่ง + ส่ง Title = merge en ลงค่าเดิม (client เก่า)
	TitleI18n json.RawMessage `json:"title_i18n,omitempty"`
```

ถ้าไฟล์ยังไม่ import `"encoding/json"` ให้เพิ่ม

- [ ] **Step 4: `service/widget_title.go`**

```go
package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
	"unicode/utf8"

	"gorm.io/gorm"

	"github.com/CarmenSoftware/micro-data/model"
)

// maxTitleRunes ตรงกับ VARCHAR(255) ของคอลัมน์ title เดิม — Postgres นับเป็นตัวอักษร ไม่ใช่ byte
const maxTitleRunes = 255

// parseTitleI18n reads a title_i18n body field. provided=false when the field was absent;
// out=nil with provided=true means "clear" (explicit null, {} or only blank values).
func parseTitleI18n(raw json.RawMessage) (out map[string]string, provided bool, err error) {
	if len(raw) == 0 {
		return nil, false, nil
	}
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		return nil, true, nil
	}
	var in map[string]any
	if err := json.Unmarshal(raw, &in); err != nil {
		return nil, true, fmt.Errorf("%w: title_i18n must be an object", ErrInvalidWidget)
	}
	out = map[string]string{}
	for k, v := range in {
		if k != "en" && k != "th" {
			return nil, true, fmt.Errorf("%w: title_i18n has unsupported locale %q", ErrInvalidWidget, k)
		}
		s, ok := v.(string)
		if !ok {
			return nil, true, fmt.Errorf("%w: title_i18n.%s must be a string", ErrInvalidWidget, k)
		}
		s = strings.TrimSpace(s)
		if utf8.RuneCountInString(s) > maxTitleRunes {
			return nil, true, fmt.Errorf("%w: title_i18n.%s is longer than %d characters", ErrInvalidWidget, k, maxTitleRunes)
		}
		if s != "" {
			out[k] = s
		}
	}
	if len(out) == 0 {
		return nil, true, nil
	}
	if out["en"] == "" {
		return nil, true, fmt.Errorf("%w: title_i18n.en is required", ErrInvalidWidget)
	}
	return out, true, nil
}

// legacyTitle trims the plain title an old client sends; "" means clear.
func legacyTitle(title string) (string, error) {
	t := strings.TrimSpace(title)
	if utf8.RuneCountInString(t) > maxTitleRunes {
		return "", fmt.Errorf("%w: title is longer than %d characters", ErrInvalidWidget, maxTitleRunes)
	}
	return t, nil
}

// resolveCreateTitle fills in.Title and in.ResolvedTitleI18n from title_i18n, or from the
// legacy plain title when title_i18n is absent, so both columns always agree.
func resolveCreateTitle(in *model.WidgetCreateInput) error {
	i18n, provided, err := parseTitleI18n(in.TitleI18n)
	if err != nil {
		return err
	}
	if !provided && in.Title != nil {
		t, err := legacyTitle(*in.Title)
		if err != nil {
			return err
		}
		if t != "" {
			i18n = map[string]string{"en": t}
		}
	}
	in.ResolvedTitleI18n = i18n
	if i18n == nil {
		in.Title = nil
		return nil
	}
	en := i18n["en"]
	in.Title = &en
	return nil
}

// titleUpdateFields builds the title/title_i18n columns for a PATCH. existing is the row's
// current title_i18n: a legacy plain title is merged into it so an old client editing EN
// never drops TH. Returns an empty map when the body touches neither field.
func titleUpdateFields(existing map[string]string, in model.WidgetUpdateInput) (map[string]any, error) {
	i18n, provided, err := parseTitleI18n(in.TitleI18n)
	if err != nil {
		return nil, err
	}
	if !provided {
		if in.Title == nil {
			return map[string]any{}, nil
		}
		t, err := legacyTitle(*in.Title)
		if err != nil {
			return nil, err
		}
		if t != "" {
			i18n = map[string]string{}
			for k, v := range existing {
				i18n[k] = v
			}
			i18n["en"] = t
		}
	}
	if i18n == nil {
		return map[string]any{"title": nil, "title_i18n": nil}, nil
	}
	b, err := json.Marshal(i18n)
	if err != nil {
		return nil, ErrInvalidWidget
	}
	return map[string]any{"title": i18n["en"], "title_i18n": gorm.Expr("?::jsonb", string(b))}, nil
}
```

- [ ] **Step 5: `validateCreate` รับ pointer แล้ว resolve title**

ใน `service/widget_service.go` เปลี่ยน signature และบรรทัดท้าย (ที่เหลือคงเดิม แค่เปลี่ยน `in.` ให้ทำงานกับ pointer ซึ่ง syntax เหมือนเดิม):

```go
func validateCreate(in *model.WidgetCreateInput) error {
	id := strings.TrimSpace(in.DatasetID)
	if id == "" || len(id) > 100 {
		return ErrInvalidWidget
	}
	if err := validateRender(id, in.WidgetType); err != nil {
		return err
	}
	if in.OrderIndex != nil && *in.OrderIndex < 0 {
		return ErrInvalidWidget
	}
	if err := validateDisplay(in.Display); err != nil {
		return err
	}
	return resolveCreateTitle(in)
}
```

แก้ผู้เรียก: `BuCreate` และ `PersonalCreate` → `if err := validateCreate(&in); err != nil {`

ใน `service/bu_widget_deploy.go` `validateDeploy` เปลี่ยน loop ให้แก้สมาชิกของ slice ตัวจริง (ไม่งั้น `replaceBuWidgets` ไม่เห็นค่าที่ resolve):

```go
	for i := range widgets {
		w := &widgets[i]
		if w.Module != nil && !model.IsValidDashboardModule(*w.Module) {
			return ErrInvalidModule
		}
		if err := validateCreate(w); err != nil {
			return err
		}
	}
```

- [ ] **Step 6: `validateUpdate` + `BuUpdate` / `PersonalUpdate`**

ใน `validateUpdate`:
1. เงื่อนไข "ต้องมีอย่างน้อยหนึ่งฟิลด์" เพิ่ม `len(in.TitleI18n) == 0`:

```go
	if in.Title == nil && len(in.TitleI18n) == 0 && in.OrderIndex == nil && in.Params == nil &&
		in.WidgetType == nil && in.Display == nil && in.Module == nil {
		return nil, ErrInvalidWidget
	}
```

2. ลบบล็อกนี้ออก (title ย้ายไป `titleUpdateFields` ซึ่งต้องรู้ค่าเดิมของแถว):

```go
	if in.Title != nil {
		fields["title"] = *in.Title
	}
```

ใน `BuUpdate` ต่อจาก `fields, err := validateUpdate(existing.DatasetID, in)` + เช็ก err และใน `PersonalUpdate` ที่จุดเดียวกัน เพิ่ม:

```go
	titleFields, err := titleUpdateFields(existing.TitleI18n, in)
	if err != nil {
		return nil, err
	}
	for k, v := range titleFields {
		fields[k] = v
	}
```

- [ ] **Step 7: `insertWidget` เขียน `title_i18n`**

ใน `db/widget_repo.go` `insertWidget` ต่อจาก `displayArg`:

```go
	titleI18nArg, err := marshalTitleI18n(in.ResolvedTitleI18n)
	if err != nil {
		return "", err
	}

	cols := "dataset_id, widget_type, title, title_i18n, order_index, params, display, created_by_id, updated_by_id"
	vals := "?, ?::enum_dashboard_widget_type, ?, ?::jsonb, ?, ?::jsonb, ?::jsonb, ?, ?"
	args := []any{in.DatasetID, in.WidgetType, in.Title, titleI18nArg, orderIndex, paramsArg, displayArg, userID, userID}
```

(แทนที่ `cols` / `vals` / `args` สามบรรทัดเดิม) และเพิ่มฟังก์ชันท้ายไฟล์:

```go
// marshalTitleI18n returns the JSON for title_i18n; nil/empty becomes NULL.
func marshalTitleI18n(t map[string]string) (any, error) {
	if len(t) == 0 {
		return nil, nil
	}
	b, err := json.Marshal(t)
	if err != nil {
		return nil, fmt.Errorf("marshal widget title_i18n: %w", err)
	}
	return string(b), nil
}
```

- [ ] **Step 8: ยืนยันว่า controller bind body เข้า model ตรง ๆ**

Run: `grep -n "WidgetCreateInput\|WidgetUpdateInput" controller/*.go`
Expected: controller ใช้ `model.WidgetCreateInput` / `model.WidgetUpdateInput` ตรง ๆ (ไม่มี struct กลางที่ต้องเติมฟิลด์) — ถ้ามี struct กลาง ให้เติม `TitleI18n json.RawMessage` ที่นั่นด้วยแล้ว copy เข้า model

- [ ] **Step 9: static checks + เทสต์เดิม**

Run: `go build ./... && go vet ./... && go test ./...`
Expected: ผ่านทั้งหมด (เทสต์ `widget_render_test.go` ใช้ `validateUpdate` signature เดิม — ต้องยังผ่าน)

- [ ] **Step 10: Commit**

```bash
git add migrations/tenant/132_dash_widget_title_i18n.up.sql migrations/tenant/132_dash_widget_title_i18n.down.sql \
  model/dashboard.go service/widget_title.go service/widget_service.go service/bu_widget_deploy.go db/widget_repo.go
git commit -m "feat(dashboard): widget title หลายภาษา (title_i18n) — migration 132, validate + merge กับ title เดิม"
```

---

## Part B — carmen-turborepo-backend-v2 (`../carmen-turborepo-backend-v2`)

### Task 2: Prisma schema + migration (platform + tenant)

**Files:**
- Modify: `packages/prisma-shared-schema-platform/prisma/schema.prisma` (model `tb_dashboard_widget_template` ~บรรทัด 974)
- Create: `packages/prisma-shared-schema-platform/prisma/migrations/20261008100000_dashboard_widget_template_title_i18n/migration.sql`
- Modify: `packages/prisma-shared-schema-tenant/prisma/schema.prisma` (model `tb_dashboard_bu_widget` ~6931, `tb_dashboard_personal_widget` ~6957)
- Create: `packages/prisma-shared-schema-tenant/prisma/migrations/20261008100000_dashboard_widget_title_i18n/migration.sql`

**Interfaces:**
- Produces: Prisma field `title_i18n Json?` บนทั้ง 3 model (Task 3–5 ใช้)

- [ ] **Step 1: branch**

```bash
cd ../carmen-turborepo-backend-v2 && git switch main && git pull --ff-only && git switch -c feature/widget-title-i18n
```

- [ ] **Step 2: schema**

ทั้ง 3 model เพิ่มบรรทัดนี้ต่อจาก `title ... @db.VarChar(255)` (จัดคอลัมน์ให้ตรงกับบรรทัดรอบข้าง):

```prisma
  /// ชื่อหลายภาษา {en, th?} — title เดิมยังถูก dual-write (= title_i18n.en) ระหว่าง expand/contract
  title_i18n          Json?                      @db.JsonB
```

- [ ] **Step 3: migration platform**

`packages/prisma-shared-schema-platform/prisma/migrations/20261008100000_dashboard_widget_template_title_i18n/migration.sql`:

```sql
-- 20261008100000_dashboard_widget_template_title_i18n
-- title หลายภาษา {en, th?} — ขั้น expand: คอลัมน์ title เดิมยังอยู่และถูก dual-write (= title_i18n.en)
-- backfill {en: title} ก่อน — แถวของ seed ที่ title เป็นภาษาไทยจะถูก seeder แก้ต่อ (db:seed.dashboard-widget-template)
ALTER TABLE "tb_dashboard_widget_template" ADD COLUMN IF NOT EXISTS "title_i18n" JSONB;

UPDATE "tb_dashboard_widget_template"
   SET "title_i18n" = jsonb_build_object('en', btrim("title"))
 WHERE "title_i18n" IS NULL AND "title" IS NOT NULL AND btrim("title") <> '';
```

- [ ] **Step 4: migration tenant (เจ้าของร่วมกับ micro-data 132)**

`packages/prisma-shared-schema-tenant/prisma/migrations/20261008100000_dashboard_widget_title_i18n/migration.sql`:

```sql
-- 20261008100000_dashboard_widget_title_i18n
-- เจ้าของร่วมกับ micro-data migrations/tenant/132_dash_widget_title_i18n.up.sql — IF NOT EXISTS / WHERE ทั้งคู่ รันลำดับไหนก็ได้
ALTER TABLE "tb_dashboard_bu_widget" ADD COLUMN IF NOT EXISTS "title_i18n" JSONB;
ALTER TABLE "tb_dashboard_personal_widget" ADD COLUMN IF NOT EXISTS "title_i18n" JSONB;

UPDATE "tb_dashboard_bu_widget"
   SET "title_i18n" = jsonb_build_object('en', btrim("title"))
 WHERE "title_i18n" IS NULL AND "title" IS NOT NULL AND btrim("title") <> '';

UPDATE "tb_dashboard_personal_widget"
   SET "title_i18n" = jsonb_build_object('en', btrim("title"))
 WHERE "title_i18n" IS NULL AND "title" IS NOT NULL AND btrim("title") <> '';
```

- [ ] **Step 5: generate client**

Run: `(cd packages/prisma-shared-schema-platform && bun run db:generate) && (cd packages/prisma-shared-schema-tenant && bun run db:generate)`
Expected: generate สำเร็จ (โฟลเดอร์ `generated/` ถูก gitignore — ไม่ต้อง commit)

- [ ] **Step 6: Commit**

```bash
git add packages/prisma-shared-schema-platform/prisma/schema.prisma \
  packages/prisma-shared-schema-platform/prisma/migrations/20261008100000_dashboard_widget_template_title_i18n \
  packages/prisma-shared-schema-tenant/prisma/schema.prisma \
  packages/prisma-shared-schema-tenant/prisma/migrations/20261008100000_dashboard_widget_title_i18n
git commit -m "feat(prisma): เพิ่มคอลัมน์ title_i18n ให้ widget template / BU / personal (expand)"
```

### Task 3: micro-cluster — template เขียน/อ่าน `title_i18n`

**Files:**
- Create: `apps/micro-cluster/src/cluster/dashboard-template/dashboard-template-title.ts`
- Modify: `apps/micro-cluster/src/cluster/dashboard-template/dashboard-template.types.ts`
- Modify: `apps/micro-cluster/src/cluster/dashboard-template/dashboard-template.service.ts` (`UPDATABLE_FIELDS` ~14, `create` ~95, `update` ~122)

**Interfaces:**
- Consumes: Prisma field `title_i18n` (Task 2)
- Produces: `LocalizedTitle` type, `normalizeTitleI18n(value: unknown): LocalizedTitle | null`, `resolveTitleWrite(data: DashboardTemplateWrite, currentI18n?: unknown)` · `findAll`/`findOne`/`findActiveSystem`/`getBuDefault` คืน `title_i18n` อัตโนมัติ (findMany คืนทั้งแถว)

- [ ] **Step 1: types**

ใน `dashboard-template.types.ts` เพิ่มเหนือ `DashboardTemplateWrite`:

```ts
/**
 * Per-locale widget title; en is required whenever the object exists
 * ชื่อ widget แยกภาษา — มี object เมื่อไรต้องมี en
 */
export interface LocalizedTitle {
  en: string;
  th?: string;
}
```

และใน `DashboardTemplateWrite` ต่อจาก `title?`:

```ts
  title_i18n?: LocalizedTitle | null;
```

- [ ] **Step 2: `dashboard-template-title.ts`**

```ts
import { Prisma } from '@repo/prisma-shared-schema-platform';
import { DashboardTemplateWrite, LocalizedTitle } from './dashboard-template.types';

const LOCALES = ['en', 'th'] as const;

type TitleColumns = {
  title?: string | null;
  title_i18n?: Prisma.InputJsonObject | typeof Prisma.DbNull;
};

/**
 * Trims a title_i18n value and drops blank locales; null when no en remains
 * ตัดช่องว่างและภาษาที่ว่างออก — ไม่เหลือ en คืน null
 * @param value - Raw title_i18n (request body or stored row) / ค่าดิบจาก body หรือแถวใน DB
 * @returns Normalized title or null / ค่าที่ normalize แล้ว หรือ null
 */
export function normalizeTitleI18n(value: unknown): LocalizedTitle | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const src = value as Record<string, unknown>;
  const out: Partial<LocalizedTitle> = {};
  for (const locale of LOCALES) {
    const text = src[locale];
    if (typeof text === 'string' && text.trim()) out[locale] = text.trim();
  }
  return out.en ? (out as LocalizedTitle) : null;
}

/**
 * Title columns to write: title_i18n wins; a legacy plain title merges into the stored one so TH survives
 * คอลัมน์ title ที่ต้องเขียน — title_i18n มาก่อน; title เดี่ยวของ client เก่า merge ลงค่าเดิมเพื่อไม่ให้ TH หาย
 * @param data - Request payload / payload ของคำขอ
 * @param currentI18n - Stored title_i18n (update only) / ค่า title_i18n เดิม (เฉพาะ update)
 * @returns Columns to spread into the Prisma data / คอลัมน์สำหรับ spread ลง data ของ Prisma
 */
export function resolveTitleWrite(data: DashboardTemplateWrite, currentI18n?: unknown): TitleColumns {
  if (data.title_i18n !== undefined) {
    const next = normalizeTitleI18n(data.title_i18n);
    return {
      title: next?.en ?? null,
      title_i18n: next ? ({ ...next } as Prisma.InputJsonObject) : Prisma.DbNull,
    };
  }
  if (data.title !== undefined) {
    const en = data.title?.trim();
    if (!en) return { title: null, title_i18n: Prisma.DbNull };
    const next: LocalizedTitle = { ...(normalizeTitleI18n(currentI18n) ?? {}), en };
    return { title: en, title_i18n: { ...next } as Prisma.InputJsonObject };
  }
  return {};
}
```

- [ ] **Step 3: service**

ใน `dashboard-template.service.ts`:
1. import: `import { resolveTitleWrite } from './dashboard-template-title';`
2. ลบ `'title',` ออกจาก `UPDATABLE_FIELDS` (title เขียนผ่าน `resolveTitleWrite` เท่านั้น เพื่อให้สองคอลัมน์ตรงกันเสมอ)
3. `create` — data:

```ts
        data: {
          ...pickWritable(data, true),
          ...resolveTitleWrite(data),
          created_by_id: user_id,
          updated_by_id: user_id,
        } as never,
```

4. `update` — data:

```ts
        data: {
          ...pickWritable(data, false),
          ...resolveTitleWrite(data, current.title_i18n),
          updated_by_id: user_id,
          updated_at: new Date(),
          doc_version: { increment: 1 },
        } as never,
```

- [ ] **Step 4: static checks**

Run: `cd apps/micro-cluster && bunx tsc --noEmit -p tsconfig.json && bunx eslint src/cluster/dashboard-template`
Expected: ไม่มี error

- [ ] **Step 5: Commit**

```bash
git add apps/micro-cluster/src/cluster/dashboard-template
git commit -m "feat(micro-cluster): template เขียน title_i18n + merge title เดิมไม่ให้ TH หาย"
```

### Task 4: gateway — DTO, deploy, system widgets, swagger

**Files:**
- Create: `apps/backend-gateway/src/common/dto/dashboard-template/title-i18n.schema.ts`
- Modify: `apps/backend-gateway/src/common/dto/dashboard-template/dashboard-template.dto.ts` (`TemplateFields`)
- Modify: `apps/backend-gateway/src/platform/platform_dashboard-templates/dashboard-template-deploy.service.ts` (`TemplateRow` ~9, map ~65)
- Modify: `apps/backend-gateway/src/application/dashboard-widgets/system-widget-config.type.ts`
- Modify: `apps/backend-gateway/src/application/dashboard-widgets/system-widget-cache.service.ts` (`SystemTemplateRow` ~14, `forBu` ~50)
- Modify: `apps/backend-gateway/src/application/dashboard-widgets/system-widgets.controller.ts` (composite `/me` ~375–395)
- Modify: `apps/backend-gateway/src/application/dashboard-widgets/swagger/response.ts`
- Modify: `apps/backend-gateway/src/platform/platform_dashboard-templates/swagger/response.ts`

**Interfaces:**
- Consumes: micro-cluster คืน `title_i18n` ในแถว (Task 3) · micro-data รับ `title_i18n` ใน deploy (Task 1)
- Produces: `TitleI18nSchema` (zod), `LocalizedTitle` type, `LocalizedTitleDto` (swagger) · response ของ `/dashboard-widgets/*/config`, composite `/me`, system widgets มี `title_i18n`

- [ ] **Step 1: zod schema**

`apps/backend-gateway/src/common/dto/dashboard-template/title-i18n.schema.ts`:

```ts
import { z } from 'zod/v4';

/**
 * Per-locale widget title; en is required whenever the object exists
 * ชื่อ widget แยกภาษา — มี object เมื่อไรต้องมี en
 */
export interface LocalizedTitle {
  en: string;
  th?: string;
}

// trim / ตัดค่าว่างทำที่ micro-cluster (normalizeTitleI18n) — ตรงนี้ปฏิเสธรูปที่ผิดเท่านั้น
// ไม่ใช้ .transform() เพราะ nestjs-zod แปลง schema ที่มี transform เป็น swagger ไม่ได้
export const TitleI18nSchema = z
  .object({
    en: z.string().max(255).optional(),
    th: z.string().max(255).optional(),
  })
  .strict()
  .refine((v) => !v.th?.trim() || !!v.en?.trim(), {
    message: 'title_i18n.en is required when th is set',
    path: ['en'],
  })
  .nullable()
  .optional()
  .meta({
    example: { en: 'Pending PR approvals', th: 'PR รออนุมัติ' },
    description:
      'Per-locale title (en required, th optional). Wins over `title`; null clears it so the widget falls back to the dataset name',
  });
```

- [ ] **Step 2: ใส่ใน `TemplateFields`**

ใน `dashboard-template.dto.ts` import `import { TitleI18nSchema } from './title-i18n.schema';` แล้วเพิ่มต่อจาก `title:`:

```ts
  title_i18n: TitleI18nSchema,
```

(`DashboardTemplateUpdateSchema` spread `TemplateFields` อยู่แล้ว ได้ไปด้วย)

- [ ] **Step 3: deploy ส่ง `title_i18n` ต่อให้ micro-data**

ใน `dashboard-template-deploy.service.ts`:

```ts
import { LocalizedTitle } from 'src/common/dto/dashboard-template/title-i18n.schema';
```

`TemplateRow` เพิ่ม `title_i18n: LocalizedTitle | null;` ต่อจาก `title` และใน map:

```ts
        ({ module, dataset_id, widget_type, title, title_i18n, order_index, params, display }) => ({
          module,
          dataset_id,
          widget_type,
          title,
          title_i18n,
          order_index,
          params,
          display,
```

- [ ] **Step 4: system widgets**

`system-widget-config.type.ts` — import `LocalizedTitle` (path เดียวกับ Step 3) และเพิ่มใน `SystemWidgetConfig` ต่อจาก `title`:

```ts
  title_i18n: LocalizedTitle | null;
```

`system-widget-cache.service.ts` — `SystemTemplateRow` เพิ่ม `title_i18n: LocalizedTitle | null;` และ `forBu`:

```ts
    return rows.map(({ module: m, dataset_id, widget_type, title, title_i18n, order_index }) => ({
      module: m as SystemWidgetModule,
      dataset_id,
      widget_type,
      title: title ?? '',
      title_i18n: title_i18n ?? null,
      order_index,
    }));
```

`system-widgets.controller.ts` (composite `/me` รอบบรรทัด 375–395) — type ของ items เพิ่ม `title_i18n?: LocalizedTitle | null;` และ object ที่คืนเพิ่ม `title_i18n: w.title_i18n ?? null,` ต่อจาก `title: w.title,` (import `LocalizedTitle`)

- [ ] **Step 5: swagger**

ใน `application/dashboard-widgets/swagger/response.ts` เพิ่ม class ก่อน `WidgetItemResponseDto`:

```ts
/**
 * Per-locale widget title
 * ชื่อ widget แยกภาษา
 */
export class LocalizedTitleDto {
  @ApiProperty({ example: 'Pending PR approvals', maxLength: 255 })
  en: string;

  @ApiPropertyOptional({ example: 'PR รออนุมัติ', maxLength: 255 })
  th?: string;
}
```

แล้วเพิ่ม property นี้ต่อจาก `title` ใน `WidgetItemResponseDto`, `WidgetCreateRequestDto`, `WidgetUpdateRequestDto`, `SystemWidgetItemDto`, `SystemWidgetConfigItemDto`:

```ts
  @ApiPropertyOptional({
    type: () => LocalizedTitleDto,
    nullable: true,
    description:
      'Per-locale title. On write it wins over `title`; null clears it. Sending only `title` (old clients) merges into en and keeps th',
  })
  title_i18n?: LocalizedTitleDto | null;
```

ใน `platform/platform_dashboard-templates/swagger/response.ts` import `LocalizedTitleDto` จาก `src/application/dashboard-widgets/swagger/response` แล้วเพิ่มใน `DashboardTemplateResponseDto` ต่อจาก `title`:

```ts
  @ApiPropertyOptional({ type: () => LocalizedTitleDto, nullable: true })
  title_i18n: LocalizedTitleDto | null;
```

แก้คำอธิบายเมธอด `update` ของ BU/personal controller จาก "(title or order_index)" เป็น "(title, title_i18n, order_index, params, display, widget_type)" เพื่อไม่ให้ comment โกหก

- [ ] **Step 6: static checks + เทสต์เดิม**

Run: `cd apps/backend-gateway && bunx tsc --noEmit -p tsconfig.json && bunx eslint src/application/dashboard-widgets src/platform/platform_dashboard-templates src/common/dto/dashboard-template && bunx jest src/application/dashboard-widgets`
Expected: ไม่มี error · spec เดิมผ่าน (ถ้า spec ของ system-widgets เทียบ object เป๊ะแล้วแดงเพราะมี `title_i18n` เพิ่ม ให้เติม `title_i18n: null` ใน expected — นั่นคือการอัปเดตเทสต์เดิมตามสัญญาใหม่ ไม่ใช่เขียนเทสต์ใหม่)

- [ ] **Step 7: Commit**

```bash
git add apps/backend-gateway/src/common/dto/dashboard-template apps/backend-gateway/src/platform/platform_dashboard-templates \
  apps/backend-gateway/src/application/dashboard-widgets
git commit -m "feat(gateway): ส่ง title_i18n ผ่าน template / deploy / system widgets + swagger"
```

### Task 5: seed ของ template — title สองภาษา + retitle แถวที่ยังไม่ถูกแก้

**Files:**
- Modify: `packages/prisma-shared-schema-platform/prisma/seed.dashboard-widget-template.data.ts`
- Modify: `packages/prisma-shared-schema-platform/prisma/seed.dashboard-widget-template.ts` (`OUTCOMES` ~40, `ExistingRow` ~52, `CHANGING_OUTCOMES` ~69, `createRow` ~161, `applyEntry` ~189, `runSeed` select ~271)

**Interfaces:**
- Consumes: Prisma field `title_i18n` (Task 2)
- Produces: entry field `title_i18n: { en: string; th: string }` · outcome ใหม่ `'retitled'`

- [ ] **Step 1: type ของ entry**

ใน `DashboardWidgetTemplateSeedEntry` ต่อจาก `title: string;`:

```ts
  /**
   * Per-locale title written on create, and on existing rows whose title still equals `title` (operator never renamed them)
   * ชื่อสองภาษา — ใช้ตอนสร้าง และกับแถวเดิมที่ title ยังเท่ากับ `title` (operator ยังไม่เปลี่ยนชื่อ)
   */
  title_i18n: { en: string; th: string };
```

และแก้ JSDoc ของ `title` เป็น `/** Title as first seeded — identifies rows the operator has not renamed / ชื่อที่ seed ไว้ครั้งแรก ใช้จับแถวที่ operator ยังไม่เปลี่ยนชื่อ */`

- [ ] **Step 2: เติม `title_i18n` ทุก entry ด้วยสคริปต์ (71 รายการ)**

บันทึกเป็น `$SCRATCH/add-title-i18n.py` (นอกรีโป) แล้วรันจาก root ของ backend-v2:

```python
import re, sys
P = 'packages/prisma-shared-schema-platform/prisma/seed.dashboard-widget-template.data.ts'
T = {
  'system.procurement.document.pr-pending': ('Pending PR approvals', 'PR รออนุมัติ'),
  'system.procurement.document.po-pending': ('Pending PO approvals', 'PO รออนุมัติ'),
  'system.procurement.document.grn-pending': ('GRNs awaiting commit', 'GRN รอ commit'),
  'system.procurement.workflow.cn-pending-approval': ('Pending CN approvals', 'CN รออนุมัติ'),
  'system.procurement.procurement.pr-by-status': ('PR by status', 'PR แยกตามสถานะ'),
  'system.procurement.document.po-by-status': ('PO by status', 'PO แยกตามสถานะ'),
  'system.procurement.procurement.po-by-vendor-top': ('Top 10 vendors by PO spend', 'Top 10 vendor ตามยอดสั่ง'),
  'system.procurement.procurement.pr-by-department': ('PR by department', 'PR แยกตามแผนก'),
  'system.inventory.inventory.physical-count-pending': ('Pending physical counts', 'Physical Count ค้าง'),
  'system.inventory.inventory.low-stock-count': ('Low stock', 'สินค้าใกล้หมด'),
  'system.inventory.inventory.stock-in-pending': ('Pending Stock In', 'Stock In ค้าง'),
  'system.inventory.inventory.stock-out-pending': ('Pending Stock Out', 'Stock Out ค้าง'),
  'system.inventory.document.sr-pending': ('Pending SRs', 'SR ค้าง'),
  'system.inventory.inventory.spot-check-pending': ('Pending spot checks', 'Spot Check ค้าง'),
  'system.inventory.inventory.issue-open': ('Open issues', 'Issues เปิดอยู่'),
  'system.inventory.inventory.stock-in-by-status': ('Stock In by status', 'Stock In แยกตามสถานะ'),
  'system.inventory.inventory.stock-out-by-status': ('Stock Out by status', 'Stock Out แยกตามสถานะ'),
  'system.inventory.inventory.spot-check-by-status': ('Spot checks by status', 'Spot Check แยกตามสถานะ'),
  'system.inventory.inventory.issue-by-priority': ('Issues by priority', 'Issues แยกตามความสำคัญ'),
  'system.product.product.total-active': ('Active products', 'สินค้าที่ใช้งาน'),
  'system.product.product.total-inactive': ('Inactive / discontinued products', 'สินค้าที่ไม่ใช้งาน / เลิกขาย'),
  'system.product.product.added-7d': ('Products added (7d)', 'Product เพิ่มใน 7 วัน'),
  'system.product.product.without-vendor': ('Products without vendor', 'Product ไม่มี vendor'),
  'system.product.product.category-total': ('All categories', 'Category ทั้งหมด'),
  'system.product.product.by-status': ('Products by status', 'Product แยกตามสถานะ'),
  'system.product.product.by-category-top': ('Top 10 categories by product count', 'Top 10 category ตามจำนวน product'),
  'system.product.product.by-item-group-top': ('Top 10 item groups', 'Top 10 กลุ่มสินค้า'),
  'system.product.product.by-unit': ('Products by inventory unit', 'Product แยกตาม inventory unit'),
  'system.product.product.top-vendors-by-product-count': ('Top 10 vendors by product count', 'Top 10 vendor ตามจำนวน product'),
  'system.product.product.added-daily': ('Products added per day (30d)', 'Product เพิ่มต่อวัน (30d)'),
  'system.product.product.updated-daily': ('Products updated per day (30d)', 'Product อัปเดตต่อวัน (30d)'),
  'system.config.config.location-active-count': ('Active locations', 'สถานที่ที่ใช้งาน'),
  'system.config.config.vendor-by-business-type': ('Vendors by business type', 'Vendor แยกตามประเภทธุรกิจ'),
  'system.config.config.cn-by-reason': ('CN by reason', 'CN แยกตามเหตุผล'),
  'system.config.config.tax-profile-by-rate': ('Tax profiles by rate (%)', 'Tax profile แยกตาม rate (%)'),
  'system.config.config.exchange-rate-latest': ('Latest exchange rate per currency', 'Exchange rate ล่าสุดต่อสกุล'),
  'system.vendor-management.vendor.total-active': ('Active vendors', 'Vendor ที่ใช้งาน'),
  'system.vendor-management.vendor.added-7d': ('Vendors added (7d)', 'Vendor เพิ่มใน 7 วัน'),
  'system.vendor-management.vendor.without-products': ('Vendors without products', 'Vendor ไม่มี product'),
  'system.vendor-management.pricelist.active-count': ('Active pricelists', 'Pricelist ที่ใช้งาน'),
  'system.vendor-management.pricelist.expiring-soon': ('Pricelists expiring soon (30d)', 'Pricelist ใกล้หมดอายุ (30d)'),
  'system.vendor-management.rfp.active': ('Open RFPs', 'RFP เปิดอยู่'),
  'system.vendor-management.rfp.upcoming-7d': ('RFPs opening in 7 days', 'RFP จะเปิดใน 7 วัน'),
  'system.vendor-management.pricelist.by-status': ('Pricelists by status', 'Pricelist แยกตามสถานะ'),
  'system.vendor-management.pricelist.by-vendor-top': ('Top 10 vendors by pricelist count', 'Top 10 vendor ตามจำนวน pricelist'),
  'system.vendor-management.rfp.issued-daily': ('RFPs created per day (30d)', 'RFP สร้างต่อวัน (30d)'),
  'system.operation-plan.recipe.total-active': ('Active recipes', 'Recipe ที่ใช้งาน'),
  'system.operation-plan.recipe.added-7d': ('Recipes added (7d)', 'Recipe เพิ่มใน 7 วัน'),
  'system.operation-plan.recipe.average-ingredients': ('Avg ingredients / recipe', 'ค่าเฉลี่ย ingredients ต่อ recipe'),
  'system.operation-plan.recipe.cuisines-total': ('Cuisine types', 'ประเภทอาหาร'),
  'system.operation-plan.equipment.total-active': ('Active equipment', 'Equipment ที่ใช้งาน'),
  'system.operation-plan.recipe.by-cuisine-top': ('Top 10 cuisines by recipe count', 'Top 10 cuisine ตามจำนวน recipe'),
  'system.operation-plan.recipe.by-category-top': ('Top 10 recipe categories', 'Top 10 หมวดหมู่ recipe'),
  'system.operation-plan.equipment.by-category': ('Equipment by category', 'Equipment แยกตามประเภท'),
  'system.operation-plan.recipe.most-complex': ('Recipes with the most ingredients', 'Recipe ที่ใช้ ingredients มากสุด'),
  'system.operation-plan.recipe.added-daily': ('Recipes created per day (30d)', 'Recipe สร้างต่อวัน (30d)'),
  'system.store-operation.document.sr-pending': ('SRs in progress', 'SR รอดำเนินการ'),
  'system.store-operation.document.sr-count': ('All SRs', 'SR ทั้งหมด'),
  'system.store-operation.inventory.below-par-count': ('Items below par', 'สินค้าต่ำกว่า par'),
  'system.store-operation.document.sr-by-status': ('SR by status', 'SR แยกตามสถานะ'),
  'system.store-operation.document.sr-created-series': ('SRs created per day', 'SR สร้างต่อวัน'),
  'system.store-operation.document.sr-issued': ('Issued SRs', 'SR ที่จ่ายของแล้ว'),
  'system.store-operation.inventory.below-par-items': ('Replenishment list', 'รายการที่ต้องเติมสต๊อก'),
  'bu_default.pr-pending': ('Pending PR approvals', 'PR รออนุมัติ'),
  'bu_default.po-pending': ('Pending PO approvals', 'PO รออนุมัติ'),
  'bu_default.grn-pending': ('GRNs awaiting commit', 'GRN รอ commit'),
  'bu_default.sr-pending': ('SRs in progress', 'SR รอดำเนินการ'),
  'bu_default.low-stock-count': ('Low stock', 'สินค้าใกล้หมด'),
  'bu_default.spend-daily': ('PO spend per day', 'ยอดสั่งซื้อต่อวัน'),
  'bu_default.pr-by-status': ('PR by status', 'PR แยกตามสถานะ'),
  'bu_default.po-by-vendor-top': ('Top 10 vendors by PO spend', 'Top 10 vendor ตามยอดสั่ง'),
}
s = open(P, encoding='utf-8').read()
seen = set()

def add(m):
    block = m.group(0)
    key = re.search(r"seed_key: '([^']+)'", block).group(1)
    if key not in T:
        sys.exit(f'missing translation for {key}')
    seen.add(key)
    en, th = T[key]
    indent = re.search(r"\n(\s*)title: '", block).group(1)
    return re.sub(r"(\n\s*title: '[^']*',)",
                  lambda t: t.group(1) + f"\n{indent}title_i18n: {{ en: '{en}', th: '{th}' }},", block, count=1)

s = re.sub(r"seed_key: '[^']+'.*?title: '[^']*',", add, s, flags=re.S)
missing = set(T) - seen
if missing:
    sys.exit(f'unused keys: {sorted(missing)}')
open(P, 'w', encoding='utf-8').write(s)
print('ok', len(seen))
```

Run: `python3 "$SCRATCH/add-title-i18n.py"` (ตั้ง `SCRATCH` เป็น scratchpad ของเซสชัน)
Expected: `ok 71` — ถ้าสคริปต์ exit พร้อม `missing translation for …` แปลว่าไฟล์ seed มี entry เพิ่มจากตอนเขียน plan ให้เติมคำแปลลง `T` แล้วรันใหม่ (`git checkout` ไฟล์ก่อน)

- [ ] **Step 3: seeder**

ใน `seed.dashboard-widget-template.ts`:

1. `OUTCOMES` เพิ่ม `'retitled',` ต่อจาก `'updated',` และ `CHANGING_OUTCOMES` เป็น `new Set<Outcome>(['created', 'updated', 'retitled', 'retired'])`
2. `ExistingRow` เพิ่ม `title: string | null;` และ `title_i18n: Prisma.JsonValue | null;` · select ใน `runSeed` เพิ่ม `title: true, title_i18n: true,`
3. `createRow` เปลี่ยน `title: entry.title,` เป็น:

```ts
      title: entry.title_i18n.en,
      title_i18n: entry.title_i18n,
```

4. เพิ่มฟังก์ชันเหนือ `applyEntry`:

```ts
/**
 * Whether a row still carries the seeded title untouched (title equals the file and title_i18n is the migration backfill or empty)
 * แถวยังมีชื่อจาก seed ที่ไม่มีใครแตะ (title เท่ากับไฟล์ และ title_i18n เป็นค่าจาก backfill หรือว่าง)
 * @param row - Matched row / แถวที่จับคู่ได้
 * @param entry - Seed entry / entry ในไฟล์ seed
 * @returns True when the seeder may rewrite the title / true เมื่อ seeder เขียนชื่อใหม่ได้
 */
function isUntouchedSeedTitle(row: ExistingRow, entry: DashboardWidgetTemplateSeedEntry): boolean {
  if (row.title !== entry.title) return false;
  return row.title_i18n === null || isSameJson(row.title_i18n, { en: entry.title });
}
```

5. ใน `applyEntry` แทนที่ส่วนตั้งแต่ `const isSame =` ถึง `return 'updated';` ด้วย:

```ts
  const isSame =
    row.dataset_id === entry.dataset_id &&
    row.widget_type === entry.widget_type &&
    isSameJson(row.params, entry.params);
  const isRetitle = isUntouchedSeedTitle(row, entry) && !isSameJson(row.title_i18n, entry.title_i18n);
  if (isSame && !isRetitle) return 'unchanged';
  // ไม่แตะ updated_by_id และฟิลด์ของ operator — title เขียนเฉพาะแถวที่ operator ยังไม่เปลี่ยนชื่อ
  await tx.tb_dashboard_widget_template.update({
    where: { id: row.id },
    data: {
      dataset_id: entry.dataset_id,
      widget_type: entry.widget_type,
      params: toJsonInput(entry.params),
      ...(isRetitle ? { title: entry.title_i18n.en, title_i18n: entry.title_i18n } : {}),
      updated_at: now,
      doc_version: { increment: 1 },
    },
  });
  return isSame ? 'retitled' : 'updated';
```

6. แก้ JSDoc หัวไฟล์บรรทัด "ฟิลด์ของ operator (`title`, …) ใส่ตอนสร้างครั้งแรกเท่านั้น" ต่อท้ายด้วย " — ยกเว้น `title`/`title_i18n` ของแถวที่ title ยังเท่ากับไฟล์ (ดู `isUntouchedSeedTitle`)"

- [ ] **Step 4: static checks**

Run: `cd packages/prisma-shared-schema-platform && bunx tsc --noEmit -p tsconfig.json`
Expected: ไม่มี error (ถ้าแพ็กเกจไม่มี tsconfig ที่ครอบ `prisma/*.ts` ให้รัน `bunx tsc --noEmit --skipLibCheck --module esnext --moduleResolution bundler --target es2022 prisma/seed.dashboard-widget-template.ts`)

- [ ] **Step 5: Commit**

```bash
git add packages/prisma-shared-schema-platform/prisma/seed.dashboard-widget-template.data.ts \
  packages/prisma-shared-schema-platform/prisma/seed.dashboard-widget-template.ts
git commit -m "feat(seed): title สองภาษาให้ dashboard widget template + retitle แถวที่ operator ยังไม่แก้"
```

---

## Part C — carmen-platform (`../carmen-platform`)

### Task 6: TemplateEditDialog แยกช่อง EN / TH

**Files:**
- Modify: `src/types/index.ts` (`DashboardTemplate` ~1874)
- Modify: `src/pages/dashboardTemplates/TemplateEditDialog.tsx`
- Modify: `src/pages/dashboardTemplates/TemplateListPanel.tsx:146`
- Modify: `src/i18n/en.ts` (~4377), `src/i18n/th.ts` (~3368)

**Interfaces:**
- Consumes: API template รับ/คืน `title_i18n` (Task 3–4)

- [ ] **Step 1: branch**

```bash
cd ../carmen-platform && git switch main && git pull --ff-only && git switch -c feature/widget-title-i18n
```

- [ ] **Step 2: type**

ใน `src/types/index.ts` เพิ่มเหนือ `DashboardTemplate`:

```ts
export interface LocalizedTitle {
  en: string;
  th?: string;
}
```

และใน `DashboardTemplate` ต่อจาก `title?`:

```ts
  title_i18n?: LocalizedTitle | null;
```

(`DashboardTemplateInput` เป็น `Omit<DashboardTemplate, …>` จึงได้ฟิลด์นี้ไปด้วย)

- [ ] **Step 3: i18n**

`src/i18n/en.ts` ต่อจาก `fieldTitlePlaceholder`:

```ts
      fieldTitleEn: 'Title (English)',
      fieldTitleTh: 'Title (Thai)',
      fieldTitleThPlaceholder: 'Optional — falls back to English',
      titleEnRequired: 'Enter the English title before the Thai one',
```

`src/i18n/th.ts` ต่อจาก `fieldTitlePlaceholder`:

```ts
      fieldTitleEn: 'ชื่อ (อังกฤษ)',
      fieldTitleTh: 'ชื่อ (ไทย)',
      fieldTitleThPlaceholder: 'ไม่บังคับ — ถ้าเว้นว่างจะใช้ชื่ออังกฤษ',
      titleEnRequired: 'กรอกชื่ออังกฤษก่อนจึงจะใส่ชื่อไทยได้',
```

- [ ] **Step 4: dialog**

ใน `TemplateEditDialog.tsx`:

1. แทน `const [title, setTitle] = useState('');` ด้วย:

```tsx
  const [titleEn, setTitleEn] = useState('');
  const [titleTh, setTitleTh] = useState('');
```

2. ใน `useEffect` แทน `setTitle(template?.title ?? '');` ด้วย:

```tsx
    setTitleEn(template?.title_i18n?.en ?? template?.title ?? '');
    setTitleTh(template?.title_i18n?.th ?? '');
```

3. ใน `handleSave` บรรทัดแรกหลัง `if (!datasetId || !widgetType) return;`:

```tsx
    const en = titleEn.trim();
    const th = titleTh.trim();
    // backend ตอบ 400 ถ้ามี th แต่ไม่มี en — กันไว้ก่อนยิง
    if (th && !en) {
      setError(t('pages.dashboardTemplates.titleEnRequired'));
      return;
    }
```

และใน `common` แทน `title: title.trim() || null,` ด้วย:

```tsx
      title_i18n: en ? { en, ...(th ? { th } : {}) } : null,
```

4. แทนบล็อก `<div className="space-y-2">` ของ `dt-title` ทั้งบล็อกด้วย:

```tsx
          <div className="space-y-2">
            <Label htmlFor="dt-title-en">{t('pages.dashboardTemplates.fieldTitleEn')}</Label>
            <Input
              id="dt-title-en"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder={t('pages.dashboardTemplates.fieldTitlePlaceholder')}
              maxLength={255}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dt-title-th">{t('pages.dashboardTemplates.fieldTitleTh')}</Label>
            <Input
              id="dt-title-th"
              value={titleTh}
              onChange={(e) => setTitleTh(e.target.value)}
              placeholder={t('pages.dashboardTemplates.fieldTitleThPlaceholder')}
              maxLength={255}
              disabled={saving}
            />
          </div>
```

5. ถ้า `t('pages.dashboardTemplates.fieldTitle')` ไม่มีที่อื่นใช้แล้ว (`grep -rn "fieldTitle'" src`) ปล่อยคีย์ไว้ได้ — ไม่ต้องลบ

- [ ] **Step 5: list แสดงตามภาษาของหน้า**

ใน `TemplateListPanel.tsx` ดึง `lang` จาก `useI18n()` (component ใช้ `const { t } = useI18n();` อยู่แล้ว → เปลี่ยนเป็น `const { t, lang } = useI18n();`) แล้วแก้บรรทัด 146:

```tsx
                      <td className="px-3 py-2">{(lang === 'th' && row.title_i18n?.th) || row.title_i18n?.en || row.title || byId.get(row.dataset_id)?.name || row.dataset_id}</td>
```

- [ ] **Step 6: static checks + เทสต์เดิม**

Run: `npm run typecheck && npm run lint && npm test`
Expected: ผ่าน (ถ้ามีเทสต์ของ TemplateEditDialog ที่หา label `Title` แล้วแดง ให้อัปเดต selector เป็น `Title (English)` — เป็นการตามสัญญาใหม่)

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/pages/dashboardTemplates/TemplateEditDialog.tsx src/pages/dashboardTemplates/TemplateListPanel.tsx src/i18n/en.ts src/i18n/th.ts
git commit -m "feat(dashboard-templates): ตั้งชื่อ widget template แยกภาษา EN/TH"
```

---

## Part D — carmen-inventory-frontend-react (รีโปนี้, branch `feature/widget-title-i18n` มีอยู่แล้ว)

### Task 7: type + helper เลือก title + คำแปลชื่อ dataset

**Files:**
- Modify: `types/dashboard-widget.ts` (`WidgetConfig` ~174, `CreateWidgetDto` ~184, `UpdateWidgetDto` ~193)
- Create: `components/dashboard-widget/widget-title.ts`
- Create: `components/dashboard-widget/use-widget-title.ts`
- Modify: `messages/en.json`, `messages/th.json` (namespace `dashboard` บรรทัด ~4321)

**Interfaces:**
- Produces:
  - `LocalizedTitle` (`types/dashboard-widget.ts`)
  - `WidgetTitleSource = { dataset_id: string; title?: string | null; title_i18n?: LocalizedTitle | null }`
  - `customWidgetTitle(widget: WidgetTitleSource, datasetName?: string): LocalizedTitle | null`
  - `resolveWidgetTitle(widget: WidgetTitleSource, opts: { locale: string; datasetName?: string; translatedDatasetName?: string }): string`
  - `useWidgetTitle(): (widget: WidgetTitleSource, datasetName?: string) => string`
  - `useDatasetLabel(): (datasetId: string, datasetName?: string) => string`

- [ ] **Step 1: type**

ใน `types/dashboard-widget.ts` เพิ่มเหนือ `WidgetConfig`:

```ts
/** ชื่อ widget แยกภาษา — มี object เมื่อไรต้องมี en (backend ปฏิเสธ th ที่ไม่มี en) */
export interface LocalizedTitle {
  readonly en: string;
  readonly th?: string;
}
```

เพิ่ม `readonly title_i18n?: LocalizedTitle | null;` ต่อจาก `title` ใน `WidgetConfig`, `CreateWidgetDto` และ `UpdateWidgetDto` (`SystemWidgetConfigItem`, `BuDashboardWidget`, `CreateBuDashboardWidgetDto` ได้ไปด้วยเพราะประกอบจาก type เหล่านี้)

- [ ] **Step 2: `components/dashboard-widget/widget-title.ts`**

```ts
import type { LocalizedTitle } from "@/types/dashboard-widget";

export interface WidgetTitleSource {
  readonly dataset_id: string;
  readonly title?: string | null;
  readonly title_i18n?: LocalizedTitle | null;
}

/**
 * title ที่มีคนตั้งเองจริง ๆ — null = ใช้ชื่อตั้งต้นของ dataset
 *
 * widget รุ่นก่อนถูกบันทึก `title = ชื่อ dataset` (ภาษาอังกฤษ) ตอนสร้างทุกใบ แล้ว migration
 * backfill เป็น `{ en: ชื่อ dataset }` — ค่าที่เท่ากับชื่อ dataset ตรงตัวและไม่มีภาษาอื่น
 * จึงถือว่า "ระบบแช่ไว้" ไม่ใช่ชื่อที่ผู้ใช้ตั้ง ไม่งั้นหน้าไทยจะติดชื่ออังกฤษตลอดไป
 */
export function customWidgetTitle(
  widget: WidgetTitleSource,
  datasetName?: string,
): LocalizedTitle | null {
  const en = widget.title_i18n?.en?.trim() || widget.title?.trim() || "";
  const th = widget.title_i18n?.th?.trim() || undefined;
  if (!en) return null;
  if (!th && en === datasetName) return null;
  return th ? { en, th } : { en };
}

/**
 * ชื่อที่จะแสดง: ชื่อที่ตั้งเองตาม locale → ชื่อที่ตั้งเอง (en) → ชื่อ dataset ที่แปลแล้ว
 * → ชื่อ dataset จาก catalogue → dataset_id
 */
export function resolveWidgetTitle(
  widget: WidgetTitleSource,
  opts: {
    readonly locale: string;
    readonly datasetName?: string;
    readonly translatedDatasetName?: string;
  },
): string {
  const custom = customWidgetTitle(widget, opts.datasetName);
  if (custom) {
    return custom[opts.locale as keyof LocalizedTitle] || custom.en;
  }
  return (
    opts.translatedDatasetName || opts.datasetName || widget.dataset_id
  );
}
```

- [ ] **Step 3: `components/dashboard-widget/use-widget-title.ts`**

```ts
import { useCallback } from "react";
import { useLocale, useTranslations } from "use-intl";
import {
  resolveWidgetTitle,
  type WidgetTitleSource,
} from "./widget-title";

/**
 * ชื่อ dataset ตาม locale — คีย์คือ dataset_id ตรง ๆ (`dashboard.datasets.workflow.cn-pending-approval`)
 * use-intl อ่านจุดเป็น path ซ้อน ซึ่งตรงกับโครงของไฟล์แปล; dataset ที่ไม่มีคำแปล
 * (เช่นที่ promote จาก SQL Workbench) ใช้ชื่อจาก catalogue
 */
export function useDatasetLabel() {
  const t = useTranslations("dashboard.datasets");
  return useCallback(
    (datasetId: string, datasetName?: string) =>
      (t.has(datasetId) ? t(datasetId) : undefined) ||
      datasetName ||
      datasetId,
    [t],
  );
}

/** ฟังก์ชันเลือกชื่อ widget ตาม locale ปัจจุบัน — ดู `resolveWidgetTitle` */
export function useWidgetTitle() {
  const locale = useLocale();
  const t = useTranslations("dashboard.datasets");
  return useCallback(
    (widget: WidgetTitleSource, datasetName?: string) =>
      resolveWidgetTitle(widget, {
        locale,
        datasetName,
        translatedDatasetName: t.has(widget.dataset_id)
          ? t(widget.dataset_id)
          : undefined,
      }),
    [locale, t],
  );
}
```

(ไฟล์อยู่ใน `components/dashboard-widget/` เพราะผู้ใช้มีแค่โฟลเดอร์นี้ + `routes/dashboard` — ตาม CLAUDE.md hook ที่ใช้ข้ามโมดูลจาก components ให้อยู่ใกล้ผู้ใช้; `components/` import จาก `routes/` ไม่ได้ แต่ `routes/` import จาก `components/` ได้)

- [ ] **Step 4: คำแปลชื่อ dataset (94 ตัว)**

ชื่อ en = ชื่อจาก catalogue ของ dev ณ 2026-10-08 คำไทยใช้ศัพท์เดียวกับเมนูของแอป (ใบขอซื้อ / ใบสั่งซื้อ / ใบเบิกสินค้า / ใบรับสินค้า / ตรวจนับสินค้า / ตรวจสอบเฉพาะจุด / รายการราคา) บันทึกเป็น `$SCRATCH/add-dataset-names.py` แล้วรันจาก root ของรีโปนี้:

```python
import json
D = {
  'workflow.cn-pending-approval': ('Pending CN approvals', 'ใบลดหนี้รออนุมัติ'),
  'workflow.my-pending-pr': ('My pending PRs', 'ใบขอซื้อที่รอฉันดำเนินการ'),
  'inventory.physical-count-pending': ('Pending physical counts', 'ตรวจนับสินค้าที่ค้างอยู่'),
  'inventory.low-stock-count': ('Low stock items', 'สินค้าใกล้หมด'),
  'inventory.stock-in-pending': ('Pending Stock In', 'Stock In ที่ค้างอยู่'),
  'inventory.stock-out-pending': ('Pending Stock Out', 'Stock Out ที่ค้างอยู่'),
  'inventory.spot-check-pending': ('Pending Spot Checks', 'ตรวจสอบเฉพาะจุดที่ค้างอยู่'),
  'inventory.issue-open': ('Open issues', 'ปัญหาที่ยังเปิดอยู่'),
  'inventory.physical-count-by-status': ('Physical count by status', 'ตรวจนับสินค้าแยกตามสถานะ'),
  'inventory.stock-in-by-status': ('Stock In by status', 'Stock In แยกตามสถานะ'),
  'inventory.stock-out-by-status': ('Stock Out by status', 'Stock Out แยกตามสถานะ'),
  'inventory.spot-check-by-status': ('Spot Check by status', 'ตรวจสอบเฉพาะจุดแยกตามสถานะ'),
  'inventory.issue-by-priority': ('Issues by priority', 'ปัญหาแยกตามความสำคัญ'),
  'inventory.transactions-daily': ('Inventory transactions (daily)', 'รายการเคลื่อนไหวสต๊อก (รายวัน)'),
  'inventory.most-active-products': ('Most active products (inventory)', 'สินค้าที่เคลื่อนไหวมากที่สุด (สต๊อก)'),
  'inventory.transactions-by-location-month': ('Inventory tx by location × month', 'รายการสต๊อกแยกตามสถานที่ × เดือน'),
  'inventory.below-par-count': ('Items below par', 'สินค้าที่ต่ำกว่า par'),
  'inventory.below-par-by-location': ('Below par by location', 'สินค้าต่ำกว่า par แยกตามสถานที่'),
  'inventory.below-par-items': ('Replenishment list', 'รายการที่ต้องเติมสต๊อก'),
  'procurement.pr-by-status': ('PR by status', 'ใบขอซื้อแยกตามสถานะ'),
  'procurement.po-by-vendor-top': ('Top vendors by PO spend', 'Vendor ที่มียอดสั่งซื้อสูงสุด'),
  'procurement.pr-by-department': ('PR by department', 'ใบขอซื้อแยกตามแผนก'),
  'procurement.spend-daily': ('PO spend (daily)', 'ยอดสั่งซื้อ (รายวัน)'),
  'procurement.slowest-pr-approvals': ('Slowest PR approvals', 'ใบขอซื้อที่อนุมัติช้าที่สุด'),
  'procurement.slowest-po-approvals': ('Slowest PO approvals', 'ใบสั่งซื้อที่อนุมัติช้าที่สุด'),
  'procurement.top-products-by-quantity': ('Top products by PR quantity', 'สินค้าที่ขอซื้อมากที่สุด'),
  'procurement.spend-by-vendor-month': ('Spend by vendor × month', 'ยอดสั่งซื้อแยกตาม vendor × เดือน'),
  'product.total-active': ('Active products', 'สินค้าที่ใช้งาน'),
  'product.total-inactive': ('Inactive products', 'สินค้าที่ไม่ใช้งาน'),
  'product.added-7d': ('Products added (7d)', 'สินค้าที่เพิ่ม (7 วัน)'),
  'product.without-vendor': ('Products without vendor', 'สินค้าที่ไม่มี vendor'),
  'product.category-total': ('Product categories', 'หมวดหมู่สินค้า'),
  'product.by-status': ('Products by status', 'สินค้าแยกตามสถานะ'),
  'product.by-category-top': ('Products by category (top N)', 'สินค้าแยกตามหมวดหมู่ (Top N)'),
  'product.by-item-group-top': ('Products by item group (top N)', 'สินค้าแยกตามกลุ่มสินค้า (Top N)'),
  'product.by-unit': ('Products by inventory unit', 'สินค้าแยกตามหน่วยสต๊อก'),
  'product.top-vendors-by-product-count': ('Top vendors by product coverage', 'Vendor ที่ครอบคลุมสินค้ามากที่สุด'),
  'product.added-daily': ('Products added (daily)', 'สินค้าที่เพิ่ม (รายวัน)'),
  'product.updated-daily': ('Products updated (daily)', 'สินค้าที่แก้ไข (รายวัน)'),
  'config.location-active-count': ('Active locations', 'สถานที่ที่ใช้งาน'),
  'config.vendor-by-business-type': ('Vendors by business type', 'Vendor แยกตามประเภทธุรกิจ'),
  'config.cn-by-reason': ('Credit notes by reason', 'ใบลดหนี้แยกตามเหตุผล'),
  'config.tax-profile-by-rate': ('Tax profiles by rate', 'Tax profile แยกตามอัตรา'),
  'config.exchange-rate-latest': ('Latest exchange rates', 'อัตราแลกเปลี่ยนล่าสุด'),
  'vendor.total-active': ('Active vendors', 'Vendor ที่ใช้งาน'),
  'vendor.added-7d': ('Vendors added (7d)', 'Vendor ที่เพิ่ม (7 วัน)'),
  'vendor.without-products': ('Vendors without products', 'Vendor ที่ไม่มีสินค้า'),
  'pricelist.active-count': ('Active pricelists', 'รายการราคาที่ใช้งาน'),
  'pricelist.expiring-soon': ('Pricelists expiring (≤30d)', 'รายการราคาใกล้หมดอายุ (≤30 วัน)'),
  'pricelist.by-status': ('Pricelists by status', 'รายการราคาแยกตามสถานะ'),
  'pricelist.by-vendor-top': ('Pricelists by vendor (top N)', 'รายการราคาแยกตาม vendor (Top N)'),
  'rfp.active': ('Active RFPs', 'RFP ที่เปิดอยู่'),
  'rfp.upcoming-7d': ('Upcoming RFPs (7d)', 'RFP ที่จะเปิด (7 วัน)'),
  'rfp.issued-daily': ('RFPs issued (daily)', 'RFP ที่ออก (รายวัน)'),
  'recipe.total-active': ('Active recipes', 'สูตรอาหารที่ใช้งาน'),
  'recipe.added-7d': ('Recipes added (7d)', 'สูตรอาหารที่เพิ่ม (7 วัน)'),
  'recipe.average-ingredients': ('Avg ingredients per recipe', 'วัตถุดิบเฉลี่ยต่อสูตร'),
  'recipe.cuisines-total': ('Cuisine types', 'ประเภทอาหาร'),
  'recipe.by-cuisine-top': ('Recipes by cuisine (top N)', 'สูตรอาหารแยกตามประเภทอาหาร (Top N)'),
  'recipe.by-category-top': ('Recipes by category (top N)', 'สูตรอาหารแยกตามหมวดหมู่ (Top N)'),
  'recipe.most-complex': ('Most complex recipes', 'สูตรอาหารที่ซับซ้อนที่สุด'),
  'recipe.added-daily': ('Recipes added (daily)', 'สูตรอาหารที่เพิ่ม (รายวัน)'),
  'equipment.total-active': ('Active equipment', 'อุปกรณ์ที่ใช้งาน'),
  'equipment.by-category': ('Equipment by category', 'อุปกรณ์แยกตามหมวดหมู่'),
  'lab.pr-created-series': ('PR created (series)', 'ใบขอซื้อที่สร้าง (ซีรีส์)'),
  'lab.po-issued-series': ('PO issued (series)', 'ใบสั่งซื้อที่ออก (ซีรีส์)'),
  'lab.po-spend-series': ('PO spend (series)', 'ยอดสั่งซื้อ (ซีรีส์)'),
  'lab.pr-count-recent': ('PR count (recent)', 'จำนวนใบขอซื้อ (ล่าสุด)'),
  'lab.pr-by-status-recent': ('PR by status (recent)', 'ใบขอซื้อแยกตามสถานะ (ล่าสุด)'),
  'lab.pr-amount-by-department': ('PR amount by department', 'ยอดใบขอซื้อแยกตามแผนก'),
  'document.pr-count': ('Purchase Request count', 'จำนวนใบขอซื้อ'),
  'document.pr-by-status': ('Purchase Request by status', 'ใบขอซื้อแยกตามสถานะ'),
  'document.pr-created-series': ('Purchase Request created (series)', 'ใบขอซื้อที่สร้าง (ซีรีส์)'),
  'document.pr-pending': ('Purchase Request pending', 'ใบขอซื้อที่รอดำเนินการ'),
  'document.po-count': ('Purchase Order count', 'จำนวนใบสั่งซื้อ'),
  'document.po-by-status': ('Purchase Order by status', 'ใบสั่งซื้อแยกตามสถานะ'),
  'document.po-created-series': ('Purchase Order created (series)', 'ใบสั่งซื้อที่สร้าง (ซีรีส์)'),
  'document.po-pending': ('Purchase Order pending', 'ใบสั่งซื้อที่รอดำเนินการ'),
  'document.sr-count': ('Store Requisition count', 'จำนวนใบเบิกสินค้า'),
  'document.sr-by-status': ('Store Requisition by status', 'ใบเบิกสินค้าแยกตามสถานะ'),
  'document.sr-created-series': ('Store Requisition created (series)', 'ใบเบิกสินค้าที่สร้าง (ซีรีส์)'),
  'document.sr-pending': ('Store Requisition pending', 'ใบเบิกสินค้าที่รอดำเนินการ'),
  'document.grn-count': ('Good Received Note count', 'จำนวนใบรับสินค้า'),
  'document.grn-by-status': ('Good Received Note by status', 'ใบรับสินค้าแยกตามสถานะ'),
  'document.grn-created-series': ('Good Received Note created (series)', 'ใบรับสินค้าที่สร้าง (ซีรีส์)'),
  'document.grn-pending': ('Good Received Note pending', 'ใบรับสินค้าที่รอดำเนินการ'),
  'document.pr-table': ('Purchase Request table', 'ตารางใบขอซื้อ'),
  'document.sr-issued': ('Store Requisition issued', 'ใบเบิกสินค้าที่จ่ายแล้ว'),
  'document.pr-sent-back': ('Sent Back PRs', 'ใบขอซื้อที่ถูกส่งกลับ'),
  'document.pr-rejected': ('Rejected PRs', 'ใบขอซื้อที่ถูกปฏิเสธ'),
  'document.po-sent-back': ('Sent Back POs', 'ใบสั่งซื้อที่ถูกส่งกลับ'),
  'document.po-rejected': ('Rejected POs', 'ใบสั่งซื้อที่ถูกปฏิเสธ'),
  'document.sr-sent-back': ('Sent Back SRs', 'ใบเบิกสินค้าที่ถูกส่งกลับ'),
  'document.sr-rejected': ('Rejected SRs', 'ใบเบิกสินค้าที่ถูกปฏิเสธ'),
}
assert len(D) == 94, len(D)
for lang, idx in (('en', 0), ('th', 1)):
    p = f'messages/{lang}.json'
    m = json.load(open(p, encoding='utf-8'))
    assert 'datasets' not in m['dashboard'], 'dashboard.datasets มีอยู่แล้ว — ตรวจก่อนทับ'
    tree = {}
    for key, names in sorted(D.items()):
        group, leaf = key.split('.', 1)
        assert '{' not in names[idx] and '}' not in names[idx]
        tree.setdefault(group, {})[leaf] = names[idx]
    m['dashboard']['datasets'] = tree
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')
print('ok')
```

Run: `python3 "$SCRATCH/add-dataset-names.py" && git diff --stat messages/`
Expected: `ok` และ diff มีเฉพาะบล็อก `datasets` ใน 2 ไฟล์ — **ถ้า diff เปลี่ยนบรรทัดอื่นด้วย** (เช่น escape ของอักขระ หรือ indent) ให้ `git checkout messages/` แล้ววางบล็อกเองด้วย Edit แทน

- [ ] **Step 5: static checks**

Run: `bunx prettier --write components/dashboard-widget/widget-title.ts components/dashboard-widget/use-widget-title.ts types/dashboard-widget.ts && bun run typecheck && bunx eslint components/dashboard-widget types/dashboard-widget.ts && bun test:run lib/__tests__/i18n-key-parity.test.ts`
Expected: ผ่านทั้งหมด

- [ ] **Step 6: Commit**

```bash
git add types/dashboard-widget.ts components/dashboard-widget/widget-title.ts components/dashboard-widget/use-widget-title.ts messages/en.json messages/th.json
git commit -m "feat(dashboard): helper เลือก title widget ตามภาษา + คำแปลชื่อ dataset 94 ตัว"
```

### Task 8: ใช้ helper ทุกจุดที่แสดง title + เลิกแช่ชื่อ dataset ตอนสร้าง

**Files:**
- Modify: `components/dashboard-widget/sortable-widget-item.tsx:112`
- Modify: `components/dashboard-widget/dashboard-widget-grid.tsx` (`resolveWidget` ~227, `WidgetHeader` ~400)
- Modify: `components/dashboard-widget/bu-widget-section.tsx` (`handleAdd` ~143, `handleCreateWithParams` ~166, `deleteTitleText` ~254)
- Modify: `routes/dashboard/dashboard-component.tsx` (`handleAdd` ~225, `handleCreateWithParams` ~263, `deleteTitleText` ~400)

**Interfaces:**
- Consumes: `useWidgetTitle()` (Task 7)

- [ ] **Step 1: การ์ดใน grid (BU + personal)**

`sortable-widget-item.tsx`: import `import { useWidgetTitle } from "./use-widget-title";` ในตัว component เพิ่ม `const titleOf = useWidgetTitle();` แล้วแทนบรรทัด 112:

```tsx
  const displayTitle = titleOf(widget, dataset?.name ?? detail?.meta.name);
```

- [ ] **Step 2: header ของการ์ด (system widget / preview)**

`dashboard-widget-grid.tsx`:
1. `resolveWidget` — ใน `base` เพิ่ม `title_i18n: config.title_i18n,` ต่อจาก `title: config.title,`
2. `WidgetHeader` — import `useWidgetTitle` จาก `./use-widget-title` เพิ่มบรรทัดแรกในฟังก์ชัน `const titleOf = useWidgetTitle();` แล้วแทน `{widget.title}` ใน `<CardTitle>` ด้วย `{titleOf(widget, widget.meta.name)}`

(การ์ด BU/personal ส่ง title ที่ resolve แล้วเข้ามาผ่าน `buildFullWidget` — ผ่าน `titleOf` ซ้ำได้ผลเดิมเพราะค่าที่ resolve แล้วไม่ใช่ชื่อ dataset ภาษาอังกฤษ หรือถ้าใช่ก็ resolve กลับมาเป็นคำเดิม)

- [ ] **Step 3: เลิกแช่ชื่อ dataset ตอนสร้าง + ชื่อใน dialog ลบ — BU**

`bu-widget-section.tsx`:
1. `handleAdd` — ลบบรรทัด `title: ds.name,`
2. `handleCreateWithParams` — ลบ `title: pendingAdd.name,` (Task 9 จะเติม `title_i18n` ตรงนี้)
3. เพิ่ม `const titleOf = useWidgetTitle();` ใกล้ hook อื่น (import จาก `./use-widget-title`) แล้วแทน `deleteTitleText`:

```tsx
  const deleteTitleText = pendingDelete
    ? titleOf(pendingDelete, datasetsById.get(pendingDelete.dataset_id)?.name)
    : "";
```

ต้องวาง `const titleOf = useWidgetTitle();` **ก่อน** early return (`if (isError && !data) return null;`) — กฎของ hook

- [ ] **Step 4: เหมือนกันฝั่ง personal**

`routes/dashboard/dashboard-component.tsx`:
1. `handleAdd` สาขาที่ไม่ใช่ group — ลบ `title: ds.name,` (**สาขา group widget คงไว้** — group ไม่มี dataset จริงใน catalogue ชื่อ preset จึงต้องเก็บ)
2. `handleCreateWithParams` — ลบ `title: pendingAdd.name,`
3. import `useWidgetTitle` จาก `@/components/dashboard-widget/use-widget-title` เพิ่ม `const titleOf = useWidgetTitle();` ใกล้ hook อื่นก่อน early return แล้วแทน:

```tsx
  const deleteTitleText = pendingDelete
    ? titleOf(pendingDelete, datasetById.get(pendingDelete.dataset_id)?.name)
    : "";
```

- [ ] **Step 5: static checks + เทสต์เดิม**

Run: `bunx prettier --write components/dashboard-widget/sortable-widget-item.tsx components/dashboard-widget/dashboard-widget-grid.tsx components/dashboard-widget/bu-widget-section.tsx routes/dashboard/dashboard-component.tsx && bun run typecheck && bunx eslint components/dashboard-widget routes/dashboard && bun test:run components/dashboard-widget routes/dashboard`
Expected: ผ่าน — ถ้าเทสต์เดิมที่ assert ว่า create ส่ง `title: ds.name` แดง ให้อัปเดต expected เป็นไม่มี `title` (ตามสัญญาใหม่ ไม่ใช่เขียนเทสต์ใหม่)

- [ ] **Step 6: Commit**

```bash
git add components/dashboard-widget/sortable-widget-item.tsx components/dashboard-widget/dashboard-widget-grid.tsx components/dashboard-widget/bu-widget-section.tsx routes/dashboard/dashboard-component.tsx
git commit -m "feat(dashboard): แสดง title widget ตามภาษา และเลิกบันทึกชื่อ dataset เป็น title ตอนสร้าง"
```

### Task 9: ช่องแก้ title EN / TH ใน WidgetConfigDialog

**Files:**
- Modify: `components/dashboard-widget/widget-config-dialog.tsx`
- Modify: `components/dashboard-widget/bu-widget-section.tsx` (`handleCreateWithParams`, `handleConfigure`, JSX ของ dialog แก้ไข ~342)
- Modify: `routes/dashboard/dashboard-component.tsx` (`handleCreateWithParams`, `handleUpdateParams`, JSX ของ dialog แก้ไข ~529)
- Modify: `messages/en.json`, `messages/th.json` (`dashboard.savedWidget`)

**Interfaces:**
- Consumes: `customWidgetTitle`, `useDatasetLabel`, `resolveWidgetTitle`, `LocalizedTitle` (Task 7)
- Produces: `WidgetConfigDialogProps.initialTitle?: LocalizedTitle | null` · `onSubmit: (params: WidgetParams, display: WidgetDisplay, titleI18n: LocalizedTitle | null) => void`

- [ ] **Step 1: คำแปล**

ใน `dashboard.savedWidget` ของ `messages/en.json` ต่อจาก `"configureDescription"`:

```json
      "titleSection": "Title",
      "titleEn": "English",
      "titleTh": "Thai (optional)",
      "titleEnRequired": "Enter the English title before the Thai one",
```

`messages/th.json` ตำแหน่งเดียวกัน:

```json
      "titleSection": "ชื่อวิดเจ็ต",
      "titleEn": "อังกฤษ",
      "titleTh": "ไทย (ไม่บังคับ)",
      "titleEnRequired": "กรอกชื่ออังกฤษก่อนจึงจะใส่ชื่อไทยได้",
```

- [ ] **Step 2: dialog**

ใน `widget-config-dialog.tsx`:

1. imports เพิ่ม:

```tsx
import { useLocale } from "use-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LocalizedTitle } from "@/types/dashboard-widget";
import { useDatasetLabel } from "./use-widget-title";
import { resolveWidgetTitle } from "./widget-title";
```

(`useTranslations` import จาก `use-intl` อยู่แล้ว — รวมเป็นบรรทัดเดียว `import { useLocale, useTranslations } from "use-intl";`)

2. props เพิ่มใน interface และเปลี่ยน `onSubmit`:

```tsx
  /** ชื่อที่ผู้ใช้ตั้งเอง — null/ไม่ส่ง = ใช้ชื่อตั้งต้นของ dataset (ดู `customWidgetTitle`) */
  readonly initialTitle?: LocalizedTitle | null;
  readonly onSubmit: (
    params: WidgetParams,
    display: WidgetDisplay,
    titleI18n: LocalizedTitle | null,
  ) => void;
```

และ destructure `initialTitle` ในพารามิเตอร์ของ component

3. state + reset ตอนเปิด (ใน `useEffect` เดิมที่ seed `values` / `display`):

```tsx
  const locale = useLocale();
  const datasetLabel = useDatasetLabel();
  const [titleEn, setTitleEn] = useState("");
  const [titleTh, setTitleTh] = useState("");
```

ใน `useEffect` เพิ่ม:

```tsx
    setTitleEn(initialTitle?.en ?? "");
    setTitleTh(initialTitle?.th ?? "");
```

4. ค่าที่จะส่ง + การ์ด preview:

```tsx
  const en = titleEn.trim();
  const th = titleTh.trim();
  const isTitleInvalid = !!th && !en;
  const titleI18n: LocalizedTitle | null = en
    ? th
      ? { en, th }
      : { en }
    : null;
  const defaultTitle = datasetLabel(dataset.id, dataset.name);
  const previewTitle = resolveWidgetTitle(
    { dataset_id: dataset.id, title_i18n: titleI18n },
    { locale, datasetName: dataset.name, translatedDatasetName: defaultTitle },
  );
```

5. JSX — เพิ่มบล็อกนี้เป็นลูกตัวแรกของ `<div className="space-y-4">` (ก่อน `<WidgetParamFields`):

```tsx
          <div className="space-y-1.5">
            <h3 className="text-muted-foreground text-micro-legal font-bold tracking-[0.16em] uppercase">
              {t("titleSection")}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="widget-title-en">{t("titleEn")}</Label>
                <Input
                  id="widget-title-en"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder={dataset.name}
                  maxLength={255}
                  disabled={isPending}
                  aria-invalid={isTitleInvalid}
                  aria-describedby={
                    isTitleInvalid ? "widget-title-en-error" : undefined
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="widget-title-th">{t("titleTh")}</Label>
                <Input
                  id="widget-title-th"
                  value={titleTh}
                  onChange={(e) => setTitleTh(e.target.value)}
                  placeholder={locale === "th" ? defaultTitle : undefined}
                  maxLength={255}
                  disabled={isPending}
                />
              </div>
            </div>
            {isTitleInvalid && (
              <p
                id="widget-title-en-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {t("titleEnRequired")}
              </p>
            )}
          </div>
```

(placeholder ช่อง TH ใช้ชื่อแปลเฉพาะตอน UI เป็นไทย — ตอน UI อังกฤษ `defaultTitle` คือชื่ออังกฤษ ใส่ในช่องไทยจะชวนเข้าใจผิด)

6. preview: แทน `title: dataset.name,` ใน `WidgetRouter widget={{…}}` ด้วย `title: previewTitle,`

7. ปุ่ม Save:

```tsx
          <Button
            type="button"
            onClick={() => onSubmit(values, display, titleI18n)}
            disabled={isPending || isTitleInvalid}
          >
```

- [ ] **Step 3: caller — BU**

`bu-widget-section.tsx` import `customWidgetTitle` จาก `./widget-title` และ type `LocalizedTitle` จาก `@/types/dashboard-widget`:

```tsx
  const handleCreateWithParams = (
    params: WidgetParams,
    display: WidgetDisplay,
    titleI18n: LocalizedTitle | null,
  ) => {
    if (!pendingAdd) return;
    createWidget.mutate(
      {
        dataset_id: pendingAdd.id,
        widget_type: defaultWidgetTypeFor(pendingAdd),
        ...(titleI18n ? { title_i18n: titleI18n } : {}),
        params,
        display,
        module: wireModule,
        order_index: nextOrder,
      },
```

(ส่วน `{ onSuccess … }` คงเดิม)

```tsx
  const handleConfigure = (
    params: WidgetParams,
    display: WidgetDisplay,
    titleI18n: LocalizedTitle | null,
  ) => {
    if (!pendingConfig) return;
    const target = pendingConfig;
    updateWidget.mutate(
      { id: target.id, params, display, title_i18n: titleI18n },
```

(ส่ง `title_i18n: null` ตอนแก้เป็นเจตนา — ล้างชื่อที่ตั้งเอง และล้าง title ที่ถูกแช่เป็นชื่อ dataset ไว้ตั้งแต่รุ่นก่อนด้วย)

JSX ของ dialog แก้ไข (ตัวที่มี `initialParams`) เพิ่ม prop:

```tsx
          initialTitle={customWidgetTitle(pendingConfig, configDataset.name)}
```

- [ ] **Step 4: caller — personal**

`routes/dashboard/dashboard-component.tsx` ทำแบบเดียวกัน: `handleCreateWithParams` รับ `titleI18n` แล้ว spread `...(titleI18n ? { title_i18n: titleI18n } : {})` ใน payload, `handleUpdateParams` รับ `titleI18n` แล้วส่ง `{ id: target.id, params, display, title_i18n: titleI18n }`, dialog แก้ไขเพิ่ม `initialTitle={customWidgetTitle(pendingConfig, configDataset.name)}` — import `customWidgetTitle` จาก `@/components/dashboard-widget/widget-title` และ `LocalizedTitle` จาก `@/types/dashboard-widget`

- [ ] **Step 5: static checks + เทสต์เดิม**

Run: `bunx prettier --write components/dashboard-widget/widget-config-dialog.tsx components/dashboard-widget/bu-widget-section.tsx routes/dashboard/dashboard-component.tsx && bun run typecheck && bun run lint && bun test:run`
Expected: ผ่านทั้งหมด (ยกเว้นเทสต์ที่แดงอยู่แล้วบน main — `ap-mock-repository.test.ts` 2 เคส ตาม handoff เดิม; ถ้าแดงเพิ่มนอกจากนี้ต้องแก้)

- [ ] **Step 6: Commit**

```bash
git add components/dashboard-widget/widget-config-dialog.tsx components/dashboard-widget/bu-widget-section.tsx routes/dashboard/dashboard-component.tsx messages/en.json messages/th.json
git commit -m "feat(dashboard): ตั้งชื่อ widget แยกภาษา EN/TH ใน dialog ตั้งค่า"
```

---

## Part E — ตรวจด้วยมือ (ผู้ใช้ตรวจ / ทำร่วมกัน)

### Task 10: ตรวจในเครื่องก่อนเปิด PR

**ข้อควรระวัง:** backend `:4000` ในเครื่องชี้ DB dev ที่ใช้ร่วมกัน — **backup ตาราง 3 ตัวก่อนรัน migration** (`pg_dump -t tb_dashboard_widget_template` ฝั่ง platform และ `-t '*.tb_dashboard_bu_widget' -t '*.tb_dashboard_personal_widget'` ฝั่ง tenant) และขออนุญาตผู้ใช้ก่อนรัน migration / seed บน DB นั้น

- [ ] **Step 1: migration + seed** — รัน migration platform/tenant (หรือ micro-data `cmd/migrate`) แล้ว `bun run db:seed.dashboard-widget-template` สองรอบ: รอบแรกสรุปต้องมี `retitled` > 0 รอบสองต้องเป็น `unchanged` ทั้งหมด (Review Focus #5)
- [ ] **Step 2: curl** (BU = T02, token ของ `admin@zebra.com` ผ่านตัวแปร shell — ห้ามวาง token ลงไฟล์)
  - POST BU widget ด้วย `title_i18n: {en: "A", th: "ก"}` → GET ต้องได้ `title: "A"`, `title_i18n: {en: "A", th: "ก"}`
  - PATCH widget เดิมด้วย `{"title": "B"}` → GET ต้องได้ `title_i18n: {en: "B", th: "ก"}` (Review Focus #1)
  - PATCH `{"title_i18n": {"th": "ก"}}`, `{"title_i18n": {"jp": "x"}}`, ชื่อไทยยาว 256 ตัว → ทั้งหมด 400 (Review Focus #4)
  - PATCH `{"title_i18n": null}` → GET ได้ `title: null`, `title_i18n: null`
- [ ] **Step 3: platform** — สร้าง template `bu_default` สองภาษาใน carmen-platform → deploy ลง T02 (`overwrite`) → ตรวจ `tb_dashboard_bu_widget.title_i18n` ครบ en/th (Review Focus #3)
- [ ] **Step 4: เบราว์เซอร์ FE** (`VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`) สลับ EN/TH:
  - widget ใหม่ที่ไม่ตั้งชื่อ → ชื่อ dataset ตามภาษา
  - widget เก่าที่ title = ชื่อ dataset → หน้าไทยต้องเป็นชื่อแปล (Review Focus #2)
  - ตั้งเฉพาะ EN → แสดง EN ทั้งสองภาษา · ตั้งสองภาษา → สลับตามภาษา · ใส่ TH อย่างเดียว → ปุ่ม Save ปิดพร้อมข้อความเตือน
  - system widget บนหน้า module (เช่น procurement) หลัง seed → ชื่อสลับตามภาษา
- [ ] **Step 5: เปิด PR ทีละรีโป** (ภาษาอังกฤษ) ลำดับ merge/deploy: micro-data + backend-v2 → รัน seed → carmen-platform + FE · UAT/prod ต้อง backup ก่อน migration
