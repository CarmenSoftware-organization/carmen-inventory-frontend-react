# User Signature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user set a personal signature — by uploading an image or drawing on screen — stored once in their profile (mirroring the avatar feature), displayed back and removable.

**Architecture:** Mirror the existing **avatar** feature 1:1 on both repos. Frontend adds a `SignatureDialog` (Upload / Draw tabs) that produces a PNG `File` and posts it via React Query mutations. Backend adds `signature_file_token` to `tb_user_profile`, three gateway endpoints (`POST`/`GET`/`DELETE /api/user/profile/signature`) that orchestrate micro-file (MinIO) + micro-business, and enriches `GET /api/user/profile` with `signature_url`. No new infrastructure.

**Tech Stack:** Frontend — Vite + React 19 + React Router 7, TanStack Query, react-hook-form, `react-signature-canvas` (new dep), Vitest. Backend — NestJS, Prisma (Postgres), microservices over TCP, MinIO, Jest.

## Global Constraints

- **Two repos.** Frontend = this repo (`carmen-inventory-frontend-react`). Backend = `../carmen-turborepo-backend-v2`. Every task states which repo it touches.
- **Signature is stored as PNG.** Drawn signatures export transparent-background PNG (`image/png`). Uploaded files may be png/jpeg/webp (backend re-validates).
- **One signature per user.** Upload replaces the previous file (delete-old-then-upload, same as avatar). Delete is idempotent.
- **No OCC for the file field.** `tb_user_profile.doc_version` is NOT touched by signature upload/delete (avatar does not touch it either).
- **Field/form name is `signature`** everywhere: multipart field, `FileInterceptor('signature')`, FormData key.
- **All frontend user-facing strings via `useTranslations("profile")`** with keys added to BOTH `messages/en.json` and `messages/th.json`.
- **Gateway response uses `.passthrough()`** (`UserProfileResponseSchema`), so `signature_url` flows through without a serializer change — but the field token must be removed from `user_info` before responding (mirror avatar).
- **Frontend verify gate:** `bunx tsc --noEmit && bun run lint && bun test:run` must be clean.
- **Backend verify gate:** `bun run build` (or `pnpm -F backend-gateway build`) + `jest` for the gateway must be clean; `bunx prisma generate` after schema change.

---

## File Structure

**Backend (`../carmen-turborepo-backend-v2`):**
- Modify `packages/prisma-shared-schema-platform/prisma/schema.prisma` — add `signature_file_token` column.
- Create `packages/prisma-shared-schema-platform/prisma/migrations/<ts>_add_user_signature_file_token/migration.sql`.
- Modify `apps/micro-business/src/authen/auth/auth.service.ts` — select + update the new column.
- Modify `apps/micro-business/src/authen/auth/auth.controller.ts` — accept the new column in update payload type.
- Create `apps/backend-gateway/src/application/user/swagger/upload-signature.dto.ts` — request/response DTOs.
- Modify `apps/backend-gateway/src/application/user/user.service.ts` — `uploadSignature` / `getSignature` / `deleteSignature` / `resolveSignatureUrl`.
- Modify `apps/backend-gateway/src/application/user/user.controller.ts` — 3 endpoints + enrich `GET /profile`.
- Modify `apps/backend-gateway/src/application/user/user.service.spec.ts` — service tests.
- Regenerate `apps/backend-gateway/src/platform/applications/app-api-catalog.generated.ts` via script.
- Modify `packages/prisma-shared-schema-platform/prisma/seed.application.ts` — add scopes to mobile-app allowlist.

**Frontend (this repo):**
- Modify `constant/api-endpoints.ts` — `PROFILE_SIGNATURE`.
- Modify `types/profile.ts` — `signature_url` on `UserProfile`.
- Modify `hooks/use-profile.ts` — `useUploadUserSignature`, `useDeleteUserSignature`, expose `signatureUrl`.
- Create `hooks/__tests__/use-profile-signature.test.ts`.
- Create `routes/profile/_components/signature-pad.tsx` — draw canvas wrapper.
- Create `routes/profile/_components/signature-dialog.tsx` — Upload/Draw tabs → `File`.
- Create `routes/profile/_components/__tests__/signature-dialog.test.tsx`.
- Modify `routes/profile/_components/user-profile-setting.tsx` — signature section + dialog wiring.
- Modify `routes/profile/_components/user-profile-details.tsx` — read-only signature display.
- Modify `messages/en.json` and `messages/th.json` — `profile` keys.

---

## BACKEND

### Task 1: Add `signature_file_token` column + migration

**Repo:** `../carmen-turborepo-backend-v2`

**Files:**
- Modify: `packages/prisma-shared-schema-platform/prisma/schema.prisma:583` (model `tb_user_profile`)
- Create: `packages/prisma-shared-schema-platform/prisma/migrations/20260618093000_add_user_signature_file_token/migration.sql`

**Interfaces:**
- Produces: column `tb_user_profile.signature_file_token` (nullable `VARCHAR`) consumed by Tasks 2, 4, 5.

- [ ] **Step 1: Add the column to the Prisma model**

In `packages/prisma-shared-schema-platform/prisma/schema.prisma`, in `model tb_user_profile`, add the line directly under `avatar_file_token`:

```prisma
  avatar_file_token String? @db.VarChar
  signature_file_token String? @db.VarChar
```

- [ ] **Step 2: Create the migration SQL**

Create `packages/prisma-shared-schema-platform/prisma/migrations/20260618093000_add_user_signature_file_token/migration.sql`:

```sql
-- Add nullable signature file token to user profile (mirrors avatar_file_token)
ALTER TABLE "tb_user_profile"
  ADD COLUMN IF NOT EXISTS "signature_file_token" VARCHAR;
```

- [ ] **Step 3: Regenerate the Prisma client**

Run (from repo root): `bunx prisma generate --schema packages/prisma-shared-schema-platform/prisma/schema.prisma`
Expected: "Generated Prisma Client" with no errors. (Applying the migration to a live DB happens at deploy via the normal migrate flow; generation is enough to compile.)

- [ ] **Step 4: Commit**

```bash
git add packages/prisma-shared-schema-platform/prisma/schema.prisma packages/prisma-shared-schema-platform/prisma/migrations/20260618093000_add_user_signature_file_token/
git commit -m "feat(db): add signature_file_token to tb_user_profile"
```

---

### Task 2: Carry `signature_file_token` through micro-business profile read/update

**Repo:** `../carmen-turborepo-backend-v2`

The gateway reads the token from `data.user_info.signature_file_token` (via `auth.get-user-profile`) and writes it via `auth.update-user-profile`. Both handlers must know the field.

**Files:**
- Modify: `apps/micro-business/src/authen/auth/auth.service.ts:1717` (profile `select`) and `:2289` (update `updateData` type) and `:2409` (event log block)
- Modify: `apps/micro-business/src/authen/auth/auth.controller.ts:375` (`updateData` type)

**Interfaces:**
- Consumes: column from Task 1.
- Produces: `auth.get-user-profile` returns `user_info.signature_file_token`; `auth.update-user-profile` accepts `data.signature_file_token: string | null`. Consumed by Tasks 4 & 5.

- [ ] **Step 1: Add the column to the profile `select`**

In `apps/micro-business/src/authen/auth/auth.service.ts`, in the `tb_user_profile.findFirst` select (~line 1712), add under `avatar_file_token: true`:

```typescript
      select: {
        firstname: true,
        middlename: true,
        lastname: true,
        telephone: true,
        avatar_file_token: true,
        signature_file_token: true,
      },
```

- [ ] **Step 2: Accept the field in `updateUserProfile`'s `updateData` type**

In the same file, in `updateUserProfile(...)`'s `updateData` parameter type (~line 2289), add:

```typescript
    updateData: {
      alias_name?: string;
      firstname?: string;
      middlename?: string;
      lastname?: string;
      telephone?: string;
      avatar_file_token?: string | null;
      signature_file_token?: string | null;
    },
```

> The update body is assembled as `const { alias_name, ...profileData } = updateData;` then written with `data: profileData`. Because `signature_file_token` is a real column, it is persisted automatically — no further mapping needed.

- [ ] **Step 3: Add an audit-log branch for signature changes (mirror avatar)**

In the same file, immediately AFTER the existing `if (profileData.avatar_file_token !== undefined) { ... }` block (ends ~line 2433), add:

```typescript
      if (profileData.signature_file_token !== undefined) {
        const ctx = getAuditContext();
        if (ctx) {
          const oldToken = existingProfile.signature_file_token;
          const newToken = profileData.signature_file_token;
          const eventType =
            newToken === null
              ? 'user.signature.deleted'
              : 'user.signature.uploaded';
          await this.logEvents.logPlatformEvent(
            'update',
            'tb_user_profile',
            existingProfile.id,
            ctx,
            { signature_file_token: oldToken },
            { signature_file_token: newToken },
            {
              event_type: eventType,
              user_id: userId,
              file_token: newToken ?? oldToken,
            },
          );
        }
      }
```

> `existingProfile` is the record fetched earlier in the method (same one used for `avatar_file_token`). If `existingProfile` is typed and does not yet expose `signature_file_token`, the Prisma client regenerated in Task 1 makes it available; rerun `bunx prisma generate` if the type is stale.

- [ ] **Step 4: Accept the field in the controller payload type**

In `apps/micro-business/src/authen/auth/auth.controller.ts` (~line 370), extend the `updateData` type:

```typescript
    const updateData: {
      firstname?: string;
      middlename?: string;
      lastname?: string;
      telephone?: string;
      avatar_file_token?: string | null;
      signature_file_token?: string | null;
    } = payload.data;
```

- [ ] **Step 5: Type-check micro-business**

