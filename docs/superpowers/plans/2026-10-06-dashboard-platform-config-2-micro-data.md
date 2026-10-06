# Dashboard Platform Config — Plan 2/4: micro-data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้ BU widget มี `module`, จัดลำดับได้, ติดตามสถานะ deploy ต่อ tenant และรับ deploy ชุด default จาก platform ใน transaction เดียว

**Architecture:** เพิ่ม tenant migration `131` (คอลัมน์ `module` + ตาราง `tb_dashboard_bu_widget_deploy`) ทุกการเขียน BU widget ห่อใน GORM transaction ที่ lock แถว deploy แล้วตั้ง `customized_at` endpoint deploy ทำ lock → skip หรือ soft-delete → insert → upsert ใน transaction เดียว

**Tech Stack:** Go 1.24 · gin · GORM v1.25 (`gorm.io/gorm/clause`) · swag

**Spec:** `carmen-inventory-frontend-react/docs/superpowers/specs/2026-10-06-dashboard-platform-config-design.md` (§10 มีผลเหนือส่วนก่อนหน้า) · contract ร่วม: หัวของ Plan 1

**Repo:** `/Users/samutpra/GitHub/carmensoftware-organize/micro-data` · branch `feature/dashboard-platform-config` จาก `main`

## Global Constraints

- **ไม่เขียนเทสต์ใหม่** (preference ของ user) — เทสต์เดิมต้องเขียว; รัน `go build ./... && go vet ./...` ทุก task
- คง `go 1.24.0` ใน `go.mod` — ห้าม `go mod tidy` เปล่า ๆ · ห้ามเพิ่ม dependency
- migration ต้อง idempotent (`IF NOT EXISTS`) เพราะไฟล์ที่แก้จะถูกรันซ้ำตาม checksum · ชื่อ object ไม่ใส่ schema (search_path)
- DDL ของ 131 ต้องตรงกับ Prisma tenant migration `20261006100100_dashboard_bu_widget_module_deploy` (Plan 1 Task 2)
- `widget_type` cast `?::enum_dashboard_widget_type` · jsonb `?::jsonb`
- identity มาจาก query (`bu_code`, `user_id`) · `user_id` ของ BU endpoint เป็น optional — ห้ามเขียน `''` ลงคอลัมน์ uuid
- error JSON `{"error": "..."}` · sentinel ใหม่ต้องเพิ่มใน `respondErr`
- handler ใหม่/แก้ swag annotation → `make swagger` แล้ว commit `api/openapi.{json,yaml}` (CI `make swagger-check`)
- module ที่ใช้ได้: `procurement` `inventory` `product` `config` `vendor-management` `operation-plan` `store-operation` หรือ NULL; query `module=main` = NULL
- local ชี้ dev DB ที่ใช้ร่วม — ตรวจมือกับ BU ทดสอบและ backup ก่อน
- commit message ภาษาไทย

## Review Focus

1. **deploy กับ BU ที่ยังไม่มีแถว deploy** → insert placeholder แล้ว lock ได้ ไม่ใช่ error `record not found` (Task 3 Step 1, Task 4)
2. **deploy โหมด skip กับ BU ที่ customized** → ไม่แตะ widget สักแถว และตอบ `skipped` (Task 4, ตรวจมือ Task 5)
3. **create/update/delete/reorder ล้มกลางทาง** → `customized_at` ต้องไม่ถูกตั้ง (transaction เดียว) (Task 3 Step 3)
4. **`module` ค่าแปลก** (เช่น `foo`) ทั้งใน create และ query → 400 ไม่ใช่เขียนลง DB (Task 2, ตรวจมือ Task 5)
5. **widgets ว่างใน deploy** (platform ยังไม่ตั้ง default) → สำเร็จ ได้ BU ที่ไม่มี widget และ `count: 0` (Task 4, ตรวจมือ Task 5)

---

### Task 1: Tenant migration 131

**Files:**
- Create: `migrations/tenant/131_dash_bu_widget_module.up.sql`
- Create: `migrations/tenant/131_dash_bu_widget_module.down.sql`

- [ ] **Step 1: up**

