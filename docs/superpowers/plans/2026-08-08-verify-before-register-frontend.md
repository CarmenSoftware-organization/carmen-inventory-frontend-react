# ยืนยันอีเมลก่อนสร้างบัญชี — แผน implement (frontend)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แยกหน้า `/register` เป็นสองขั้น (กรอกอีเมล → กรอกโปรไฟล์จากลิงก์) และเพิ่มหน้ารับคำเชิญ `/invitations/:token`

**Architecture:** route colocated ตาม convention ของรีโปนี้ · เรียก backend ผ่าน `lib/auth/auth-api.ts` (public endpoint ไม่ผ่าน token) และ `lib/http-client.ts` (คำเชิญ) · state ของทั้งสองหน้าเป็น state machine ในคอมโพเนนต์ ไม่มี global store

**Tech Stack:** Vite + React Router 7 data router · react-hook-form + zod + `@hookform/resolvers` · TanStack Query (`useMutation`) · `use-intl` · shadcn UI (`AuthSplitShell`, `FloatingField`)

**Spec:** [`../specs/2026-08-08-verify-before-register-design.md`](../specs/2026-08-08-verify-before-register-design.md) · ฉบับเต็มอยู่รีโป backend

**ต้องมีก่อน:** backend ต้อง deploy แล้ว (`signup-request`, `signup-token/verify`, `register` contract ใหม่, `accept-with-signup`, `email_masked`) — ดูแผน `carmen-turborepo-backend-v2/docs/superpowers/plans/2026-08-08-verify-before-register-backend.md`

## Global Constraints

- **ไม่เขียน test file** ตาม `~/.claude/CLAUDE.md` — gate คือ `bun run typecheck` + `bun run lint` + ตรวจในเบราว์เซอร์ · ถ้าไฟล์ทดสอบเดิมพังเพราะการแก้ (เช่น `components/auth/register-form-schema.test.ts`) ให้ลบหรือแก้ให้ผ่านตามที่ไฟล์นั้นสมควรได้รับ
- **import จาก `react-router` ตรง ๆ** — `Link` ใช้ `to` · `useNavigate` · `useSearchParams` คืน tuple · ESLint บล็อก `next*`
- **i18n เพิ่มคีย์ทั้ง `messages/en.json` และ `messages/th.json` พร้อมกัน** ทุกครั้ง คีย์ของหน้าสมัครอยู่ใน namespace `auth`
- **token ไม่ถูกเก็บลง localStorage/sessionStorage** อ่านจาก URL แล้วส่งใน request เท่านั้น
- ห้ามสร้าง `page.tsx` / `_components/` / โฟลเดอร์ `[id]/` — รีโปนี้ใช้ `<feature>.route.tsx` + ไฟล์แบน ๆ ข้าง ๆ

---

### Task 1: ชั้น API — `lib/auth/auth-api.ts` และ `lib/invitation-api.ts`

**Files:**
- Modify: `lib/auth/auth-api.ts:66-120` (แทน `RegisterPayload` + `register`)
- Create: `lib/invitation-api.ts`

**Interfaces:**
- Produces: `signupRequest(email: string): Promise<void>`
- Produces: `verifySignupToken(token: string): Promise<{ email: string }>`
- Produces: `register(payload: { token: string; password: string; user_info: UserInfo }): Promise<void>`
- Produces: `type UserInfo = { first_name: string; middle_name?: string; last_name: string; telephone?: string }`
- Produces: `getInvitation(token)`, `acceptInvitationWithSignup(token, payload)`, `acceptInvitation(token)`, `declineInvitation(token)`

- [ ] **Step 1: แทนที่ `RegisterPayload` และ `register` ใน auth-api.ts**

```ts
export interface UserInfo {
  first_name: string;
  middle_name?: string;
  last_name: string;
  telephone?: string;
}

export interface RegisterPayload {
  /** token จากลิงก์ในอีเมล — อีเมลมาจาก token ไม่ใช่จาก payload */
  token: string;
  password: string;
  user_info: UserInfo;
}

/**
 * ขอลิงก์ยืนยันอีเมลเพื่อสมัคร — backend ตอบ 200 เสมอ ไม่ว่าอีเมลนั้นจะมีบัญชีอยู่แล้วหรือไม่
 * จึงห้ามตีความ 200 ว่า "อีเมลนี้ว่าง" และห้ามแสดงข้อความที่บอกเป็นนัยแบบนั้น
 */
export async function signupRequest(email: string): Promise<void> {
  const { BACKEND_URL } = getRuntimeConfig();
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/auth/signup-request`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError(ERROR_CODES.NETWORK_ERROR, "Auth server unavailable", undefined, true);
  }
  if (res.ok) return;
  throw await toAuthApiError(res, "Could not send the verification link");
}