Run: `cd ../carmen-turborepo-backend-v2 && bunx tsc -p apps/micro-business/tsconfig.json --noEmit` (or the repo's configured build for micro-business).
Expected: no errors referencing `signature_file_token`.

- [ ] **Step 6: Commit**

```bash
git add apps/micro-business/src/authen/auth/auth.service.ts apps/micro-business/src/authen/auth/auth.controller.ts
git commit -m "feat(profile): carry signature_file_token through profile read/update"
```

---

### Task 3: Gateway signature DTOs

**Repo:** `../carmen-turborepo-backend-v2`

**Files:**
- Create: `apps/backend-gateway/src/application/user/swagger/upload-signature.dto.ts`

**Interfaces:**
- Produces: `UploadSignatureBodyDto`, `UploadSignatureResponseDto`, `GetSignatureResponseDto` — consumed by Task 5 (controller).

- [ ] **Step 1: Create the DTO file (mirror `upload-avatar.dto.ts`)**

Create `apps/backend-gateway/src/application/user/swagger/upload-signature.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';

/**
 * Multipart form-data body for uploading a user signature image
 * เนื้อหาแบบฟอร์ม multipart สำหรับอัปโหลดรูปลายเซ็นของผู้ใช้
 */
export class UploadSignatureBodyDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Signature image (png/jpeg/webp, max 5MB, up to 2048x2048). Drawn signatures are transparent PNG.',
  })
  signature: unknown;
}

/**
 * Response shape returned after a successful signature upload
 * รูปแบบการตอบกลับหลังจากอัปโหลดลายเซ็นสำเร็จ
 */
export class UploadSignatureResponseDto {
  @ApiProperty({
    example: 'users/<userId>/signature/1747654321-abc-123.png',
    description: 'Token referencing the stored signature in micro-file/MinIO',
  })
  file_token: string;

  @ApiProperty({
    example: 'https://minio.example.com/...?X-Amz-...',
    description: 'Presigned URL for direct download (1-hour expiry)',
  })
  url: string;

  @ApiProperty({
    example: '2026-05-20T13:00:00.000Z',
    description: 'ISO timestamp when the presigned URL expires',
  })
  expires_at: string;
}

/**
 * Response shape for the get-signature endpoint (nullable presigned URL + expiry)
 * รูปแบบการตอบกลับสำหรับ endpoint ดึงลายเซ็น
 */
export class GetSignatureResponseDto {
  @ApiProperty({
    nullable: true,
    example: 'https://minio.example.com/...?X-Amz-...',
    description: 'Presigned download URL (1-hour expiry); null if no signature or resolution failed',
  })
  url: string | null;

  @ApiProperty({
    nullable: true,
    example: '2026-05-20T13:00:00.000Z',
    description: 'ISO timestamp when the presigned URL expires; null if no signature',
  })
  expires_at: string | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend-gateway/src/application/user/swagger/upload-signature.dto.ts
git commit -m "feat(gateway): add signature upload/get DTOs"
```

---

### Task 4: Gateway service — upload / get / delete / resolve signature

**Repo:** `../carmen-turborepo-backend-v2`

**Files:**
- Modify: `apps/backend-gateway/src/application/user/user.service.ts` (append methods after `deleteAvatar`, before the final class `}`)
- Test: `apps/backend-gateway/src/application/user/user.service.spec.ts`

**Interfaces:**
- Consumes: `auth.get-user-profile` returning `user_info.signature_file_token` (Task 2); `auth.update-user-profile` accepting `data.signature_file_token` (Task 2).
- Produces:
  - `uploadSignature(file: Express.Multer.File, user_id: string): Promise<Result<{ file_token: string; url: string; expires_at: string }>>`
  - `getSignature(user_id: string): Promise<Result<{ url: string | null; expires_at: string | null }>>`
  - `deleteSignature(user_id: string): Promise<Result<void>>`
  - `resolveSignatureUrl(token: string | null | undefined): Promise<{ url: string; expires_at: string } | null>`
  - Consumed by Task 5 (controller).

- [ ] **Step 1: Write the failing service test**

In `apps/backend-gateway/src/application/user/user.service.spec.ts`, add a new `describe` block (after the existing `getPermission` describe, before the closing `});` of `describe('UserService')`):

```typescript
  describe('signature', () => {
    const okResp = (data: Record<string, unknown>) => ({
      data,
      response: { status: HttpStatus.OK, message: 'ok' },
    });

    it('resolveSignatureUrl returns null for an empty token', async () => {
      const result = await service.resolveSignatureUrl(null);
      expect(result).toBeNull();
    });

    it('uploadSignature uploads, stores token and returns presigned url', async () => {
      // Order of `send` calls in uploadSignature:
      // 1) auth.get-user-profile (no existing token)
      // 2) files.upload-legacy -> { fileToken }
      // 3) auth.update-user-profile -> OK
      // 4) files.presigned-url -> { url, expiresIn }
      const fileSend = (service as unknown as { fileService: { send: jest.Mock } }).fileService.send;
      send
        .mockReturnValueOnce(of(okResp({ user_info: { signature_file_token: null } }))) // get-profile
        .mockReturnValueOnce(of(okResp({}))); // update-user-profile
      fileSend
        .mockReturnValueOnce(of(okResp({ fileToken: 'users/u1/signature/sig.png' }))) // upload-legacy
        .mockReturnValueOnce(of(okResp({ url: 'https://minio/sig?sig', expiresIn: 3600 }))); // presigned-url

      const file = {
        originalname: 'signature.png',
        mimetype: 'image/png',
        buffer: Buffer.from('x'),
      } as unknown as Express.Multer.File;

      const result = await service.uploadSignature(file, 'u1');
      expect(result.isOk()).toBe(true);
      expect(result.value).toEqual({
        file_token: 'users/u1/signature/sig.png',
        url: 'https://minio/sig?sig',
        expires_at: expect.any(String),
      });
    });
  });
```

> The existing spec already imports `of` from `rxjs`, `HttpStatus`, and gives `FILE_SERVICE` a `{ send: jest.fn() }`. Reuse them. `send` is the BUSINESS_SERVICE mock already in scope.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd ../carmen-turborepo-backend-v2 && bunx jest apps/backend-gateway/src/application/user/user.service.spec.ts -t signature`
Expected: FAIL — `service.resolveSignatureUrl is not a function`.

- [ ] **Step 3: Implement the four methods**

In `apps/backend-gateway/src/application/user/user.service.ts`, append these methods inside the `UserService` class, after `deleteAvatar` (just before the class's closing `}`):

```typescript

  /**
   * Upload a signature image for the authenticated user (replaces any existing one)
   * อัปโหลดรูปลายเซ็นสำหรับผู้ใช้ที่เข้าสู่ระบบ (แทนที่ของเดิม)
   */
  async uploadSignature(
    file: Express.Multer.File,
    user_id: string,
  ): Promise<Result<{ file_token: string; url: string; expires_at: string }>> {
    this.logger.debug({ function: 'uploadSignature', user_id }, UserService.name);

    // 1. Read current signature_file_token for cleanup.
    const findRes = await firstValueFrom(
      this.authService.send(
        { cmd: 'auth.get-user-profile', service: 'auth' },
        { id: user_id, version: 'latest', ...getGatewayRequestContext() },
      ),
    ) as MicroserviceResponse;

    if (findRes.response.status !== HttpStatus.OK) {
      return Result.fromMicroserviceError(findRes, 'Failed to fetch user profile');
    }

    const oldToken: string | null =
      (findRes.data as { user_info?: { signature_file_token?: string | null } } | undefined)
        ?.user_info?.signature_file_token ?? null;

    // 2. Hard-delete previous signature before accepting a new one.
    if (oldToken) {
      const deleteOldRes = await firstValueFrom(
        this.fileService.send(
          { cmd: 'files.delete', service: 'files' },
          { fileToken: oldToken, user_id, ...getGatewayRequestContext() },
        ),
      ) as MicroserviceResponse;

      if (
        deleteOldRes.response.status !== HttpStatus.OK &&
        deleteOldRes.response.status !== HttpStatus.NOT_FOUND
      ) {
        return Result.fromMicroserviceError(deleteOldRes, 'Failed to delete previous signature from storage');
      }
    }

    // 3. Upload to micro-file under users/<userId>/signature.
    const uploadPayload = {
      fileName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer.toString('base64'),
      folder: `users/${user_id}/signature`,
      user_id,
      ...getGatewayRequestContext(),
    };
    const uploadRes = await firstValueFrom(
      this.fileService.send(
        { cmd: 'files.upload-legacy', service: 'files' },
        uploadPayload,
      ),
    ) as MicroserviceResponse;

    if (uploadRes.response.status !== HttpStatus.OK && uploadRes.response.status !== HttpStatus.CREATED) {
      return Result.fromMicroserviceError(uploadRes, 'File upload failed');
    }

    const newToken: string = String(
      (uploadRes.data as Record<string, unknown>)?.fileToken ?? '',
    );

    // 4. Update DB column; on failure, roll back the uploaded file.
    try {
      const updateRes = await firstValueFrom(
        this.authService.send(
          { cmd: 'auth.update-user-profile', service: 'auth' },
          { user_id, data: { signature_file_token: newToken }, ...getGatewayRequestContext() },
        ),
      ) as MicroserviceResponse;

      if (updateRes.response.status !== HttpStatus.OK) {
        this.fileService
          .send(
            { cmd: 'files.delete', service: 'files' },
            { fileToken: newToken, user_id, ...getGatewayRequestContext() },
          )
          .subscribe({ error: () => void 0 });
        return Result.fromMicroserviceError(updateRes, 'Failed to update user profile');
      }
    } catch (dbErr) {
      this.fileService
        .send(
          { cmd: 'files.delete', service: 'files' },
          { fileToken: newToken, user_id, ...getGatewayRequestContext() },
        )
        .subscribe({ error: () => void 0 });
      throw dbErr;
    }

    // 5. Resolve presigned URL for the response.
    const presignedRes = await firstValueFrom(
      this.fileService.send(
        { cmd: 'files.presigned-url', service: 'files' },
        { fileToken: newToken, expirySeconds: 3600, user_id, ...getGatewayRequestContext() },
      ),
    ) as MicroserviceResponse;

    if (presignedRes.response.status !== HttpStatus.OK) {
      return Result.fromMicroserviceError(presignedRes, 'Failed to generate presigned URL');
    }

    const presignedData = presignedRes.data as Record<string, unknown> | undefined;
    const url: string = String(presignedData?.url ?? '');
    const expiresIn = presignedData?.expiresIn as number | undefined;
    const expiresAt: string = typeof expiresIn === 'number'
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : '';

    return Result.ok({ file_token: newToken, url, expires_at: expiresAt });
  }

  /**
   * Resolve a presigned download URL for a signature file token
   * แปลง signature_file_token เป็น presigned URL
   */
  async resolveSignatureUrl(
    token: string | null | undefined,
  ): Promise<{ url: string; expires_at: string } | null> {
    if (!token) return null;
    try {
      const res = await firstValueFrom(
        this.fileService.send(
          { cmd: 'files.presigned-url', service: 'files' },
          { fileToken: token, expirySeconds: 3600, ...getGatewayRequestContext() },
        ),
      ) as MicroserviceResponse;
      if (res.response.status !== HttpStatus.OK) return null;
      const data = res.data as Record<string, unknown> | undefined;
      const url = data?.url as string | undefined;
      const expiresIn = data?.expiresIn as number | undefined;
      if (!url || typeof expiresIn !== 'number') return null;
      return { url, expires_at: new Date(Date.now() + expiresIn * 1000).toISOString() };
    } catch {
      return null;
    }
  }

  /**
   * Get the authenticated user's signature info (presigned URL + expiry, nullable)
   * ดึงข้อมูลลายเซ็นของผู้ใช้ที่เข้าสู่ระบบ
   */
  async getSignature(
    user_id: string,
  ): Promise<Result<{ url: string | null; expires_at: string | null }>> {
    this.logger.debug({ function: 'getSignature', user_id }, UserService.name);

    const res = await firstValueFrom(
      this.authService.send(
        { cmd: 'auth.get-user-profile', service: 'auth' },
        { id: user_id, version: 'latest', ...getGatewayRequestContext() },
      ),
    ) as MicroserviceResponse;

    if (res.response.status !== HttpStatus.OK) {
      return Result.fromMicroserviceError(res, 'Failed to fetch user profile');
    }

    const userInfo = (res.data as { user_info?: { signature_file_token?: string | null } } | undefined)?.user_info;
    const token = userInfo?.signature_file_token ?? null;

    if (!token) {
      return Result.ok({ url: null, expires_at: null });
    }

    const resolved = await this.resolveSignatureUrl(token);
    return Result.ok({
      url: resolved?.url ?? null,
      expires_at: resolved?.expires_at ?? null,
    });
  }

  /**
   * Delete the signature of the authenticated user (idempotent)
   * ลบลายเซ็นของผู้ใช้ (idempotent)
   */
  async deleteSignature(user_id: string): Promise<Result<void>> {
    this.logger.debug({ function: 'deleteSignature', user_id }, UserService.name);

    const findRes = await firstValueFrom(
      this.authService.send(
        { cmd: 'auth.get-user-profile', service: 'auth' },
        { id: user_id, version: 'latest', ...getGatewayRequestContext() },
      ),
    ) as MicroserviceResponse;

    if (findRes.response.status !== HttpStatus.OK) {
      return Result.fromMicroserviceError(findRes, 'Failed to fetch user profile');
    }

    const oldToken: string | null =
      (findRes.data as { user_info?: { signature_file_token?: string | null } } | undefined)
        ?.user_info?.signature_file_token ?? null;

    if (!oldToken) {
      return Result.ok(undefined); // idempotent
    }

    const deleteRes = await firstValueFrom(
      this.fileService.send(
        { cmd: 'files.delete', service: 'files' },
        { fileToken: oldToken, user_id, ...getGatewayRequestContext() },
      ),
    ) as MicroserviceResponse;

    if (
      deleteRes.response.status !== HttpStatus.OK &&
      deleteRes.response.status !== HttpStatus.NOT_FOUND
    ) {
      return Result.fromMicroserviceError(deleteRes, 'Failed to delete signature file from storage');
    }

    const updateRes = await firstValueFrom(
      this.authService.send(
        { cmd: 'auth.update-user-profile', service: 'auth' },
        { user_id, data: { signature_file_token: null }, ...getGatewayRequestContext() },
      ),
    ) as MicroserviceResponse;

    if (updateRes.response.status !== HttpStatus.OK) {
      return Result.fromMicroserviceError(updateRes, 'Failed to update user profile');
    }

    return Result.ok(undefined);
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd ../carmen-turborepo-backend-v2 && bunx jest apps/backend-gateway/src/application/user/user.service.spec.ts -t signature`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend-gateway/src/application/user/user.service.ts apps/backend-gateway/src/application/user/user.service.spec.ts
git commit -m "feat(gateway): signature upload/get/delete/resolve service methods"
```

---

### Task 5: Gateway controller endpoints + enrich GET profile + register scopes

**Repo:** `../carmen-turborepo-backend-v2`

**Files:**
- Modify: `apps/backend-gateway/src/application/user/user.controller.ts` (imports line 53; `profile()` body ~line 118; append endpoints before final `}` ~line 537)
- Regenerate: `apps/backend-gateway/src/platform/applications/app-api-catalog.generated.ts`
- Modify: `packages/prisma-shared-schema-platform/prisma/seed.application.ts`

**Interfaces:**
- Consumes: service methods from Task 4; DTOs from Task 3.
- Produces: HTTP `POST /api/user/profile/signature`, `GET /api/user/profile/signature`, `DELETE /api/user/profile/signature`; `GET /api/user/profile` response gains `signature_url`. Consumed by frontend Tasks 7–8.

- [ ] **Step 1: Import the signature DTOs**

In `apps/backend-gateway/src/application/user/user.controller.ts`, extend the existing import on line 53:

```typescript
import { UploadAvatarBodyDto, UploadAvatarResponseDto, GetAvatarResponseDto } from './swagger/upload-avatar.dto';
import { UploadSignatureBodyDto, UploadSignatureResponseDto, GetSignatureResponseDto } from './swagger/upload-signature.dto';
```

- [ ] **Step 2: Enrich `GET /api/user/profile` with `signature_url`**

In the `profile()` method, inside `if (result.isOk()) { ... }`, directly after the avatar block:

```typescript
      const avatar = await this.userService.resolveAvatarUrl(
        userInfo?.avatar_file_token as string | null,
      );
      data.avatar_url = avatar?.url ?? null;
      if (userInfo) delete userInfo.avatar_file_token;

      const signature = await this.userService.resolveSignatureUrl(
        userInfo?.signature_file_token as string | null,
      );
      data.signature_url = signature?.url ?? null;
      if (userInfo) delete userInfo.signature_file_token;
```

- [ ] **Step 3: Append the three endpoints**

In the same controller, just before the final closing `}` of the `UserController` class (after `deleteAvatar`):

```typescript

  /**
   * Get the authenticated user's signature info (presigned URL, nullable)
   * ดึงข้อมูลลายเซ็นของผู้ใช้ที่เข้าสู่ระบบ
   */
  @Get('/api/user/profile/signature')
  @UseGuards(new AppIdGuard('user.getSignature'))
  @UseGuards(KeycloakGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get user signature',
    description:
      'Returns the authenticated user\'s signature info (1-hour presigned URL). Fields are null when no signature is set.\n\nคืนข้อมูลลายเซ็นของผู้ใช้ที่เข้าสู่ระบบ',
    operationId: 'getUserSignature',
  })
  @ApiStdResponse(GetSignatureResponseDto, { description: 'Signature info returned (null fields when no signature set)' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getSignature(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const { user_id } = ExtractRequestHeader(req);
    const result = await this.userService.getSignature(user_id);
    this.respond(res, result);
  }

  /**
   * Upload a signature image for the authenticated user
   * อัปโหลดรูปลายเซ็นสำหรับผู้ใช้ที่เข้าสู่ระบบ
   */
  @Post('/api/user/profile/signature')
  @UseGuards(new AppIdGuard('user.uploadSignature'))
  @UseGuards(KeycloakGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('signature'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload user signature',
    description:
      'Uploads a signature image for the authenticated user. Accepts png/jpeg/webp up to 5 MB. Replaces any existing signature and returns a 1-hour presigned URL.\n\nอัปโหลดรูปลายเซ็นสำหรับผู้ใช้ที่เข้าสู่ระบบ',
    operationId: 'uploadUserSignature',
  })
  @ApiBody({ type: UploadSignatureBodyDto })
  @ApiStdResponse(UploadSignatureResponseDto, { description: 'Signature uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file (type/size/dimensions)' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token' })
  async uploadSignature(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    validateImageUpload(file);
    const { user_id } = ExtractRequestHeader(req);
    const result = await this.userService.uploadSignature(file, user_id);
    this.respond(res, result);
  }

  /**
   * Delete the signature of the authenticated user (idempotent)
   * ลบลายเซ็นของผู้ใช้ที่เข้าสู่ระบบ (idempotent)
   */
  @Delete('/api/user/profile/signature')
  @UseGuards(new AppIdGuard('user.deleteSignature'))
  @UseGuards(KeycloakGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 204, description: 'Signature removed (idempotent)' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user signature',
    description:
      'Removes the signature image of the authenticated user and deletes the underlying file from storage. Idempotent.\n\nลบรูปลายเซ็นของผู้ใช้ที่เข้าสู่ระบบ (idempotent)',
    operationId: 'deleteUserSignature',
  })
  async deleteSignature(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.debug({ function: 'deleteSignature' }, UserController.name);
    const { user_id } = ExtractRequestHeader(req);
    const result = await this.userService.deleteSignature(user_id);
    this.respond(res, result, HttpStatus.NO_CONTENT);
  }
```

- [ ] **Step 4: Regenerate the api catalog**

Run: `cd ../carmen-turborepo-backend-v2 && bun run scripts/generate-app-api-catalog/run.ts`
Expected: `app-api-catalog.generated.ts` now contains `user.getSignature`, `user.uploadSignature`, `user.deleteSignature` in both the flat `APP_API_CATALOG` array and the `user` module's `api_names`. Verify with: `grep -c "user.uploadSignature\|user.getSignature\|user.deleteSignature" apps/backend-gateway/src/platform/applications/app-api-catalog.generated.ts` → expect `3`.

> If the generator is unavailable, add the three strings manually in alphabetical position to the flat array (near `user.uploadAvatar`) AND to the `{ module: 'user', api_names: [...] }` entry.

- [ ] **Step 5: Grant the scopes to the mobile-app seed allowlist**

In `packages/prisma-shared-schema-platform/prisma/seed.application.ts`, in the `mobile-app` `allow` array, after `"user.getAvatar",` add:

```typescript
      "user.getAvatar",
      "user.uploadSignature",
      "user.deleteSignature",
      "user.getSignature",
```

> The default web app (`id: "..."`, `allow: "*"`) already covers web via wildcard — these lines specifically enable the mobile app. (Re-seeding is part of the normal deploy/migrate flow; no code path needs it to compile.)

- [ ] **Step 6: Build the gateway**

Run: `cd ../carmen-turborepo-backend-v2 && bunx jest apps/backend-gateway/src/application/user/ && bun run build` (or the repo's gateway build command).
Expected: tests pass; build succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add apps/backend-gateway/src/application/user/user.controller.ts apps/backend-gateway/src/platform/applications/app-api-catalog.generated.ts packages/prisma-shared-schema-platform/prisma/seed.application.ts
git commit -m "feat(gateway): signature endpoints + GET profile signature_url + scopes"
```

---

## FRONTEND

### Task 6: Endpoint constant + profile type + install draw library

**Repo:** this repo

**Files:**
- Modify: `constant/api-endpoints.ts:241`
- Modify: `types/profile.ts` (`UserProfile`)
- Modify: `package.json` (new dependency)

**Interfaces:**
- Produces: `API_ENDPOINTS.PROFILE_SIGNATURE` (string); `UserProfile.signature_url: string | null`; `react-signature-canvas` available. Consumed by Tasks 7–10.

- [ ] **Step 1: Add the endpoint constant**

In `constant/api-endpoints.ts`, after the `PROFILE_AVATAR` line:

```typescript
  PROFILE_AVATAR: "/api/proxy/api/user/profile/avatar",
  PROFILE_SIGNATURE: "/api/proxy/api/user/profile/signature",
```

- [ ] **Step 2: Add `signature_url` to the `UserProfile` type**

In `types/profile.ts`, in `interface UserProfile`, after the `avatar_url` field:

```typescript
  /** Pre-signed avatar URL (S3 / object storage). Expires — re-fetch profile to refresh */
  avatar_url: string | null;
  /** Pre-signed signature URL (transparent PNG). Expires — re-fetch profile to refresh. Null when unset. */
  signature_url: string | null;
}
```

- [ ] **Step 3: Install the drawing library**

Run: `bun add react-signature-canvas && bun add -d @types/react-signature-canvas`
Expected: both added to `package.json`. (Bun installs despite any React 19 peer-range warning — that is expected and harmless.)

- [ ] **Step 4: Verify it type-checks**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add constant/api-endpoints.ts types/profile.ts package.json bun.lock
git commit -m "feat(profile): signature endpoint constant, type, and draw library"
```

---

### Task 7: Signature mutation hooks + tests

**Repo:** this repo

**Files:**
- Modify: `hooks/use-profile.ts` (add two hooks; expose `signatureUrl` from `useProfile`)
- Test: `hooks/__tests__/use-profile-signature.test.ts`

**Interfaces:**
- Consumes: `API_ENDPOINTS.PROFILE_SIGNATURE`; `httpClient`; `ApiError`; `profileQueryKey`.
- Produces:
  - `useUploadUserSignature(): UseMutationResult<unknown, ApiError, File>` — posts FormData field `"signature"`.
  - `useDeleteUserSignature(): UseMutationResult<unknown, ApiError, void>`.
  - `useProfile().signatureUrl: string | null`.
  - Consumed by Tasks 9–10.

- [ ] **Step 1: Write the failing hook test**

Create `hooks/__tests__/use-profile-signature.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import {
  useUploadUserSignature,
  useDeleteUserSignature,
} from "../use-profile";

vi.mock("@/lib/http-client", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { httpClient } from "@/lib/http-client";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
}

describe("useUploadUserSignature", () => {
  beforeEach(() => vi.clearAllMocks());

  it("posts a FormData with field 'signature'", async () => {
    vi.mocked(httpClient.post).mockResolvedValue(
      new Response(JSON.stringify({ file_token: "t", url: "u", expires_at: "e" }), {
        status: 200,
      }),
    );
    const { result } = renderHook(() => useUploadUserSignature(), {
      wrapper: createWrapper(),
    });
    const file = new File(["x"], "signature.png", { type: "image/png" });
    result.current.mutate(file);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/proxy/api/user/profile/signature",
      expect.any(FormData),
    );
    const sentBody = vi.mocked(httpClient.post).mock.calls[0][1] as FormData;
    expect(sentBody.get("signature")).toBeInstanceOf(File);
  });

  it("throws ApiError on non-ok upload", async () => {
    vi.mocked(httpClient.post).mockResolvedValue(
      new Response(JSON.stringify({ message: "bad" }), { status: 400 }),
    );
    const { result } = renderHook(() => useUploadUserSignature(), {
      wrapper: createWrapper(),
    });
    result.current.mutate(new File(["x"], "s.png", { type: "image/png" }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("bad");
  });
});

describe("useDeleteUserSignature", () => {
  beforeEach(() => vi.clearAllMocks());

  it("issues DELETE to the signature endpoint", async () => {
    vi.mocked(httpClient.delete).mockResolvedValue(new Response(null, { status: 204 }));
    const { result } = renderHook(() => useDeleteUserSignature(), {
      wrapper: createWrapper(),
    });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(httpClient.delete).toHaveBeenCalledWith(
      "/api/proxy/api/user/profile/signature",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:run hooks/__tests__/use-profile-signature.test.ts`
Expected: FAIL — `useUploadUserSignature` is not exported.

- [ ] **Step 3: Implement the two hooks**

In `hooks/use-profile.ts`, after `useDeleteUserAvatar` (before `useChangePassword`), add:

```typescript
export function useUploadUserSignature() {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, File>({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append("signature", file);
      const res = await httpClient.post(
        API_ENDPOINTS.PROFILE_SIGNATURE,
        formData,
      );
      if (!res.ok) {
        let serverMessage: string | undefined;
        try {
          const err = await res.json();
          serverMessage = err.message;
        } catch {
          // JSON parse failed
        }
        throw ApiError.fromResponse(
          res,
          serverMessage || "Failed to upload signature",
        );
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
    },
  });
}

export function useDeleteUserSignature() {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, void>({
    mutationFn: async () => {
      const res = await httpClient.delete(API_ENDPOINTS.PROFILE_SIGNATURE);
      if (!res.ok) {
        let serverMessage: string | undefined;
        try {
          const err = await res.json();
          serverMessage = err.message;
        } catch {
          // JSON parse failed
        }
        throw ApiError.fromResponse(
          res,
          serverMessage || "Failed to remove signature",
        );
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
    },
  });
}
```

- [ ] **Step 4: Expose `signatureUrl` from `useProfile`**

In `hooks/use-profile.ts`, in the `useProfile` hook, next to the `avatarUrl` derivation:

```typescript
  const avatarUrl = query.data?.avatar_url ?? null;
  const signatureUrl = query.data?.signature_url ?? null;
```

And add `signatureUrl` to the returned object next to `avatarUrl`:

```typescript
    avatarUrl,
    signatureUrl,
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test:run hooks/__tests__/use-profile-signature.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add hooks/use-profile.ts hooks/__tests__/use-profile-signature.test.ts
git commit -m "feat(profile): signature upload/delete hooks"
```

---

### Task 8: Signature draw pad component

**Repo:** this repo

**Files:**
- Create: `routes/profile/_components/signature-pad.tsx`

**Interfaces:**
- Produces: `SignaturePad` — a forwardRef-free component taking `{ onEmptyChange?: (empty: boolean) => void }` and exposing imperative helpers via a ref object the parent owns. To keep it simple and testable, it exposes through props:
  - Props: `{ value: SignaturePadHandle | null ... }` — **No.** Use the simpler pattern below.
- Produces (final): `SignaturePad` component with props `{ onChange: (getPng: () => string | null) => void }` is awkward. Use a `ref`-based handle:
  - Export `interface SignaturePadHandle { isEmpty(): boolean; clear(): void; toPngDataUrl(): string | null; }`
  - Export `const SignaturePad = forwardRef<SignaturePadHandle, { disabled?: boolean; onBeginStroke?: () => void }>(...)`.
  - Consumed by Task 9 (dialog).

- [ ] **Step 1: Create the component**

Create `routes/profile/_components/signature-pad.tsx`:

```tsx
import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import SignatureCanvas from "react-signature-canvas";

export interface SignaturePadHandle {
  /** True when no stroke has been drawn */
  isEmpty: () => boolean;
  /** Erase all strokes */
  clear: () => void;
  /** Export the drawing as a transparent-background PNG data URL, or null if empty */
  toPngDataUrl: () => string | null;
}

interface SignaturePadProps {
  readonly disabled?: boolean;
  /** Called when the user starts drawing — use to flip a parent "dirty" flag */
  readonly onBeginStroke?: () => void;
}

/**
 * Thin wrapper over react-signature-canvas. signature_pad draws on a
 * transparent canvas with a black pen, so getCanvas().toDataURL("image/png")
 * is already a transparent PNG — no extra processing needed.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ disabled = false, onBeginStroke }, ref) {
    const padRef = useRef<SignatureCanvas | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        isEmpty: () => padRef.current?.isEmpty() ?? true,
        clear: () => padRef.current?.clear(),
        toPngDataUrl: () => {
          const pad = padRef.current;
          if (!pad || pad.isEmpty()) return null;
          return pad.getCanvas().toDataURL("image/png");
        },
      }),
      [],
    );

    return (
      <div className="bg-muted/30 relative w-full overflow-hidden rounded-lg border">
        <SignatureCanvas
          ref={padRef}
          penColor="black"
          onBegin={onBeginStroke}
          canvasProps={{
            className: "w-full h-40 touch-none cursor-crosshair",
            "aria-label": "signature drawing area",
          }}
          clearOnResize={false}
        />
        {disabled && (
          <div className="absolute inset-0 cursor-not-allowed bg-transparent" />
        )}
      </div>
    );
  },
);
```

> `canvasProps.className` sizes the canvas via CSS; `touch-none` lets stylus/touch draw without the page scrolling. `clearOnResize={false}` keeps strokes when layout shifts.

- [ ] **Step 2: Verify it type-checks**

Run: `bunx tsc --noEmit`
Expected: no errors. (If `react-signature-canvas` types complain about `getCanvas`, confirm `@types/react-signature-canvas` is installed from Task 6; `getCanvas()` exists in its type defs.)

- [ ] **Step 3: Commit**

```bash
git add routes/profile/_components/signature-pad.tsx
git commit -m "feat(profile): signature drawing pad component"
```

---

### Task 9: Signature dialog (Upload / Draw tabs) + test

**Repo:** this repo

**Files:**
- Create: `routes/profile/_components/signature-dialog.tsx`
- Test: `routes/profile/_components/__tests__/signature-dialog.test.tsx`

**Interfaces:**
- Consumes: `SignaturePad` + `SignaturePadHandle` (Task 8); `validateImageFiles`, `IMAGE_MAX_BYTES`, `IMAGE_ACCEPT_ATTR` (`lib/image-upload.ts`); UI `Dialog`, `Tabs`, `Button`.
- Produces: `SignatureDialog` with props
  `{ open: boolean; isSubmitting?: boolean; onOpenChange: (open: boolean) => void; onConfirm: (file: File) => void }`.
  On confirm it builds a `File` named `signature.png` (`image/png`) and calls `onConfirm`. Consumed by Task 10.

- [ ] **Step 1: Write the failing test**

Create `routes/profile/_components/__tests__/signature-dialog.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import { SignatureDialog } from "../signature-dialog";
import en from "@/messages/en.json";

function renderDialog(props?: Partial<React.ComponentProps<typeof SignatureDialog>>) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <IntlProvider locale="en" messages={en}>
      <SignatureDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        {...props}
      />
    </IntlProvider>,
  );
  return { onConfirm, onOpenChange };
}

describe("SignatureDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an oversized upload file and does not confirm", async () => {
    const { onConfirm } = renderDialog();
    // switch to Upload tab
    fireEvent.click(screen.getByRole("tab", { name: /upload/i }));
    const input = screen.getByTestId("signature-file-input") as HTMLInputElement;
    const big = new File([new Uint8Array(3 * 1024 * 1024)], "big.png", {
      type: "image/png",
    });
    fireEvent.change(input, { target: { files: [big] } });
    await waitFor(() =>
      expect(screen.getByTestId("signature-upload-error")).toBeInTheDocument(),
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms with a File built from a valid upload", async () => {
    const { onConfirm } = renderDialog();
    fireEvent.click(screen.getByRole("tab", { name: /upload/i }));
    const input = screen.getByTestId("signature-file-input") as HTMLInputElement;
    const good = new File(["x"], "sig.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [good] } });
    const saveBtn = await screen.findByRole("button", { name: /save/i });
    await waitFor(() => expect(saveBtn).toBeEnabled());
    fireEvent.click(saveBtn);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm.mock.calls[0][0]).toBeInstanceOf(File);
  });
});
```

> The test only exercises the Upload path (jsdom has no real canvas drawing). The Draw path is covered manually in Task 12's smoke test.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:run routes/profile/_components/__tests__/signature-dialog.test.tsx`
Expected: FAIL — cannot resolve `../signature-dialog`.

- [ ] **Step 3: Implement the dialog**

Create `routes/profile/_components/signature-dialog.tsx`:

```tsx
import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { useTranslations } from "use-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  IMAGE_ACCEPT_ATTR,
  IMAGE_MAX_BYTES,
  validateImageFiles,
} from "@/lib/image-upload";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";

interface SignatureDialogProps {
  readonly open: boolean;
  readonly isSubmitting?: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Called with the final PNG File when the user saves */
  readonly onConfirm: (file: File) => void;
}

/** Convert a data URL (e.g. from canvas.toDataURL) to a File */
function dataUrlToFile(dataUrl: string, filename: string): File {
  const [head, body] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head)?.[1] ?? "image/png";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

/**
 * Dialog for setting a signature via two tabs: Draw (canvas) or Upload (image
 * file). Produces a PNG File and hands it to `onConfirm`; the parent owns the
 * upload mutation.
 */
export function SignatureDialog({
  open,
  isSubmitting = false,
  onOpenChange,
  onConfirm,
}: SignatureDialogProps) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");

  const [tab, setTab] = useState<"draw" | "upload">("draw");
  const padRef = useRef<SignaturePadHandle>(null);
  const [drawDirty, setDrawDirty] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Reset all transient state when the dialog (re)opens.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTab("draw");
      setDrawDirty(false);
      setUploadFile(null);
      setUploadPreview(null);
      setUploadError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const { valid, rejected } = validateImageFiles([file], IMAGE_MAX_BYTES);
    if (rejected.length > 0) {
      setUploadError(rejected[0].reason);
      setUploadFile(null);
      setUploadPreview(null);
      e.target.value = "";
      return;
    }
    const accepted = valid[0];
    setUploadFile(accepted);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(accepted);
  };

  const handleClearDraw = () => {
    padRef.current?.clear();
    setDrawDirty(false);
  };

  const canSave =
    !isSubmitting &&
    (tab === "draw" ? drawDirty && !(padRef.current?.isEmpty() ?? true) : !!uploadFile);

  const handleSave = () => {
    if (tab === "draw") {
      const dataUrl = padRef.current?.toPngDataUrl();
      if (!dataUrl) return;
      onConfirm(dataUrlToFile(dataUrl, "signature.png"));
    } else if (uploadFile) {
      onConfirm(uploadFile);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{t("signatureTitle")}</DialogTitle>
          <DialogDescription className="text-xs">
            {t("signatureDesc")}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "draw" | "upload")}>
          <TabsList className="w-full">
            <TabsTrigger value="draw" className="flex-1 text-xs">
              {t("drawSignature")}
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex-1 text-xs">
              {t("uploadSignature")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="space-y-2">
            <SignaturePad
              ref={padRef}
              disabled={isSubmitting}
              onBeginStroke={() => setDrawDirty(true)}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSubmitting || !drawDirty}
                onClick={handleClearDraw}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                {t("clearSignature")}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              className="bg-muted/30 hover:bg-muted/50 flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadPreview ? (
                <img
                  src={uploadPreview}
                  alt={t("signature")}
                  className="max-h-full max-w-full object-contain p-2"
                />
              ) : (
                <>
                  <Upload className="text-muted-foreground size-6" aria-hidden="true" />
                  <span className="text-muted-foreground text-xs">
                    {t("signatureUploadHint")}
                  </span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              data-testid="signature-file-input"
              type="file"
              accept={IMAGE_ACCEPT_ATTR}
              disabled={isSubmitting}
              className="hidden"
              onChange={handleFileChange}
            />
            {uploadError && (
              <p
                data-testid="signature-upload-error"
                className="text-destructive text-xs"
              >
                {uploadError}
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {tc("cancel")}
          </Button>
          <Button type="button" size="sm" disabled={!canSave} onClick={handleSave}>
            {isSubmitting && (
              <Loader2 aria-hidden="true" className="size-3 animate-spin" />
            )}
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Add the i18n keys used by the dialog**

In `messages/en.json`, in the `profile` object, add:

```json
    "signature": "Signature",
    "signatureTitle": "Set signature",
    "signatureDesc": "Draw your signature or upload an image (PNG, JPEG, or WebP).",
    "drawSignature": "Draw",
    "uploadSignature": "Upload",
    "clearSignature": "Clear",
    "signatureUploadHint": "Click to choose an image",
    "addSignature": "Add signature",
    "editSignature": "Edit signature",
    "removeSignature": "Remove signature",
    "removingSignature": "Removing…",
    "signatureUpdated": "Signature updated",
    "signatureUploadFailed": "Failed to upload signature",
    "signatureRemoved": "Signature removed",
    "signatureRemoveFailed": "Failed to remove signature",
    "removeSignatureConfirmTitle": "Remove signature?",
    "removeSignatureConfirmDesc": "This permanently deletes your saved signature."
```

In `messages/th.json`, in the `profile` object, add:

```json
    "signature": "ลายเซ็น",
    "signatureTitle": "ตั้งค่าลายเซ็น",
    "signatureDesc": "วาดลายเซ็นของคุณ หรืออัปโหลดรูปภาพ (PNG, JPEG หรือ WebP)",
    "drawSignature": "วาด",
    "uploadSignature": "อัปโหลด",
    "clearSignature": "ล้าง",
    "signatureUploadHint": "คลิกเพื่อเลือกรูปภาพ",
    "addSignature": "เพิ่มลายเซ็น",
    "editSignature": "แก้ไขลายเซ็น",
    "removeSignature": "ลบลายเซ็น",
    "removingSignature": "กำลังลบ…",
    "signatureUpdated": "อัปเดตลายเซ็นแล้ว",
    "signatureUploadFailed": "อัปโหลดลายเซ็นไม่สำเร็จ",
    "signatureRemoved": "ลบลายเซ็นแล้ว",
    "signatureRemoveFailed": "ลบลายเซ็นไม่สำเร็จ",
    "removeSignatureConfirmTitle": "ลบลายเซ็น?",
    "removeSignatureConfirmDesc": "การกระทำนี้จะลบลายเซ็นที่บันทึกไว้อย่างถาวร"
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test:run routes/profile/_components/__tests__/signature-dialog.test.tsx`
Expected: PASS (2 tests).

> If `react-signature-canvas` throws in jsdom on mount (no 2D context), guard the test by keeping the default tab on "draw" but only interacting with "upload"; the canvas mounts but is never drawn to, which jsdom tolerates. If mount itself fails, wrap `SignatureCanvas` usage is unchanged — instead set the dialog's initial `tab` to `"draw"` is fine; jsdom provides a stub canvas. Should this still fail, change the test's first action to switch tabs before any assertion (already the case).

- [ ] **Step 6: Commit**

```bash
git add routes/profile/_components/signature-dialog.tsx routes/profile/_components/__tests__/signature-dialog.test.tsx messages/en.json messages/th.json
git commit -m "feat(profile): signature dialog with draw/upload tabs"
```

---

### Task 10: Wire the signature section into the profile setting + details pages

**Repo:** this repo

**Files:**
- Modify: `routes/profile/_components/user-profile-setting.tsx`
- Modify: `routes/profile/_components/user-profile-details.tsx`

**Interfaces:**
- Consumes: `useUploadUserSignature`, `useDeleteUserSignature` (Task 7); `SignatureDialog` (Task 9); `profile.signature_url`.
- Produces: user-visible signature management on the setting page and a read-only display on the details page. Terminal — nothing consumes this.

- [ ] **Step 1: Add signature state + handlers + UI to the setting page**

In `routes/profile/_components/user-profile-setting.tsx`:

a) Extend the hooks import and add the dialog/AlertDialog imports:

```typescript
import {
  useDeleteUserAvatar,
  useProfile,
  useUpdateProfile,
  useUploadUserAvatar,
  useUploadUserSignature,
  useDeleteUserSignature,
} from "@/hooks/use-profile";
import { SignatureDialog } from "./signature-dialog";
```

b) Inside the component, after the avatar mutation hooks, add:

```typescript
  const uploadSignature = useUploadUserSignature();
  const deleteSignature = useDeleteUserSignature();
  const isUploadingSignature = uploadSignature.isPending;
  const isDeletingSignature = deleteSignature.isPending;
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [removeSignatureOpen, setRemoveSignatureOpen] = useState(false);

  const handleConfirmSignature = (file: File) => {
    uploadSignature.mutate(file, {
      onSuccess: () => {
        toast.success(t("signatureUpdated"));
        setSignatureDialogOpen(false);
      },
      onError: (err) => toast.error(err.message || t("signatureUploadFailed")),
    });
  };

  const handleConfirmRemoveSignature = () => {
    deleteSignature.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("signatureRemoved"));
        setRemoveSignatureOpen(false);
      },
      onError: (err) => toast.error(err.message || t("signatureRemoveFailed")),
    });
  };