```sql
-- 131_dash_bu_widget_module.up.sql
-- BU widget ได้ module (NULL = หน้า /dashboard หลัก) + แถว deploy ต่อ tenant สำหรับชุด default จาก platform
-- เจ้าของร่วมกับ backend-v2 prisma-shared-schema-tenant 20261006100100_dashboard_bu_widget_module_deploy — IF NOT EXISTS ทั้งคู่
ALTER TABLE tb_dashboard_bu_widget ADD COLUMN IF NOT EXISTS module VARCHAR(50);
CREATE INDEX IF NOT EXISTS tenant_dashboard_bu_widget_module_idx ON tb_dashboard_bu_widget (module, deleted_at);

CREATE TABLE IF NOT EXISTS tb_dashboard_bu_widget_deploy (
    id INTEGER NOT NULL DEFAULT 1,
    deployed_version INTEGER NOT NULL,
    deployed_at TIMESTAMPTZ(6),
    deployed_by_id UUID,
    customized_at TIMESTAMPTZ(6),
    customized_by_id UUID,
    CONSTRAINT tb_dashboard_bu_widget_deploy_pkey PRIMARY KEY (id),
    CONSTRAINT ck_dashboard_bu_widget_deploy_single CHECK (id = 1)
);

-- BU ที่มี BU widget อยู่ก่อนระบบ deploy = "ปรับเอง" เพื่อให้ skip_customized ไม่ทับ
INSERT INTO tb_dashboard_bu_widget_deploy (id, deployed_version, customized_at)
SELECT 1, 0, now()
WHERE EXISTS (SELECT 1 FROM tb_dashboard_bu_widget WHERE deleted_at IS NULL)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2: down**

```sql
-- 131_dash_bu_widget_module.down.sql
DROP TABLE IF EXISTS tb_dashboard_bu_widget_deploy;
DROP INDEX IF EXISTS tenant_dashboard_bu_widget_module_idx;
ALTER TABLE tb_dashboard_bu_widget DROP COLUMN IF EXISTS module;
```

- [ ] **Step 3: รันกับ BU ทดสอบเดียว แล้วรันซ้ำ**

Run: `make migrate ARGS="-bu T02 -only 131"` สองรอบ
Expected: รอบแรก apply · รอบสองข้าม (tracker) · ไม่มี error (เพิ่มคอลัมน์/ตารางใหม่เท่านั้น ไม่ลบอะไร)

- [ ] **Step 4: Commit**

```bash
git add migrations/tenant/131_dash_bu_widget_module.up.sql migrations/tenant/131_dash_bu_widget_module.down.sql
git commit -m "feat(migration): เพิ่ม module ให้ BU widget และตาราง deploy ของ tenant"
```

---

### Task 2: model + module filter + create/update รับ module

**Files:**
- Modify: `model/dashboard.go` (`DashboardBuWidget` 60-77, `WidgetCreateInput` 105, `WidgetUpdateInput` 117)
- Create: `model/dashboard_deploy.go`
- Modify: `db/widget_repo.go` (`BuFindAll` 23-33, `insertWidget` 152-182)
- Modify: `service/widget_service.go` (sentinel 19-24, `BuFindAll` 163, `BuCreate` 190, `BuUpdate` 205)
- Modify: `controller/dashboard_controller.go` (`buWidgetFindAll`, `respondErr` 499-514)
- Modify: `controller/response.go` (`BuWidgetListResponse` 74)

**Interfaces:**
- Produces:
  - `model.IsValidDashboardModule(m string) bool`
  - `model.DashboardBuWidgetDeploy` (ตาราง `tb_dashboard_bu_widget_deploy`)
  - `WidgetRepo.BuFindAll(ctx, tdb, module *string, mainOnly bool) ([]model.DashboardBuWidget, error)`
  - `WidgetRepo.DeployFind(ctx, tdb) (*model.DashboardBuWidgetDeploy, error)` — ไม่มีแถว = `nil, nil`
  - `service.ErrInvalidModule`
  - `GET /api/dashboard/bu-widgets` ส่ง `deploy_state: {deployed_version, deployed_at, customized_at} | null`

- [ ] **Step 1: model**

ใน `DashboardBuWidget` หลัง `Display`:

```go
	// Module คือหน้าที่ widget ไปแสดง: nil = หน้า /dashboard หลัก หรือชื่อ module dashboard
	Module *string `gorm:"column:module" json:"module"`