/** ตรวจลิงก์ก่อนแสดงฟอร์ม — 410 แปลว่าลิงก์หมดอายุ ถูกใช้แล้ว หรือไม่มีจริง */
export async function verifySignupToken(token: string): Promise<{ email: string }> {
  const { BACKEND_URL } = getRuntimeConfig();
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/auth/signup-token/verify`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError(ERROR_CODES.NETWORK_ERROR, "Auth server unavailable", undefined, true);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw await toAuthApiError(res, "This link is no longer valid", json);
  const email: string | undefined = json?.data?.email;
  if (!email) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "Invalid response from backend", 502);
  return { email };
}

/** สร้างบัญชีจาก token ที่ยืนยันอีเมลแล้ว */
export async function register(payload: RegisterPayload): Promise<void> {
  const { BACKEND_URL } = getRuntimeConfig();
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError(ERROR_CODES.NETWORK_ERROR, "Auth server unavailable", undefined, true);
  }
  if (res.ok) return;
  throw await toAuthApiError(res, "Register failed");
}
```

- [ ] **Step 2: เพิ่ม helper แปลง response เป็น ApiError (ใช้ร่วมสามฟังก์ชัน)**

วางเหนือ `signupRequest` — โค้ดนี้รวมตรรกะที่ `register` เดิมทำอยู่ (ข้อความ zod เป็น array) ไว้ที่เดียว:

```ts
/** แปลง error response ของ auth endpoint เป็น ApiError — gateway คืน message เป็น array เมื่อ zod ไม่ผ่าน */
async function toAuthApiError(res: Response, fallback: string, parsed?: unknown): Promise<ApiError> {
  const json: any = parsed ?? (await res.json().catch(() => ({})));
  const message: string = Array.isArray(json?.message)
    ? json.message.join(" · ")
    : (json?.message ?? fallback);
  const retryAfter: number | undefined =
    typeof json?.retry_after === "number" ? json.retry_after : undefined;
  const code =
    res.status === 410
      ? ERROR_CODES.VALIDATION_ERROR
      : res.status === 409 || res.status === 400
        ? ERROR_CODES.VALIDATION_ERROR
        : res.status === 429
          ? ERROR_CODES.RATE_LIMITED
          : ERROR_CODES.INTERNAL_ERROR;
  return new ApiError(code, message, res.status, false, retryAfter !== undefined ? { retryAfter } : undefined);
}
```

หน้าจอแยก 410 ออกจาก 409 ด้วย `error.status` ไม่ใช่ด้วย code — ทั้งคู่เป็น `VALIDATION_ERROR`

- [ ] **Step 3: สร้าง `lib/invitation-api.ts`**

```ts
import { apiClient } from "@/lib/http-client";

export interface InvitationPreview {
  cluster_name: string;
  business_units: { name: string; role: string }[];
  cluster_role: string;
  expires_at: string;
  /** อีเมลแบบปิดบัง เช่น j•••@example.com — backend ไม่คืนอีเมลเต็มโดยตั้งใจ */
  email_masked: string;
}

/** อ่านคำเชิญด้วย token — public ไม่ต้องล็อกอิน · 410 = ลิงก์ใช้ไม่ได้ */
export async function getInvitation(token: string): Promise<InvitationPreview> {
  return apiClient<InvitationPreview>(`/api/proxy/invitations/${encodeURIComponent(token)}`);
}

/** สร้างบัญชีแล้วรับคำเชิญในคราวเดียว — สำหรับผู้ที่ยังไม่มีบัญชี */
export async function acceptInvitationWithSignup(
  token: string,
  payload: { password: string; user_info: import("@/lib/auth/auth-api").UserInfo },
): Promise<void> {
  await apiClient(`/api/proxy/invitations/${encodeURIComponent(token)}/accept-with-signup`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** ยินยอมรับคำเชิญด้วยบัญชีที่ล็อกอินอยู่ */
export async function acceptInvitation(token: string): Promise<void> {
  await apiClient(`/api/proxy/invitations/${encodeURIComponent(token)}/accept`, { method: "POST" });
}

/** ปฏิเสธคำเชิญ */
export async function declineInvitation(token: string): Promise<void> {
  await apiClient(`/api/proxy/invitations/${encodeURIComponent(token)}/decline`, { method: "POST" });
}
```

⚠️ เปิด `lib/http-client.ts` ก่อนเขียน — ใช้ชื่อ export และ signature จริงของไฟล์นั้น (ชื่อ `apiClient`
ข้างบนเป็นตัวแทน) และตรวจว่า endpoint สาธารณะเรียกได้โดยไม่มี access token หรือต้องใช้ `fetch` ตรงแบบ
`auth-api.ts` — `getInvitation` ต้องทำงานได้ตอนยังไม่ล็อกอิน

- [ ] **Step 4: typecheck**

```bash
bun run typecheck
```
Expected: ล้มที่ `components/register-form.tsx` เพราะเรียก `register()` ด้วย signature เก่า — ปกติ Task 2 แก้ให้

- [ ] **Step 5: Commit**

```bash
git add lib/auth/auth-api.ts lib/invitation-api.ts
git commit -m "feat(auth): เพิ่ม signupRequest/verifySignupToken และเปลี่ยน contract ของ register"
```

---

### Task 2: หน้า `/register` ขั้นที่หนึ่ง — กรอกอีเมล

**Files:**
- Create: `routes/register/signup-schema.ts`
- Create: `routes/register/signup-email-form.tsx`
- Create: `routes/register/check-inbox.tsx`
- Modify: `routes/register/register.route.tsx`
- Modify: `messages/en.json`, `messages/th.json`

**Interfaces:**
- Consumes: `signupRequest` (Task 1)
- Produces: `createSignupEmailSchema(tv, tf)` · `createSignupProfileSchema(tv, tf)` · `type SignupProfileValues` (Task 3 และ Task 4 ใช้)

- [ ] **Step 1: สร้าง `signup-schema.ts`**

ย้ายเนื้อจาก `components/auth/register-form-schema.ts` มาแยกเป็นสองชุด ตัดฟิลด์ `username` ทิ้ง:

```ts
import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import { createPasswordSchema } from "@/lib/password-schema";

/** ขั้นที่หนึ่ง — อีเมลอย่างเดียว */
export function createSignupEmailSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, tv("required", { field: tf("email") }))
      .pipe(z.email(tv("invalidEmail"))),
  });
}

export type SignupEmailValues = z.infer<ReturnType<typeof createSignupEmailSchema>>;
export const EMPTY_SIGNUP_EMAIL: SignupEmailValues = { email: "" };

/**
 * ขั้นที่สอง — โปรไฟล์และรหัสผ่าน ใช้ร่วมกันทั้งเส้นทางสมัครและเส้นทางคำเชิญ
 * ไม่มีช่อง username เพราะ backend ตั้ง username = email เสมอ
 */
export function createSignupProfileSchema(tv: TranslationFn, tf: TranslationFn) {
  return z
    .object({
      firstName: z.string().trim().min(1, tv("required", { field: tf("firstName") })),
      lastName: z.string().trim().min(1, tv("required", { field: tf("lastName") })),
      telephone: z.string().trim(),
      password: createPasswordSchema(tv),
      confirm_password: z.string().min(1, tv("confirmPassword")),
    })
    .refine((data) => data.password === data.confirm_password, {
      message: tv("passwordMismatch"),
      path: ["confirm_password"],
    });
}

export type SignupProfileValues = z.infer<ReturnType<typeof createSignupProfileSchema>>;
export const EMPTY_SIGNUP_PROFILE: SignupProfileValues = {
  firstName: "",
  lastName: "",
  telephone: "",
  password: "",
  confirm_password: "",
};
```

- [ ] **Step 2: สร้าง `signup-email-form.tsx`**

ลอกโครง `AuthSplitShell` + `FloatingField` + `useMutation` จาก `components/register-form.tsx` เดิม:

```tsx
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { signupRequest } from "@/lib/auth/auth-api";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { AuthFormAlert, FloatingField } from "@/components/auth/floating-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import {
  createSignupEmailSchema,
  EMPTY_SIGNUP_EMAIL,
  type SignupEmailValues,
} from "./signup-schema";

interface SignupEmailFormProps {
  readonly onSent: (email: string) => void;
}

export default function SignupEmailForm({ onSent }: SignupEmailFormProps) {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");

  const form = useForm<SignupEmailValues>({
    resolver: zodResolver(createSignupEmailSchema(tv, tfl)) as Resolver<SignupEmailValues>,
    defaultValues: EMPTY_SIGNUP_EMAIL,
    mode: "onTouched",
  });

  const mutation = useMutation({
    mutationFn: async (values: SignupEmailValues) => {
      await signupRequest(values.email.trim());
      return values.email.trim();
    },
    onSuccess: (email) => onSent(email),
  });

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.code === ERROR_CODES.RATE_LIMITED
        ? t("signup.tooManyAttempts")
        : mutation.error.message
      : mutation.error
        ? t("signup.sendFailed")
        : null;

  return (
    <AuthSplitShell title={t("signup.title")} description={t("signup.emailStepDescription")}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} noValidate>
        <FieldGroup>
          {errorMessage && <AuthFormAlert>{errorMessage}</AuthFormAlert>}
          <FloatingField
            label={t("email")}
            type="email"
            autoComplete="email"
            error={form.formState.errors.email?.message}
            {...form.register("email")}
          />
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? t("signup.sending") : t("signup.sendLink")}
            <ArrowRight className="size-4" />
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            {t("signup.haveAccount")} <Link to="/login">{t("signIn")}</Link>
          </p>
        </FieldGroup>
      </form>
    </AuthSplitShell>
  );
}
```

⚠️ ชื่อ prop ของ `AuthSplitShell` / `FloatingField` / `AuthFormAlert` ต้องลอกจาก
`components/register-form.tsx` เดิมให้ตรงตัว — เปิดไฟล์นั้นอ่านก่อนเขียน

- [ ] **Step 3: สร้าง `check-inbox.tsx` พร้อม cooldown 60 วินาที**

```tsx
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { Link } from "react-router";
import { MailCheck } from "lucide-react";
import { signupRequest } from "@/lib/auth/auth-api";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { Button } from "@/components/ui/button";

const RESEND_COOLDOWN_SECONDS = 60;

interface CheckInboxProps {
  readonly email: string;
}

export default function CheckInbox({ email }: CheckInboxProps) {
  const t = useTranslations("auth");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const resend = useMutation({
    mutationFn: () => signupRequest(email),
    onSuccess: () => setSecondsLeft(RESEND_COOLDOWN_SECONDS),
  });

  return (
    <AuthSplitShell title={t("signup.checkInboxTitle")} description={t("signup.checkInboxDescription", { email })}>
      <div className="flex flex-col gap-4">
        <MailCheck className="text-muted-foreground mx-auto size-10" aria-hidden="true" />
        <p className="text-muted-foreground text-center text-sm">{t("signup.linkExpiryNote")}</p>
        <Button
          variant="outline"
          disabled={secondsLeft > 0 || resend.isPending}
          onClick={() => resend.mutate()}
        >
          {secondsLeft > 0 ? t("signup.resendIn", { seconds: secondsLeft }) : t("signup.resend")}
        </Button>
        <p className="text-muted-foreground text-center text-sm">
          <Link to="/login">{t("signIn")}</Link>
        </p>
      </div>
    </AuthSplitShell>
  );
}
```

- [ ] **Step 4: เขียน `register.route.tsx` ใหม่**

```tsx
import { useState } from "react";
import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed";
import SignupEmailForm from "./signup-email-form";
import CheckInbox from "./check-inbox";

/**
 * หน้า `/register` ขั้นที่หนึ่ง — กรอกอีเมลเพื่อขอลิงก์ยืนยัน
 * บัญชียังไม่ถูกสร้างที่ขั้นนี้ ผู้ใช้จะสร้างบัญชีที่ `/register/verify` หลังกดลิงก์ในอีเมล
 */
export function Component() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  return (
    <RedirectIfAuthed>
      {sentTo ? <CheckInbox email={sentTo} /> : <SignupEmailForm onSent={setSentTo} />}
    </RedirectIfAuthed>
  );
}
```

- [ ] **Step 5: เพิ่มคีย์ i18n ทั้งสองภาษา**

ใน `messages/en.json` namespace `auth` เพิ่ม object `signup`:

```json
"signup": {
  "title": "Create your account",
  "emailStepDescription": "Enter your email and we will send you a link to finish signing up",
  "sendLink": "Send verification link",
  "sending": "Sending...",
  "sendFailed": "Could not send the link. Please try again.",
  "tooManyAttempts": "Too many attempts. Please wait a moment and try again.",
  "haveAccount": "Already have an account?",
  "checkInboxTitle": "Check your inbox",
  "checkInboxDescription": "If that address can be signed up, a link is on its way to {email}",
  "linkExpiryNote": "The link expires in 24 hours.",
  "resend": "Send again",
  "resendIn": "Send again in {seconds}s"
}
```

`messages/th.json` ที่ตำแหน่งเดียวกัน:

```json
"signup": {
  "title": "สร้างบัญชีของคุณ",
  "emailStepDescription": "กรอกอีเมลของคุณ แล้วเราจะส่งลิงก์ไปให้สมัครต่อ",
  "sendLink": "ส่งลิงก์ยืนยัน",
  "sending": "กำลังส่ง...",
  "sendFailed": "ส่งลิงก์ไม่สำเร็จ กรุณาลองใหม่",
  "tooManyAttempts": "ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
  "haveAccount": "มีบัญชีอยู่แล้ว?",
  "checkInboxTitle": "ตรวจกล่องจดหมายของคุณ",
  "checkInboxDescription": "ถ้าอีเมลนี้สมัครได้ ลิงก์กำลังไปถึง {email}",
  "linkExpiryNote": "ลิงก์มีอายุ 24 ชั่วโมง",
  "resend": "ส่งอีกครั้ง",
  "resendIn": "ส่งอีกครั้งใน {seconds} วินาที"
}
```

ข้อความ "ถ้าอีเมลนี้สมัครได้" จงใจไม่ยืนยันว่าอีเมลว่างหรือไม่ — ตรงกับที่ backend ตอบ 200 เสมอ

- [ ] **Step 6: typecheck + lint + ตรวจในเบราว์เซอร์**

```bash
bun run typecheck && bun run lint
VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev
```
เปิด `/register` → กรอกอีเมล → เห็นหน้า "ตรวจกล่องจดหมาย" → ปุ่มส่งอีกครั้งนับถอยหลัง 60 วินาที →
สลับภาษาไทย/อังกฤษแล้วข้อความครบทั้งสองภาษา → ไม่มี error ใน console

- [ ] **Step 7: Commit**

```bash
git add routes/register/ messages/
git commit -m "feat(register): ขั้นที่หนึ่ง — ขอลิงก์ยืนยันด้วยอีเมล"
```

---

### Task 3: หน้า `/register/verify` ขั้นที่สอง — สร้างบัญชี

**Files:**
- Create: `routes/register/signup-profile-form.tsx`
- Create: `routes/register/register-verify.route.tsx`
- Modify: `routes/router.tsx:20` (เพิ่ม route ถัดจาก `/register`)
- Modify: `messages/en.json`, `messages/th.json`
- Modify: `routes/login/login.route.tsx` หรือคอมโพเนนต์ฟอร์มล็อกอิน (แสดง banner หลังสมัครสำเร็จ)

**Interfaces:**
- Consumes: `verifySignupToken`, `register` (Task 1) · `createSignupProfileSchema` (Task 2)
- Produces: `SignupProfileForm` ที่รับ `onSubmit(values)` — Task 4 นำไปใช้ซ้ำในหน้าคำเชิญ

- [ ] **Step 1: สร้าง `signup-profile-form.tsx` แบบใช้ซ้ำได้สองที่**

```tsx
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import { AuthFormAlert, FloatingField, FloatingFieldPassword } from "@/components/auth/floating-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import {
  createSignupProfileSchema,
  EMPTY_SIGNUP_PROFILE,
  type SignupProfileValues,
} from "./signup-schema";

interface SignupProfileFormProps {
  readonly onSubmit: (values: SignupProfileValues) => void;
  readonly isPending: boolean;
  readonly errorMessage: string | null;
  readonly submitLabel: string;
}

/** ฟอร์มโปรไฟล์+รหัสผ่าน ใช้ทั้งที่ /register/verify และหน้ารับคำเชิญ */
export default function SignupProfileForm({
  onSubmit,
  isPending,
  errorMessage,
  submitLabel,
}: SignupProfileFormProps) {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");

  const form = useForm<SignupProfileValues>({
    resolver: zodResolver(createSignupProfileSchema(tv, tfl)) as Resolver<SignupProfileValues>,
    defaultValues: EMPTY_SIGNUP_PROFILE,
    mode: "onTouched",
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {errorMessage && <AuthFormAlert>{errorMessage}</AuthFormAlert>}
        <FloatingField label={t("field.firstName")} error={form.formState.errors.firstName?.message} {...form.register("firstName")} />
        <FloatingField label={t("field.lastName")} error={form.formState.errors.lastName?.message} {...form.register("lastName")} />
        <FloatingField label={t("field.telephone")} error={form.formState.errors.telephone?.message} {...form.register("telephone")} />
        <FloatingFieldPassword label={t("password")} autoComplete="new-password" error={form.formState.errors.password?.message} {...form.register("password")} />
        <FloatingFieldPassword label={t("signup.confirmPassword")} autoComplete="new-password" error={form.formState.errors.confirm_password?.message} {...form.register("confirm_password")} />
        <Button type="submit" disabled={isPending} className="w-full">
          {submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}
```

⚠️ คีย์ป้ายชื่อฟิลด์ (`t("field.firstName")` ฯลฯ) ต้องใช้ namespace เดียวกับที่ `register-form.tsx` เดิม
ใช้ — เปิดไฟล์เดิมอ่านก่อน แล้วใช้ชื่อคีย์เดิมทั้งหมด อย่าสร้างคีย์ใหม่ที่ซ้ำความหมาย

- [ ] **Step 2: สร้าง `register-verify.route.tsx`**

```tsx
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CheckCircle2 } from "lucide-react";
import { ApiError } from "@/lib/api-error";
import { register as registerUser, verifySignupToken } from "@/lib/auth/auth-api";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed";
import { Button } from "@/components/ui/button";
import SignupProfileForm from "./signup-profile-form";
import type { SignupProfileValues } from "./signup-schema";

type State =
  | { kind: "checking" }
  | { kind: "valid"; email: string }
  | { kind: "gone" };

/**
 * หน้า `/register/verify?token=...` ขั้นที่สอง — token พิสูจน์อีเมลแล้ว ผู้ใช้กรอกโปรไฟล์และรหัสผ่าน
 * token อ่านจาก query แล้วส่งใน request body เท่านั้น ไม่ถูกเก็บลง storage ใด
 */
export function Component() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const t = useTranslations("auth");
  const [state, setState] = useState<State>({ kind: "checking" });

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setState({ kind: "gone" });
      return;
    }
    verifySignupToken(token)
      .then((r) => !cancelled && setState({ kind: "valid", email: r.email }))
      .catch(() => !cancelled && setState({ kind: "gone" }));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const createAccount = useMutation({
    mutationFn: (values: SignupProfileValues) =>
      registerUser({
        token,
        password: values.password,
        user_info: {
          first_name: values.firstName.trim(),
          last_name: values.lastName.trim(),
          ...(values.telephone.trim() ? { telephone: values.telephone.trim() } : {}),
        },
      }),
    onSuccess: () => navigate("/login", { replace: true, state: { justRegistered: true } }),
  });

  // token ตายคาฟอร์ม — แสดง error แต่ "ไม่ล้าง" สิ่งที่กรอกไว้ (spec ข้อ 8)
  const errorMessage =
    createAccount.error instanceof ApiError
      ? createAccount.error.status === 410
        ? t("signup.linkDeadDuringForm")
        : createAccount.error.status === 409
          ? t("signup.alreadyRegistered")
          : createAccount.error.message
      : createAccount.error
        ? t("signup.createFailed")
        : null;

  if (state.kind === "checking") {
    return <AuthSplitShell title={t("signup.title")} description={t("signup.checkingLink")}><div /></AuthSplitShell>;
  }

  if (state.kind === "gone") {
    return (
      <AuthSplitShell title={t("signup.linkDeadTitle")} description={t("signup.linkDeadDescription")}>
        <Button asChild className="w-full">
          <Link to="/register">{t("signup.requestNewLink")}</Link>
        </Button>
      </AuthSplitShell>
    );
  }

  return (
    <RedirectIfAuthed>
      <AuthSplitShell title={t("signup.title")} description={t("signup.profileStepDescription")}>
        <p className="mb-4 flex items-center justify-center gap-2 text-sm">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {t("signup.emailVerified", { email: state.email })}
        </p>
        <SignupProfileForm
          onSubmit={(v) => createAccount.mutate(v)}
          isPending={createAccount.isPending}
          errorMessage={errorMessage}
          submitLabel={createAccount.isPending ? t("signup.creating") : t("signup.createAccount")}
        />
      </AuthSplitShell>
    </RedirectIfAuthed>
  );
}
```

- [ ] **Step 3: ลงทะเบียน route**

ใน `routes/router.tsx` ถัดจากบรรทัด `/register`:

```tsx
      { path: "/register/verify", lazy: () => import("./register/register-verify.route") },
```

- [ ] **Step 4: แสดง banner สำเร็จที่หน้า login**

ในคอมโพเนนต์ฟอร์มล็อกอิน อ่าน state ที่ส่งมาแล้วแสดงแถบเขียวหนึ่งครั้ง:

```tsx
import { useLocation } from "react-router";
// ...
const location = useLocation();
const justRegistered = (location.state as { justRegistered?: boolean } | null)?.justRegistered === true;
// ...
{justRegistered && <AuthFormAlert variant="success">{t("signup.accountReady")}</AuthFormAlert>}
```

⚠️ ตรวจว่า `AuthFormAlert` รองรับ variant สำเร็จหรือไม่ ถ้าไม่รองรับ ให้ใช้กล่องข้อความที่มีอยู่แล้วในรีโป
แทน อย่าเพิ่ม variant ใหม่ถ้าไม่จำเป็น

- [ ] **Step 5: เพิ่มคีย์ i18n ที่ใช้ใน task นี้ (ทั้งสองภาษา)**

`en.json` → `auth.signup` เพิ่ม:

```json
"profileStepDescription": "Set your name and password to finish creating your account",
"emailVerified": "{email} verified",
"checkingLink": "Checking your link...",
"linkDeadTitle": "This link no longer works",
"linkDeadDescription": "It has expired or has already been used. Request a new one to continue.",
"linkDeadDuringForm": "This link expired while you were filling in the form. Request a new one — your details are still here.",
"requestNewLink": "Request a new link",
"alreadyRegistered": "This address already has an account. Please sign in instead.",
"createAccount": "Create account",
"creating": "Creating account...",
"createFailed": "Could not create the account. Please try again.",
"confirmPassword": "Confirm password",
"accountReady": "Your account is ready. Sign in to continue."
```

`th.json` → `auth.signup` เพิ่ม:

```json
"profileStepDescription": "ตั้งชื่อและรหัสผ่านเพื่อสร้างบัญชีให้เสร็จ",
"emailVerified": "ยืนยัน {email} แล้ว",
"checkingLink": "กำลังตรวจสอบลิงก์...",
"linkDeadTitle": "ลิงก์นี้ใช้ไม่ได้แล้ว",
"linkDeadDescription": "ลิงก์หมดอายุหรือถูกใช้ไปแล้ว ขอลิงก์ใหม่เพื่อดำเนินการต่อ",
"linkDeadDuringForm": "ลิงก์หมดอายุระหว่างที่คุณกรอกข้อมูล ขอลิงก์ใหม่ได้เลย ข้อมูลที่กรอกไว้ยังอยู่",
"requestNewLink": "ขอลิงก์ใหม่",
"alreadyRegistered": "อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบแทน",
"createAccount": "สร้างบัญชี",
"creating": "กำลังสร้างบัญชี...",
"createFailed": "สร้างบัญชีไม่สำเร็จ กรุณาลองใหม่",
"confirmPassword": "ยืนยันรหัสผ่าน",
"accountReady": "บัญชีของคุณพร้อมแล้ว เข้าสู่ระบบเพื่อเริ่มใช้งาน"
```

- [ ] **Step 6: typecheck + lint + ตรวจในเบราว์เซอร์**

```bash
bun run typecheck && bun run lint
```
ตรวจสี่กรณี: token ถูกต้อง → ฟอร์ม + ป้ายอีเมล · token มั่ว → หน้า "ลิงก์ใช้ไม่ได้" · ไม่มี `?token=` →
หน้าเดียวกัน · สมัครสำเร็จ → เด้งไป `/login` พร้อม banner

- [ ] **Step 7: Commit**

```bash
git add routes/register/ routes/router.tsx routes/login/ messages/
git commit -m "feat(register): ขั้นที่สอง — สร้างบัญชีจากลิงก์ในอีเมล"
```

---

### Task 4: หน้ารับคำเชิญ `/invitations/:token`

**Files:**
- Create: `routes/invitation/invitation.route.tsx`
- Create: `routes/invitation/invitation-summary.tsx`
- Modify: `routes/router.tsx` (เพิ่ม public route)
- Modify: `messages/en.json`, `messages/th.json`

**Interfaces:**
- Consumes: `getInvitation`, `acceptInvitationWithSignup`, `acceptInvitation`, `declineInvitation` (Task 1) · `SignupProfileForm` (Task 3)

- [ ] **Step 1: สร้าง `invitation-summary.tsx`**

```tsx
import { useTranslations } from "use-intl";
import type { InvitationPreview } from "@/lib/invitation-api";

/** สรุปสิ่งที่ถูกเชิญ — ใช้ทุกแขนงของหน้ารับคำเชิญ */
export default function InvitationSummary({ invitation }: { readonly invitation: InvitationPreview }) {
  const t = useTranslations("auth");
  return (
    <dl className="text-sm">
      <div className="flex justify-between py-1">
        <dt className="text-muted-foreground">{t("invitation.cluster")}</dt>
        <dd className="font-medium">{invitation.cluster_name}</dd>
      </div>
      <div className="flex justify-between py-1">
        <dt className="text-muted-foreground">{t("invitation.role")}</dt>
        <dd className="font-medium">{invitation.cluster_role}</dd>
      </div>
      <div className="flex justify-between py-1">
        <dt className="text-muted-foreground">{t("invitation.sentTo")}</dt>
        <dd className="font-medium">{invitation.email_masked}</dd>
      </div>
      {invitation.business_units.length > 0 && (
        <div className="py-1">
          <dt className="text-muted-foreground">{t("invitation.businessUnits")}</dt>
          <dd className="mt-1 flex flex-col gap-0.5">
            {invitation.business_units.map((bu) => (
              <span key={`${bu.name}-${bu.role}`}>
                {bu.name} — {bu.role}
              </span>
            ))}
          </dd>
        </div>
      )}
    </dl>
  );
}
```

- [ ] **Step 2: สร้าง `invitation.route.tsx`**

```tsx
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { Link, useNavigate, useParams } from "react-router";
import { ApiError } from "@/lib/api-error";
import { tokenStore } from "@/lib/auth/token-store";
import {
  acceptInvitation,
  acceptInvitationWithSignup,
  declineInvitation,
  getInvitation,
  type InvitationPreview,
} from "@/lib/invitation-api";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { Button } from "@/components/ui/button";
import SignupProfileForm from "../register/signup-profile-form";
import type { SignupProfileValues } from "../register/signup-schema";
import InvitationSummary from "./invitation-summary";

type State =
  | { kind: "loading" }
  | { kind: "gone" }
  | { kind: "ready"; invitation: InvitationPreview };

/**
 * หน้า `/invitations/:token` — public เพราะผู้เปิดอาจยังไม่มีบัญชี
 * หน้าจอไม่เคยถาม backend ว่าอีเมลนี้มีบัญชีไหม ผู้ใช้เลือกเอง และ backend ตัดสินความจริงเสมอ
 */
export function Component() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const t = useTranslations("auth");
  const [state, setState] = useState<State>({ kind: "loading" });
  const [mode, setMode] = useState<"choose" | "signup">("choose");
  const isAuthed = tokenStore.get() !== null;

  useEffect(() => {
    let cancelled = false;
    getInvitation(token)
      .then((inv) => !cancelled && setState({ kind: "ready", invitation: inv }))
      .catch(() => !cancelled && setState({ kind: "gone" }));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const signup = useMutation({
    mutationFn: (values: SignupProfileValues) =>
      acceptInvitationWithSignup(token, {
        password: values.password,
        user_info: {
          first_name: values.firstName.trim(),
          last_name: values.lastName.trim(),
          ...(values.telephone.trim() ? { telephone: values.telephone.trim() } : {}),
        },
      }),
    onSuccess: () => navigate("/login", { replace: true, state: { justRegistered: true } }),
  });

  const accept = useMutation({
    mutationFn: () => acceptInvitation(token),
    onSuccess: () => navigate("/dashboard", { replace: true }),
  });

  const decline = useMutation({
    mutationFn: () => declineInvitation(token),
    onSuccess: () => navigate("/login", { replace: true }),
  });

  if (state.kind === "loading") {
    return <AuthSplitShell title={t("invitation.title")} description={t("invitation.loading")}><div /></AuthSplitShell>;
  }

  if (state.kind === "gone") {
    return (
      <AuthSplitShell title={t("invitation.deadTitle")} description={t("invitation.deadDescription")}>
        <Button asChild className="w-full">
          <Link to="/login">{t("signIn")}</Link>
        </Button>
      </AuthSplitShell>
    );
  }

  // ล็อกอินอยู่แล้ว — accept ตอบ 403 เองถ้าอีเมลไม่ตรง จึงไม่ต้องเดาฝั่ง client
  if (isAuthed) {
    const wrongAccount = accept.error instanceof ApiError && accept.error.status === 403;
    return (
      <AuthSplitShell title={t("invitation.title")} description={t("invitation.reviewDescription")}>
        <InvitationSummary invitation={state.invitation} />
        {wrongAccount ? (
          <p className="text-destructive mt-4 text-sm">{t("invitation.wrongAccount")}</p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" disabled={accept.isPending} onClick={() => accept.mutate()}>
            {t("invitation.accept")}
          </Button>
          <Button variant="outline" className="flex-1" disabled={decline.isPending} onClick={() => decline.mutate()}>
            {t("invitation.decline")}
          </Button>
        </div>
      </AuthSplitShell>
    );
  }

  if (mode === "signup") {
    const errorMessage =
      signup.error instanceof ApiError
        ? signup.error.status === 409
          ? t("invitation.alreadyHasAccount")
          : signup.error.status === 410
            ? t("invitation.deadDescription")
            : signup.error.message
        : signup.error
          ? t("signup.createFailed")
          : null;
    return (
      <AuthSplitShell title={t("invitation.title")} description={t("invitation.signupDescription")}>
        <InvitationSummary invitation={state.invitation} />
        <div className="mt-4">
          <SignupProfileForm
            onSubmit={(v) => signup.mutate(v)}
            isPending={signup.isPending}
            errorMessage={errorMessage}
            submitLabel={signup.isPending ? t("signup.creating") : t("invitation.createAndJoin")}
          />
        </div>
      </AuthSplitShell>
    );
  }

  return (
    <AuthSplitShell title={t("invitation.title")} description={t("invitation.chooseDescription")}>
      <InvitationSummary invitation={state.invitation} />
      <div className="mt-4 flex flex-col gap-2">
        <Button onClick={() => setMode("signup")}>{t("invitation.createAccount")}</Button>
        <Button variant="outline" asChild>
          <Link to={`/login?redirect=${encodeURIComponent(`/invitations/${token}`)}`}>
            {t("invitation.haveAccount")}
          </Link>
        </Button>
      </div>
    </AuthSplitShell>
  );
}
```

⚠️ ตรวจว่าหน้า login รองรับ query `redirect` อยู่แล้วหรือยัง — ดู `lib/auth/resolve-next-path.ts` แล้วใช้
ชื่อพารามิเตอร์ที่ไฟล์นั้นรองรับจริง (อาจเป็น `next` ไม่ใช่ `redirect`)

- [ ] **Step 3: ลงทะเบียน route แบบ public**

ใน `routes/router.tsx` ข้าง ๆ `/pl/:url_token`:

```tsx
      { path: "/invitations/:token", lazy: () => import("./invitation/invitation.route") },
```

- [ ] **Step 4: เพิ่มคีย์ i18n (ทั้งสองภาษา)**

`en.json` → `auth` เพิ่ม object `invitation`:

```json
"invitation": {
  "title": "You have been invited",
  "loading": "Loading the invitation...",
  "deadTitle": "This invitation link no longer works",
  "deadDescription": "It has expired, was withdrawn, or has already been used.",
  "reviewDescription": "Review what you are being invited to, then accept or decline",
  "chooseDescription": "Create an account to join, or sign in if you already have one",
  "signupDescription": "Set your name and password to join",
  "cluster": "Chain",
  "role": "Role",
  "sentTo": "Sent to",
  "businessUnits": "Properties",
  "accept": "Accept",
  "decline": "Decline",
  "createAccount": "Create a new account",
  "createAndJoin": "Create account and join",
  "haveAccount": "I already have an account",
  "alreadyHasAccount": "This address already has an account. Sign in and accept the invitation instead.",
  "wrongAccount": "This invitation was sent to a different account. Sign out and try again."
}
```

`th.json` → `auth.invitation`:

```json
"invitation": {
  "title": "คุณได้รับคำเชิญ",
  "loading": "กำลังโหลดคำเชิญ...",
  "deadTitle": "ลิงก์คำเชิญนี้ใช้ไม่ได้แล้ว",
  "deadDescription": "ลิงก์หมดอายุ ถูกยกเลิก หรือถูกใช้ไปแล้ว",
  "reviewDescription": "ตรวจดูสิ่งที่คุณถูกเชิญ แล้วเลือกยินยอมหรือปฏิเสธ",
  "chooseDescription": "สร้างบัญชีเพื่อเข้าร่วม หรือเข้าสู่ระบบถ้ามีบัญชีอยู่แล้ว",
  "signupDescription": "ตั้งชื่อและรหัสผ่านเพื่อเข้าร่วม",
  "cluster": "เครือ",
  "role": "บทบาท",
  "sentTo": "ส่งถึง",
  "businessUnits": "หน่วยธุรกิจ",
  "accept": "ยินยอม",
  "decline": "ปฏิเสธ",
  "createAccount": "สร้างบัญชีใหม่",
  "createAndJoin": "สร้างบัญชีและเข้าร่วม",
  "haveAccount": "ฉันมีบัญชีอยู่แล้ว",
  "alreadyHasAccount": "อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบแล้วกดยินยอมแทน",
  "wrongAccount": "คำเชิญนี้ส่งถึงบัญชีอื่น กรุณาออกจากระบบแล้วลองใหม่"
}
```

- [ ] **Step 5: typecheck + lint + ตรวจในเบราว์เซอร์**

```bash
bun run typecheck && bun run lint
```
ตรวจสี่แขนง: ยังไม่ล็อกอิน → สองปุ่ม · เลือกสร้างบัญชี → ฟอร์ม → 201 เด้งไป login · ล็อกอินอยู่ด้วย
อีเมลตรง → ปุ่มยินยอม/ปฏิเสธ · ล็อกอินอยู่ด้วยบัญชีอื่น → กดยินยอมแล้วเห็นข้อความ "ส่งถึงบัญชีอื่น"

- [ ] **Step 6: Commit**

```bash
git add routes/invitation/ routes/router.tsx messages/
git commit -m "feat(invitation): หน้ารับคำเชิญ สมัครจบในลิงก์เดียวได้"
```

---

### Task 5: เก็บกวาดของเดิม

**Files:**
- Delete: `components/register-form.tsx`
- Delete: `components/auth/register-form-schema.ts`
- Delete: `components/auth/register-form-schema.test.ts`

- [ ] **Step 1: ยืนยันว่าไม่มีใครอ้างถึงสามไฟล์นี้แล้ว**

```bash
grep -rn "register-form\|register-form-schema\|createRegisterSchema\|EMPTY_REGISTER_FORM" \
  --include="*.ts" --include="*.tsx" routes/ components/ lib/ | grep -v "routes/register/"
```
Expected: ไม่มีผลลัพธ์ ถ้ามี ให้แก้ที่เรียกใช้ก่อนแล้วค่อยลบ

- [ ] **Step 2: ลบไฟล์**

```bash
git rm components/register-form.tsx components/auth/register-form-schema.ts components/auth/register-form-schema.test.ts
```

ลบไฟล์ทดสอบไปด้วย เพราะมันทดสอบ schema ที่ถูกแทนที่แล้ว (ตาม global constraint ไม่เขียนไฟล์ทดสอบใหม่)

- [ ] **Step 3: typecheck + lint + test เดิมทั้งชุด**

```bash
bun run typecheck && bun run lint && bun test:run
```
Expected: เขียวทั้งหมด — ชุดทดสอบเดิมของรีโปต้องไม่พังจากการลบครั้งนี้

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(register): ลบฟอร์มสมัครแบบขั้นตอนเดียวที่ไม่ใช้แล้ว"
```

---

## หลังทำครบ

- [ ] `bun run typecheck` · `bun run lint` · `bun test:run` เขียวทั้งหมด
- [ ] เดินครบทั้งสองเส้นทางกับ backend จริง (`VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`)
- [ ] สลับภาษาไทย/อังกฤษบนทุกหน้าจอใหม่ ไม่มีคีย์ที่แสดงเป็นชื่อคีย์ดิบ
- [ ] เปิด DevTools → Application → ยืนยันว่าไม่มี token ของลิงก์ถูกเขียนลง localStorage/sessionStorage
