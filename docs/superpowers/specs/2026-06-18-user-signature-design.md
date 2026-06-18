# User Signature — Design Spec

**Date:** 2026-06-18
**Status:** Approved (design); implementation pending
**Scope:** Phase 1 — capture a user signature (upload image OR draw on screen) and store it in the user profile. Reusing the stored signature inside transactions/documents is explicitly **out of scope** for this spec (a follow-up phase).

## Goal

Let a user set their personal signature, captured either by:

- **Uploading** an image file (PNG/JPEG/WebP), or
- **Drawing** on screen (mouse / touch / stylus) and converting the drawing to an image.

The signature is stored once per user in their profile (like an avatar), displayed back on the profile, and removable. It is stored as a transparent-background PNG so a later phase can overlay it on documents.

## Repositories

- **Frontend:** `carmen-inventory-frontend-react` (this repo) — Vite + React Router SPA.
- **Backend:** `../carmen-turborepo-backend-v2` — NestJS turborepo (gateway + microservices, MinIO storage).

Both are implemented in this work. The design mirrors the existing **avatar** feature 1:1 on both sides — no new infrastructure.

## Architecture Overview

```
Frontend (carmen-inventory-frontend-react)
  SignatureDialog (Tabs: Upload | Draw)
    • Upload tab → pick file → validate → preview
    • Draw tab   → react-signature-canvas → export PNG (transparent, trimmed)
    both paths → Blob (image/png) → File
        │
    useUploadUserSignature()  → FormData field "signature"
        │  POST /api/proxy/api/user/profile/signature
        ▼
Backend (carmen-turborepo-backend-v2 / backend-gateway)
  POST   /api/user/profile/signature   (upload, replaces existing)
  DELETE /api/user/profile/signature   (remove)
  GET    /api/user/profile  →  + signature_url
    Multer → validateImageUpload → micro-file (MinIO)
    → signature_file_token stored in tb_user_profile
    → presigned URL (1 hr) resolved when reading profile
```

### Key principles

- **One signature per user**, stored in the profile; uploading a new one replaces the old (same as avatar).
- Stored as **PNG with transparent background** (trimmed) so it can later be overlaid on documents.
- New `signature_file_token` column/field, kept separate from `avatar_file_token`.
- Reuses all existing infra: MinIO storage, presigned-URL resolution, `KeycloakGuard`, `AppIdGuard`. **No new infra.**

### Alternative considered (rejected)

Storing the signature as base64 directly in the DB row. Simpler, but bloats the row, is inconsistent with the avatar pattern, and forgoes presigned-URL caching/CDN benefits. Rejected in favor of mirroring avatar.

## Frontend Design

### Files (new / modified) under `routes/profile/`

| File | Status | Responsibility |
|------|--------|----------------|
| `_components/signature-dialog.tsx` | new | Main dialog with two Tabs (Upload / Draw); manages flow → produces a PNG `File` → calls mutation |
| `_components/signature-draw-pad.tsx` | new | Wraps `react-signature-canvas`; Clear button, guide line, exports transparent trimmed PNG |
| `_components/signature-upload-input.tsx` | new | File picker → `validateImageFile()` (reuse `lib/image-upload.ts`) → preview |
| `_components/signature-form-schema.ts` | new (if needed) | Constants: allowed MIME, max size for signatures |
| `_components/user-profile-details.tsx` | modified | Show current signature (read-only) |
| `_components/user-profile-setting.tsx` | modified | "Signature" section — preview + "Add/Edit" (opens dialog) + "Remove" button |

### Hooks — `hooks/use-profile.ts`

- `useUploadUserSignature()` — mutation; `FormData.append("signature", file)` → `POST` signature endpoint → invalidate profile query (mirrors `useUploadUserAvatar`).
- `useDeleteUserSignature()` — mutation; `DELETE` signature endpoint → invalidate profile query.

### Types — `types/profile.ts`

- Add `UserProfile.signature_url: string | null` (presigned URL for display).

### Endpoint constant — `constant/api-endpoints.ts`

- `PROFILE_SIGNATURE: "/api/proxy/api/user/profile/signature"`

### Dialog UX flow

1. Click "Add/Edit signature" → open `SignatureDialog`.
2. **Upload** tab: pick PNG/JPEG/WebP → validate (within size limit) → preview.
3. **Draw** tab: draw on canvas (touch/stylus/mouse) → Clear button to restart.
4. **Save** → convert the active path to a PNG `File` → `useUploadUserSignature.mutate(file)` → success toast → close dialog → profile refreshes.
5. **Remove** (on the setting page, not in the dialog) → confirm via `AlertDialog` → `useDeleteUserSignature`.

### i18n

Add keys to `messages/{en,th}.json` namespace `profile` (signature, addSignature, drawSignature, uploadSignature, clearSignature, removeSignature, signatureUpdated, signatureRemoved, etc.). All strings via `useTranslations()`.

### New dependency