```

`WidgetCreateInput` และ `WidgetUpdateInput` เพิ่ม `Module *string `json:"module,omitempty"`` (update: nil = ไม่เปลี่ยน; รอบนี้ไม่รองรับย้ายกลับไป main — FE ไม่มี UI ย้ายหน้า)

ต่อท้าย `model/dashboard.go`:

```go
// dashboardModules คือ module dashboard ที่ BU widget ไปแสดงได้ (nil = หน้าหลัก)
var dashboardModules = map[string]bool{
	"procurement": true, "inventory": true, "product": true, "config": true,
	"vendor-management": true, "operation-plan": true, "store-operation": true,
}

// IsValidDashboardModule reports whether m names a module dashboard.
func IsValidDashboardModule(m string) bool { return dashboardModules[m] }
```

`model/dashboard_deploy.go`:

```go
package model

import "time"

// DashboardBuWidgetDeploy คือแถวเดียวต่อ tenant: สถานะการ deploy ชุด default จาก platform
type DashboardBuWidgetDeploy struct {
	ID              int        `gorm:"column:id;primaryKey" json:"-"`
	DeployedVersion int        `gorm:"column:deployed_version" json:"deployed_version"`
	DeployedAt      *time.Time `gorm:"column:deployed_at" json:"deployed_at"`
	DeployedByID    *string    `gorm:"column:deployed_by_id;type:uuid" json:"deployed_by_id"`
	CustomizedAt    *time.Time `gorm:"column:customized_at" json:"customized_at"`
	CustomizedByID  *string    `gorm:"column:customized_by_id;type:uuid" json:"customized_by_id"`
}

// TableName maps the struct to the tenant deploy table.
func (DashboardBuWidgetDeploy) TableName() string { return "tb_dashboard_bu_widget_deploy" }
```

- [ ] **Step 2: repo**

```go
// BuFindAll lists live BU widgets. module=nil && !mainOnly → every widget; mainOnly → module IS NULL.
func (r *WidgetRepo) BuFindAll(ctx context.Context, tdb *gorm.DB, module *string, mainOnly bool) ([]model.DashboardBuWidget, error) {
	var items []model.DashboardBuWidget
	q := tdb.WithContext(ctx).Where("deleted_at IS NULL")
	switch {
	case mainOnly:
		q = q.Where("module IS NULL")
	case module != nil:
		q = q.Where("module = ?", *module)
	}
	err := q.Order("order_index asc, created_at asc").Find(&items).Error
	return items, err
}