```

c) Add a Signature section just before the closing of the "Personal Info Form" `</section>` block's following sibling — place this new `<section>` after the personal-info `</section>` and before `<ChangePasswordDialog ... />`:

```tsx
      {/* Signature */}
      <section className="bg-card rounded-xl border shadow-sm">
        <header className="flex items-center justify-between border-b px-2 py-2">
          <h2 className="text-sm font-semibold">{t("signature")}</h2>
          <div className="flex gap-2">
            {profile.signature_url && !isUploadingSignature && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isDeletingSignature}
                onClick={() => setRemoveSignatureOpen(true)}
              >
                {isDeletingSignature ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-3.5" aria-hidden="true" />
                )}
                {t("removeSignature")}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploadingSignature}
              onClick={() => setSignatureDialogOpen(true)}
            >
              {profile.signature_url ? t("editSignature") : t("addSignature")}
            </Button>
          </div>
        </header>
        <div className="flex min-h-24 items-center justify-center p-3">
          {profile.signature_url ? (
            <img
              key={profile.signature_url}
              src={profile.signature_url}
              alt={t("signature")}
              className="max-h-32 max-w-full object-contain"
            />
          ) : (
            <p className="text-muted-foreground text-xs">{t("signatureUploadHint")}</p>
          )}
        </div>
      </section>