`react-signature-canvas` (+ `@types/react-signature-canvas`) — frontend only. Smooth strokes, touch/stylus support, PNG export, clear.

## Backend Design (`carmen-turborepo-backend-v2`)

### 1. Database schema + migration

`packages/prisma-shared-schema-platform/prisma/schema.prisma` → model `tb_user_profile`:

```prisma
signature_file_token String? @db.VarChar   // added next to avatar_file_token
```

New migration `prisma/migrations/<timestamp>_add_user_signature_file_token/migration.sql`:

```sql
ALTER TABLE "tb_user_profile"
  ADD COLUMN IF NOT EXISTS "signature_file_token" VARCHAR;
```

> `tb_user_profile.doc_version` is **not** touched — file upload does not use OCC (same as avatar).

### 2. Controller — `apps/backend-gateway/src/application/user/user.controller.ts` (mirror avatar 1:1)

| Endpoint | Guards / Interceptor | Behavior |
|----------|----------------------|----------|
| `POST /api/user/profile/signature` | `KeycloakGuard` + `AppIdGuard('user.uploadSignature')` + `FileInterceptor('signature')` | `validateImageUpload(file)` → `userService.uploadSignature(file, user_id)` → returns `{ file_token, url, expires_at }` |
| `DELETE /api/user/profile/signature` | `KeycloakGuard` + `AppIdGuard('user.deleteSignature')` | Delete existing file + clear `signature_file_token` |

### 3. Service — `apps/backend-gateway/src/application/user/user.service.ts`

- `uploadSignature(file, user_id)` — delete existing file first (if any) → `files.upload-legacy` (folder `users/${user_id}/signature`) → store `signature_file_token` → return presigned URL.
- `deleteSignature(user_id)` — `files.delete` + clear token.
- `resolveSignatureUrl(token)` — reuse the same pattern as `resolveAvatarUrl`.

### 4. Modify `GET /api/user/profile` (existing controller + service)

- Resolve `signature_file_token` → presigned URL → set `data.signature_url`.

### 5. Response DTO — `apps/backend-gateway/src/application/user/swagger/response.ts`

- Add `signature_url?: string | null` to `UserProfileResponseDto`.
- New `swagger/upload-signature.dto.ts`: `UploadSignatureBodyDto`, `UploadSignatureResponseDto`.

### 6. Validation

Reuse existing `common/helpers/image-upload.validator.ts` (jpeg/png/webp ≤ 5 MB, ≤ 2048×2048) — already covers signatures, no new validator.

### 7. AppId permission scope

Register new scopes `user.uploadSignature` / `user.deleteSignature`, following wherever the avatar scope (`user.uploadAvatar`) is registered.

## Error Handling

| Case | Handling |
|------|----------|
| Bad file size/MIME (frontend) | `validateImageFile()` returns error → shown under input, no request sent |
| Bad file size/MIME (backend) | `validateImageUpload` throws `BadRequestException` → http-client → `ApiError` → `toast.error()` |
| Empty drawing + Save | Save button disabled until a stroke exists (`signaturePad.isEmpty()`) |
| Upload fails (network/500) | Toast error, dialog stays open, retry possible |
| Presigned URL expired | Profile query refetches a fresh URL (same as avatar) |
| Backend not yet deployed | UI degrades gracefully — toast error on action, no crash |

## Testing

### Frontend (Vitest)

- `signature-draw-pad` — exports a PNG; `isEmpty` at start; Clear resets.
- `signature-upload-input` — rejects wrong type / oversized; previews valid file.
- `use-profile` — `useUploadUserSignature` sends FormData field `"signature"` and invalidates the query; `useDeleteUserSignature` issues DELETE. Mock `httpClient` per existing test pattern.

### Backend (Jest)

- `user.service.spec` — `uploadSignature` deletes existing first, stores token, returns url; `deleteSignature` clears token.
- Controller — guards + `FileInterceptor('signature')` wired correctly.

### Gate

`bunx tsc --noEmit && bun test:run` (frontend) and backend build/test must be green; `bun run lint` passes.

## Build Order

Frontend works even if backend is incomplete (degrades gracefully), but recommended order:

1. **Backend** — schema + migration → service → controller → DTO → permission scope → tests.
2. **Frontend types/hooks** — `types/profile.ts`, `api-endpoints.ts`, `use-profile.ts` hooks.
3. **Frontend draw/upload primitives** — `signature-draw-pad`, `signature-upload-input` (+ install `react-signature-canvas`).
4. **Frontend dialog** — `signature-dialog.tsx` combining both paths.
5. **Frontend integration** — wire into `user-profile-setting` + `user-profile-details`, i18n strings.
6. **End-to-end test** against local gateway (:4000), account `admin@zebra.com`.

## Out of Scope (future phase)

- Overlaying / rendering the stored signature inside transaction documents (PO, GRN, approvals, etc.).
- Per-document ad-hoc signing.
- Multiple signatures per user.