// DeployFind returns the tenant's deploy row, or nil when the BU was never deployed or customised.
func (r *WidgetRepo) DeployFind(ctx context.Context, tdb *gorm.DB) (*model.DashboardBuWidgetDeploy, error) {
	var row model.DashboardBuWidgetDeploy
	err := tdb.WithContext(ctx).Where("id = 1").Take(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

// nullableUUID turns an empty user id into SQL NULL (BU endpoints treat user_id as optional).
func nullableUUID(s string) any {
	if s == "" {
		return nil
	}
	return s
}
```

`insertWidget`: เพิ่ม `module` ใน `cols`, `?` ใน `vals`, `in.Module` ใน `args` — วางต่อจาก `display` ก่อน `created_by_id` ทั้งสามจุด (ลำดับต้องตรงกัน); personal widget ก็ผ่านฟังก์ชันนี้ — `in.Module` เป็น nil จึงเขียน NULL ซึ่ง `tb_dashboard_personal_widget` **ไม่มีคอลัมน์ module** → ใส่ `module` เฉพาะเมื่อ `table == "tb_dashboard_bu_widget"`:

```go
	if table == "tb_dashboard_bu_widget" {
		cols += ", module"
		vals += ", ?"
		args = append(args, in.Module)
	}
```

(วางหลังสร้าง `cols/vals/args` ชุดหลักและก่อนเติม `scopeCol` — ตรวจว่าลำดับ args ตรงกับ placeholder)
ไล่ผู้เรียก `BuFindAll` เดิมทุกจุด (`grep -rn "BuFindAll" .`) ส่ง `nil, false`

- [ ] **Step 3: service**

sentinel: `ErrInvalidModule = errors.New("invalid dashboard module")`

`BuFindAll(ctx, buCode, module string) (any, error)`:
- `""` → ทุกตัว · `"main"` → `mainOnly=true` · อื่น ๆ ต้อง `model.IsValidDashboardModule` ไม่งั้น `ErrInvalidModule`
- อ่าน `DeployFind` แล้วคืน `map[string]any{"items": items, "count": len(items), "deploy_state": deployState(row)}`

```go
// deployState exposes only what the UI needs from the deploy row (nil when never deployed/customised).
func deployState(row *model.DashboardBuWidgetDeploy) any {
	if row == nil {
		return nil
	}
	return map[string]any{
		"deployed_version": row.DeployedVersion,
		"deployed_at":      row.DeployedAt,
		"customized_at":    row.CustomizedAt,
	}
}
```

`BuCreate`/`BuUpdate`: `in.Module != nil && !model.IsValidDashboardModule(*in.Module)` → `ErrInvalidModule`; update เติม `fields["module"] = *in.Module` เมื่อไม่ nil

- [ ] **Step 4: controller**

- `buWidgetFindAll`: ส่ง `c.Query("module")` · swag `@Param module query string false "main | procurement | inventory | …"`
- `respondErr`: เพิ่ม `errors.Is(err, service.ErrInvalidModule)` ในกลุ่ม 400
- `BuWidgetListResponse`: เพิ่ม `DeployState *BuDeployStateDTO `json:"deploy_state"`` โดย `BuDeployStateDTO{DeployedVersion int; DeployedAt *time.Time; CustomizedAt *time.Time}` (json snake_case) — เพื่อ swag เท่านั้น

- [ ] **Step 5: ตรวจ**

Run: `go build ./... && go vet ./... && go test ./... && make swagger`
Expected: ผ่าน; `api/openapi.*` เปลี่ยน

- [ ] **Step 6: Commit**

```bash
git add model db service controller api
git commit -m "feat(dashboard): BU widget มี module และ list ส่ง deploy_state กลับไปด้วย"
```

---

### Task 3: ทุกการเขียน BU widget ตั้ง `customized_at` ใน transaction + reorder

**Files:**
- Modify: `db/widget_repo.go` (+ `DeployLockOrCreate`, `DeployMarkCustomized`, `BuCountLive`, `BuReorder`)
- Modify: `service/widget_service.go` (`BuCreate` 190, `BuUpdate` 205, `BuDelete` 230, + `buWrite`, `BuReorder`)
- Modify: `controller/dashboard_controller.go` (+ route/handler `buWidgetReorder`)

**Interfaces:**
- Produces:
  - `WidgetRepo.DeployLockOrCreate(ctx, tx) (*model.DashboardBuWidgetDeploy, error)`
  - `WidgetRepo.DeployMarkCustomized(ctx, tx, userID string) error`
  - `WidgetService.BuReorder(ctx, buCode, userID string, items []model.WidgetReorderItem) (any, error)` → `{"reordered": n}`
  - route `POST /api/dashboard/bu-widgets/reorder?bu_code=&user_id=` body `{"items":[{"id","order_index"}]}`

- [ ] **Step 1: repo — lock + mark**

```go
// DeployLockOrCreate ensures the tenant's single deploy row exists, then locks it for the current
// transaction so a platform deploy and a BU-admin edit cannot interleave.
func (r *WidgetRepo) DeployLockOrCreate(ctx context.Context, tx *gorm.DB) (*model.DashboardBuWidgetDeploy, error) {
	if err := tx.WithContext(ctx).Exec(
		`INSERT INTO tb_dashboard_bu_widget_deploy (id, deployed_version) VALUES (1, 0) ON CONFLICT (id) DO NOTHING`,
	).Error; err != nil {
		return nil, err
	}
	var row model.DashboardBuWidgetDeploy
	err := tx.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = 1").Take(&row).Error
	return &row, err
}

// DeployMarkCustomized records that a BU admin changed the BU dashboard by hand.
func (r *WidgetRepo) DeployMarkCustomized(ctx context.Context, tx *gorm.DB, userID string) error {
	return tx.WithContext(ctx).Model(&model.DashboardBuWidgetDeploy{}).Where("id = 1").
		Updates(map[string]any{"customized_at": time.Now(), "customized_by_id": nullableUUID(userID)}).Error
}
```

placeholder ที่ insert ตรงนี้ (`deployed_version=0`) แล้วตามด้วย `DeployMarkCustomized` = สถานะ `customized` ถูกต้อง

- [ ] **Step 2: repo — reorder**

```go
// BuCountLive counts live BU widgets among ids (guards reorder against unknown or deleted ids).
func (r *WidgetRepo) BuCountLive(ctx context.Context, tdb *gorm.DB, ids []string) (int, error) {
	var n int64
	err := tdb.WithContext(ctx).Model(&model.DashboardBuWidget{}).
		Where("id IN ? AND deleted_at IS NULL", ids).Count(&n).Error
	return int(n), err
}

// BuReorder writes order_index for each item inside the caller's transaction.
func (r *WidgetRepo) BuReorder(ctx context.Context, tx *gorm.DB, userID string, items []model.WidgetReorderItem) error {
	now := time.Now()
	for _, it := range items {
		if err := tx.WithContext(ctx).Model(&model.DashboardBuWidget{}).Where("id = ?", it.ID).
			Updates(map[string]any{"order_index": it.OrderIndex, "updated_by_id": nullableUUID(userID), "updated_at": now}).Error; err != nil {
			return err
		}
	}
	return nil
}
```

- [ ] **Step 3: service — ห่อทุกการเขียน**

```go
// buWrite runs fn and marks the BU dashboard as customised in one transaction, holding the deploy-row
// lock so a concurrent platform deploy is serialised against this edit.
func (s *WidgetService) buWrite(ctx context.Context, buCode, userID string, fn func(tx *gorm.DB) error) error {
	tdb, err := s.tenant(ctx, buCode)
	if err != nil {
		return err
	}
	return tdb.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if _, err := s.repo.DeployLockOrCreate(ctx, tx); err != nil {
			return err
		}
		if err := fn(tx); err != nil {
			return err
		}
		return s.repo.DeployMarkCustomized(ctx, tx, userID)
	})
}
```

- `BuCreate`: validate เดิม → `buWrite(ctx, buCode, userID, func(tx *gorm.DB) error { id, err = s.repo.BuCreate(ctx, tx, in, userID); return err })`
- `BuUpdate`: อ่านแถวเดิม + validate (นอก tx ได้) → `buWrite` เรียก `s.repo.BuUpdate(ctx, tx, id, fields)`
- `BuDelete`: `BuFindByID` (ไม่พบ → `ErrWidgetNotFound`) → `buWrite` เรียก `s.repo.BuSoftDelete(ctx, tx, id, userID)`
- `BuReorder`: ตรวจแบบ `PersonalReorder` (service 362-388) — list ว่าง / id ว่าง / index ติดลบ → `ErrInvalidWidget`; `BuCountLive` ได้น้อยกว่า `len(items)` → `ErrWidgetNotFound`; แล้ว `buWrite` เรียก `s.repo.BuReorder(ctx, tx, userID, items)`; คืน `map[string]any{"reordered": len(items)}`

ชื่อ field repo ใน service ใช้ตามจริง · repo method เดิมรับ `*gorm.DB` อยู่แล้ว ส่ง `tx` ได้ตรง · `BuSoftDelete` เดิมเขียน `deleted_by_id: userID` ตรง ๆ — เปลี่ยนเป็น `nullableUUID(userID)`

- [ ] **Step 4: controller — route reorder**

`RegisterRoutes` ต่อจาก BU routes: `r.POST("/api/dashboard/bu-widgets/reorder", h.buWidgetReorder)`

```go
// buWidgetReorder godoc
//
//	@Summary	Reorder BU widgets
//	@Tags		dashboard
//	@Param		bu_code	query	string					true	"BU code"
//	@Param		user_id	query	string					false	"acting user"
//	@Param		body	body	WidgetReorderRequest	true	"new order"
//	@Success	200	{object}	WidgetReorderResponse
//	@Failure	400	{object}	ErrorResponse
//	@Failure	404	{object}	ErrorResponse
//	@Router		/api/dashboard/bu-widgets/reorder [post]
func (h *DashboardHTTPHandler) buWidgetReorder(c *gin.Context) {
	buCode, ok := requireQuery(c, "bu_code")
	if !ok {
		return
	}
	var in WidgetReorderRequest
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid JSON: " + err.Error()})
		return
	}
	res, err := h.widgets.BuReorder(c.Request.Context(), buCode, c.Query("user_id"), in.Items)
	h.respond(c, res, err)
}
```

(ใช้ `@Tags` เดียวกับ `personalWidgetReorder`)

- [ ] **Step 5: ตรวจ**

Run: `go build ./... && go vet ./... && go test ./... && make swagger`
Expected: ผ่าน

- [ ] **Step 6: Commit**

```bash
git add db service controller api
git commit -m "feat(dashboard): การแก้ BU widget ทุกแบบตั้งสถานะปรับเองใน transaction และเพิ่ม reorder"
```

---

### Task 4: deploy-state + deploy endpoint

**Files:**
- Create: `service/bu_widget_deploy.go`
- Modify: `db/widget_repo.go` (+ `BuSoftDeleteAll`, `DeployMarkDeployed`)
- Modify: `controller/dashboard_controller.go` (+ 2 route/handler, `respondErr`)
- Modify: `controller/response.go` (+ `DeployRequest`, `DeployResponse`, `DeployStateResponse`)

**Interfaces:**
- Consumes: `DeployLockOrCreate` (Task 3), `BuCreate` repo ที่รับ module (Task 2)
- Produces:
  - `GET /api/dashboard/bu-widgets/deploy-state?bu_code=` → `{"deploy": null | DashboardBuWidgetDeploy}`
  - `POST /api/dashboard/bu-widgets/deploy?bu_code=&user_id=` body `DeployRequest` → `{"result":"deployed","count":n}` | `{"result":"skipped"}`

- [ ] **Step 1: types (`controller/response.go`)**

```go
// DeployRequest is the platform's BU-default set pushed into one tenant.
type DeployRequest struct {
	Mode    string                    `json:"mode"`    // skip_customized | overwrite
	Version int                       `json:"version"` // platform BU-default version being deployed
	Widgets []model.WidgetCreateInput `json:"widgets"`
}