```

d) Add the dialog + confirm AlertDialog near the existing `AvatarCropDialog` / `AlertDialog` at the bottom of the JSX (before the final closing `</div>`):

```tsx
      <SignatureDialog
        open={signatureDialogOpen}
        isSubmitting={isUploadingSignature}
        onOpenChange={setSignatureDialogOpen}
        onConfirm={handleConfirmSignature}
      />

      <AlertDialog
        open={removeSignatureOpen}
        onOpenChange={(o) =>
          !o && !isDeletingSignature && setRemoveSignatureOpen(false)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("removeSignatureConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeSignatureConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSignature}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeletingSignature}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmRemoveSignature();
              }}
            >
              {isDeletingSignature ? (
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-3" aria-hidden="true" />
              )}
              {isDeletingSignature ? t("removingSignature") : t("removeSignature")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
```

> `AlertDialog*`, `Button`, `Loader2`, `Trash2`, `toast`, `useState` are already imported in this file (used by the avatar section).

- [ ] **Step 2: Add a read-only signature display to the details page**

In `routes/profile/_components/user-profile-details.tsx`, add a new `<section>` after the "Personal Information" section and before "Business Units":

```tsx
      {/* Signature */}
      {profile.signature_url && (
        <section className="bg-card rounded-xl border shadow-sm">
          <header className="flex items-center gap-2 border-b px-2 py-2">
            <span className="bg-primary/10 flex size-7 items-center justify-center rounded-md">
              <IdCard className="text-primary size-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-semibold">{t("signature")}</h3>
          </header>
          <div className="flex min-h-20 items-center justify-center p-3">
            <img
              key={profile.signature_url}
              src={profile.signature_url}
              alt={t("signature")}
              className="max-h-28 max-w-full object-contain"
            />
          </div>
        </section>
      )}
```

> `IdCard` and `t` are already imported in this file.

- [ ] **Step 3: Type-check + lint**

Run: `bunx tsc --noEmit && bun run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add routes/profile/_components/user-profile-setting.tsx routes/profile/_components/user-profile-details.tsx
git commit -m "feat(profile): signature section on profile setting + details"
```

---

### Task 11: Frontend full verify + manual smoke

**Repo:** this repo

**Files:** none (verification only)

- [ ] **Step 1: Run the full frontend gate**

Run: `bunx tsc --noEmit && bun run lint && bun test:run`
Expected: type-check clean, lint clean, all tests pass (including the new signature tests).

- [ ] **Step 2: Manual smoke against the local gateway**

Start the gateway (`carmen-turborepo-backend-v2` on :4000) with the migration applied and the new endpoints, then:

Run: `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`

Verify, logged in as `admin@zebra.com`:
1. Profile → Setting → "Add signature": **Draw** tab — draw with mouse, Clear works, Save uploads; the signature image appears in the section. Reload → still present.
2. "Edit signature" → **Upload** tab — choose a PNG, Save; image replaces the previous one.
3. "Remove signature" → confirm → image disappears; reload confirms removal.
4. Oversized/wrong-type upload shows the inline error and does not submit.
5. Profile details page shows the signature read-only when set.
6. No console errors; access token never persisted (DevTools → Application → localStorage).

- [ ] **Step 3: Final commit (if any smoke fixes were needed)**

```bash
git add -A
git commit -m "fix(profile): signature smoke-test adjustments"
```

> If the smoke test is clean, skip this commit.

---

## Self-Review Notes

- **Spec coverage:** Upload path (Tasks 6,9,10), Draw path (Tasks 8,9), store in profile (Tasks 1–5), display+remove (Task 10), transparent PNG (Task 8 — `getCanvas().toDataURL("image/png")` on signature_pad's transparent canvas), error handling (dialog validation Task 9; backend `validateImageUpload` Task 5; toast on mutation error Task 10), testing (Tasks 4,7,9,11), build order (backend Tasks 1–5 then frontend 6–11). All covered.
- **Out of scope (per spec):** rendering signature into transaction documents; multiple signatures; ad-hoc signing. Not in any task — intentional.
- **Type consistency:** `signature_file_token` (DB/micro-business/gateway), `signature_url` (gateway response + `UserProfile`), field name `signature` (FormData + `FileInterceptor`), `SignaturePadHandle.toPngDataUrl()` used by the dialog — names match across tasks.
- **Risk note:** `react-signature-canvas` React-19 peer range may warn on install (Task 6) — bun installs anyway; the component uses only `isEmpty`/`clear`/`getCanvas`, all present in `@types/react-signature-canvas`. If the package proves incompatible at runtime, the fallback is a native-canvas pad with `pointerdown/move/up` handlers exposing the same `SignaturePadHandle` interface — the dialog (Task 9) is unchanged.