// DeployResponse reports what happened to the tenant.
type DeployResponse struct {
	Result string `json:"result"` // deployed | skipped
	Count  int    `json:"count,omitempty"`
}

// DeployStateResponse wraps the tenant deploy row (null when never deployed or customised).
type DeployStateResponse struct {
	Deploy *model.DashboardBuWidgetDeploy `json:"deploy"`
}
```

- [ ] **Step 2: repo**

```go
// BuSoftDeleteAll soft-deletes every live BU widget; soft so an overwritten customisation can be recovered by hand.
func (r *WidgetRepo) BuSoftDeleteAll(ctx context.Context, tx *gorm.DB, userID string) error {
	return tx.WithContext(ctx).Model(&model.DashboardBuWidget{}).Where("deleted_at IS NULL").
		Updates(map[string]any{"deleted_at": time.Now(), "deleted_by_id": nullableUUID(userID)}).Error
}

// DeployMarkDeployed records a completed deploy and clears the customised flag.
func (r *WidgetRepo) DeployMarkDeployed(ctx context.Context, tx *gorm.DB, version int, userID string) error {
	return tx.WithContext(ctx).Model(&model.DashboardBuWidgetDeploy{}).Where("id = 1").Updates(map[string]any{
		"deployed_version": version, "deployed_at": time.Now(), "deployed_by_id": nullableUUID(userID),
		"customized_at": nil, "customized_by_id": nil,
	}).Error
}
```

(`Updates(map)` เขียน `nil` เป็น NULL ได้ ต่างจาก struct — ยืนยันในตรวจมือ Task 5)

- [ ] **Step 3: service (`service/bu_widget_deploy.go`)**

```go
package service

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/CarmenSoftware/micro-data/model"
)

// ErrInvalidDeploy is returned for an unknown mode or a negative version.
var ErrInvalidDeploy = errors.New("invalid deploy request")

// BuDeployState returns the tenant's deploy row (nil when never deployed or customised).
func (s *WidgetService) BuDeployState(ctx context.Context, buCode string) (any, error) {
	tdb, err := s.tenant(ctx, buCode)
	if err != nil {
		return nil, err
	}
	row, err := s.repo.DeployFind(ctx, tdb)
	if err != nil {
		return nil, err
	}
	return map[string]any{"deploy": row}, nil
}

// BuDeploy replaces the BU widget set with the platform default in one transaction. With
// mode=skip_customized a BU whose admin edited its dashboard is left untouched.
func (s *WidgetService) BuDeploy(ctx context.Context, buCode, userID, mode string, version int, widgets []model.WidgetCreateInput) (any, error) {
	if err := s.validateDeploy(mode, version, widgets); err != nil {
		return nil, err
	}
	tdb, err := s.tenant(ctx, buCode)
	if err != nil {
		return nil, err
	}
	result := map[string]any{"result": "skipped"}
	err = tdb.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		row, err := s.repo.DeployLockOrCreate(ctx, tx)
		if err != nil {
			return err
		}
		if mode == "skip_customized" && row.CustomizedAt != nil {
			return nil
		}
		if err := s.replaceBuWidgets(ctx, tx, userID, widgets); err != nil {
			return err
		}
		if err := s.repo.DeployMarkDeployed(ctx, tx, version, userID); err != nil {
			return err
		}
		result = map[string]any{"result": "deployed", "count": len(widgets)}
		return nil
	})
	return result, err
}

// replaceBuWidgets soft-deletes the current set and inserts the new one inside tx.
func (s *WidgetService) replaceBuWidgets(ctx context.Context, tx *gorm.DB, userID string, widgets []model.WidgetCreateInput) error {
	if err := s.repo.BuSoftDeleteAll(ctx, tx, userID); err != nil {
		return err
	}
	for _, w := range widgets {
		if _, err := s.repo.BuCreate(ctx, tx, w, userID); err != nil {
			return err
		}
	}
	return nil
}

// validateDeploy checks the whole request before any write so a BU is never left with half a set.
func (s *WidgetService) validateDeploy(mode string, version int, widgets []model.WidgetCreateInput) error {
	if (mode != "skip_customized" && mode != "overwrite") || version < 0 {
		return ErrInvalidDeploy
	}
	for _, w := range widgets {
		if w.Module != nil && !model.IsValidDashboardModule(*w.Module) {
			return ErrInvalidModule
		}
		if err := s.validateCreate(w); err != nil {
			return err
		}
	}
	return nil
}
```

ปรับ import path ให้ตรงกับ module ใน `go.mod` · ใช้ลายเซ็น `validateCreate` จริง (service L51) — ถ้ามันรับ argument อื่นด้วย ให้ส่งตามนั้น
BU ที่ไม่เคยมีแถว deploy → `DeployLockOrCreate` สร้างแถว `customized_at = NULL` → ไม่ skip (ถูกต้อง: `never` ได้ default)

- [ ] **Step 4: controller**

```go
	r.GET("/api/dashboard/bu-widgets/deploy-state", h.buWidgetDeployState)
	r.POST("/api/dashboard/bu-widgets/deploy", h.buWidgetDeploy)
```

วางก่อน `r.GET("/api/dashboard/bu-widgets/:id", …)` · handler: `requireQuery(c, "bu_code")` → (deploy: bind `DeployRequest`) → service → `h.respond`
swag: `@Router /api/dashboard/bu-widgets/deploy-state [get]` (`@Success 200 {object} DeployStateResponse`) และ `/api/dashboard/bu-widgets/deploy [post]` (`@Param body body DeployRequest true`, `@Success 200 {object} DeployResponse`)
`respondErr`: เพิ่ม `ErrInvalidDeploy` ในกลุ่ม 400

- [ ] **Step 5: ตรวจ**

Run: `go build ./... && go vet ./... && go test ./... && make swagger`
Expected: ผ่าน

- [ ] **Step 6: Commit**

```bash
git add db service controller api
git commit -m "feat(dashboard): เพิ่ม endpoint deploy ชุด default ของ BU widget และดูสถานะ deploy"
```

---

### Task 5: README + ตรวจมือ + PR

**Files:**
- Modify: `README.md` (ตาราง endpoint และบรรทัดที่บอกว่า widget DDL อยู่ที่ backend-v2 อย่างเดียว)

- [ ] **Step 1: README** — เพิ่ม `reorder`, `deploy-state`, `deploy`, query `module` ของ list และบอกว่า migration 131 เป็นเจ้าของร่วมกับ Prisma tenant

- [ ] **Step 2: ตรวจมือกับ BU ทดสอบ** (backup `tb_dashboard_bu_widget` และ `tb_dashboard_bu_widget_deploy` ของ BU นั้นก่อน; ถ้า T02 มี widget จริงให้ใช้ BU ทดสอบอื่น)

```bash
T=(-H "x-internal-token: $INTERNAL_RPC_SECRET" -H 'Content-Type: application/json')
B=http://localhost:${HTTP_PORT}
BU=T02
curl -s "${T[@]}" "$B/api/dashboard/bu-widgets/deploy-state?bu_code=$BU" | jq .
W='[{"module":null,"dataset_id":"workflow.cn-pending-approval","widget_type":"kpi","title":"CN","order_index":0},
    {"module":"procurement","dataset_id":"procurement.pr-by-status","widget_type":"pie","title":"PR","order_index":0}]'
curl -s "${T[@]}" -X POST "$B/api/dashboard/bu-widgets/deploy?bu_code=$BU&user_id=$USER_ID" \
  -d "{\"mode\":\"overwrite\",\"version\":1,\"widgets\":$W}" | jq .                          # deployed, count 2
curl -s "${T[@]}" "$B/api/dashboard/bu-widgets?bu_code=$BU&module=main" | jq '.count, .deploy_state'   # 1, customized_at null
ID=$(curl -s "${T[@]}" "$B/api/dashboard/bu-widgets?bu_code=$BU&module=main" | jq -r '.items[0].id')
curl -s "${T[@]}" -X PATCH "$B/api/dashboard/bu-widgets/$ID?bu_code=$BU&user_id=$USER_ID" -d '{"title":"x"}' | jq .
curl -s "${T[@]}" "$B/api/dashboard/bu-widgets/deploy-state?bu_code=$BU" | jq '.deploy.customized_at'  # มีค่า
curl -s "${T[@]}" -X POST "$B/api/dashboard/bu-widgets/deploy?bu_code=$BU&user_id=$USER_ID" \
  -d "{\"mode\":\"skip_customized\",\"version\":2,\"widgets\":$W}" | jq .                    # skipped
curl -s "${T[@]}" -X POST "$B/api/dashboard/bu-widgets/deploy?bu_code=$BU&user_id=$USER_ID" \
  -d '{"mode":"overwrite","version":2,"widgets":[]}' | jq .                                  # deployed, count 0
curl -s "${T[@]}" "$B/api/dashboard/bu-widgets/deploy-state?bu_code=$BU" | jq '.deploy'      # version 2, customized_at null
curl -s "${T[@]}" "$B/api/dashboard/bu-widgets?bu_code=$BU&module=foo" | jq .                # 400 invalid dashboard module
curl -s "${T[@]}" -X POST "$B/api/dashboard/bu-widgets/reorder?bu_code=$BU" -d '{"items":[]}' | jq .   # 400
```

Expected: ตามคอมเมนต์ทุกบรรทัด · จบแล้วคืนข้อมูล BU จาก backup

- [ ] **Step 3: ตรวจผ่าน gateway** (เมื่อ Plan 1 รันอยู่ในเครื่องด้วย)

```bash
H=(-H "Authorization: Bearer $TOKEN" -H "x-app-id: $APP_ID" -H 'Content-Type: application/json')
V=$(curl -s "${H[@]}" localhost:4000/api-system/dashboard-templates/bu-default/version | jq '.data.version')
curl -s "${H[@]}" -X POST localhost:4000/api-system/dashboard-templates/deploy/$BU -d "{\"mode\":\"overwrite\",\"expected_version\":$V}" | jq .
curl -s "${H[@]}" localhost:4000/api-system/dashboard-templates/deploy/$BU/status | jq .     # status current
```

- [ ] **Step 4: Commit + PR** (ภาษาอังกฤษ, ห้าม squash) — PR ระบุว่าต้อง deploy คู่กับ backend-v2 PR (Plan 1) และ `deploy.sh` รัน migrate ก่อน restart

```bash
git add README.md
git commit -m "docs(readme): อัปเดต endpoint ของ BU widget และเจ้าของร่วมของ migration 131"
```
