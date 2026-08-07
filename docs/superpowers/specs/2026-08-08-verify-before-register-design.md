# ยืนยันอีเมลก่อนสร้างบัญชี — ส่วน frontend

ดีไซน์ฉบับเต็มอยู่ที่ฝั่ง backend เพราะแกนของงานอยู่ที่นั่น:
`../../../carmen-turborepo-backend-v2/docs/superpowers/specs/2026-08-08-verify-before-register-design.md`

เอกสารนี้สรุปเฉพาะสิ่งที่เปลี่ยนในรีโปนี้ ทุกการตัดสินใจอ้างจากไฟล์ข้างบน

## เปลี่ยนอะไร

เส้นทางสมัครกลับลำดับจาก **สมัคร → ยืนยันอีเมล** เป็น **ยืนยันอีเมล → สมัคร** หน้า `/register`
จึงกลายเป็นสองขั้น และบัญชีถูกสร้างก็ต่อเมื่อผู้สมัครพิสูจน์แล้วว่าเปิดกล่องจดหมายนั้นได้จริง

รีโปนี้รับ **UI ฝั่งผู้ใช้ปลายทางทั้งหมด** — ขอลิงก์ยืนยัน · ยืนยันอีเมล · สมัคร · **รับคำเชิญ**
ส่วน `carmen-platform` รับเฉพาะฝั่ง Cluster Admin ที่ออกคำเชิญ

## Routes

```
routes/register/
  register.route.tsx           ฟอร์มอีเมลอย่างเดียว ครอบด้วย RedirectIfAuthed เหมือนเดิม
  register-verify.route.tsx    ใหม่ — path "register/verify" อ่าน ?token= ด้วย useSearchParams
  signup-email-form.tsx        ขั้น 1
  check-inbox.tsx              "ส่งลิงก์ไปที่ a@b.com แล้ว" + ส่งอีกครั้ง cooldown 60 วินาที
  signup-profile-form.tsx      ขั้น 2 — ชื่อ นามสกุล เบอร์ รหัสผ่าน ยืนยันรหัสผ่าน
  signup-schema.ts             สอง schema แยกกัน อีเมลล้วน / โปรไฟล์+รหัสผ่าน

routes/invitation/
  invitation.route.tsx         ใหม่ — path "/invitations/:token" public route นอก ProtectedShell
  invitation-summary.tsx       สรุปสิ่งที่ถูกเชิญ — เครือ หน่วยธุรกิจ บทบาท วันหมดอายุ
  invitation-signup-form.tsx   ฟอร์มสร้างบัญชีจากคำเชิญ ใช้ schema โปรไฟล์+รหัสผ่านตัวเดียวกับข้างบน
```

`components/register-form.tsx` และ `components/auth/register-form-schema.ts` ย้ายเข้ามาอยู่ใน
`routes/register/` พร้อมกัน ตาม convention colocated ของรีโปนี้

**ช่อง username หายไปจากฟอร์ม** — backend ตั้ง `username = email` เสมออยู่แล้ว ฟอร์มปัจจุบันบังคับ
กรอกทั้งที่ค่าถูกทิ้งทันทีที่ถึง backend

## `lib/auth/auth-api.ts`

| ฟังก์ชัน | สถานะ |
|---|---|
| `signupRequest(email)` | ใหม่ — `POST /api/auth/signup-request` ตอบ 200 เสมอ |
| `verifySignupToken(token)` | ใหม่ — `POST /api/auth/signup-token/verify` → `{ email }` หรือ 410 |
| `register({ token, password, user_info })` | เปลี่ยน signature — `RegisterPayload` เดิมถูกแทนที่ ไม่มี `email` และ `username` แล้ว |

คำเชิญเรียกผ่าน `lib/http-client.ts` ตามปกติ (`GET /api/invitations/:token` ·
`POST /api/invitations/:token/accept-with-signup` · `accept` · `decline`)

## สถานะของหน้าสมัครขั้นที่สอง

```
เปิดหน้า → POST signup-token/verify
  ├─ 200 → ฟอร์ม พร้อมป้าย "✓ a@b.com ยืนยันแล้ว" แบบอ่านอย่างเดียว
  └─ 410 → "ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว" + ปุ่มกลับไปขอลิงก์ใหม่

กดสร้างบัญชี → POST register
  ├─ 201 → navigate("/login", { state: { justRegistered: true } }) แสดง banner สำเร็จ
  ├─ 410 → token ตายคาฟอร์ม แสดง error พร้อมปุ่มขอลิงก์ใหม่ โดยไม่ล้างสิ่งที่กรอกไว้
  └─ 409 → อีเมลถูกสมัครไปแล้ว ชวนไปหน้า login
```

## สถานะของหน้ารับคำเชิญ

```
โหลด GET /api/invitations/:token
  ├─ 410 → "ลิงก์นี้ใช้ไม่ได้แล้ว" พร้อมทางออกไปหน้าแรก
  ├─ ล็อกอินอยู่ และอีเมลของ session ตรงกับ email_masked
  │     → สรุปสิ่งที่ถูกเชิญ + ปุ่มยินยอม / ปฏิเสธ
  ├─ ล็อกอินอยู่ แต่อีเมลไม่ตรง
  │     → "คำเชิญนี้ส่งถึงบัญชีอื่น" พร้อมปุ่มออกจากระบบแล้วลองใหม่
  └─ ยังไม่ล็อกอิน → สรุปสิ่งที่ถูกเชิญ + ป้ายอีเมลที่ mask ไว้ แล้วให้เลือกเอง
        ├─ "ฉันมีบัญชีอยู่แล้ว"  → /login?redirect=/invitations/:token
        └─ "สร้างบัญชีใหม่"      → ฟอร์มโปรไฟล์+รหัสผ่าน → accept-with-signup
              ├─ 201 → ไปหน้า login พร้อมข้อความสำเร็จ
              └─ 409 → "อีเมลนี้มีบัญชีอยู่แล้ว" พร้อมปุ่มไปล็อกอิน
```

**หน้าจอไม่เคยถาม backend ว่าอีเมลนั้นมีบัญชีไหม** — ระบบไม่มีฟิลด์แบบนั้นโดยตั้งใจ (ปิด enumeration
oracle) ผู้ใช้เลือกเอง และ backend ตัดสินความจริงเสมอ การเทียบอีเมลของ session กับ `email_masked`
ฝั่ง client เป็นแค่การเดาเพื่อเลือก UI ที่ดีที่สุด — ถ้าเดาผิด `accept` ตอบ 403 แล้วหน้าจอตกลงมาที่
แขนง "ส่งถึงบัญชีอื่น" เอง

token อ่านจาก URL แล้วส่งใน request body หรือ path ตาม endpoint เท่านั้น ไม่ถูกเก็บลง storage ใด

i18n เพิ่มคีย์ใน `messages/{en,th}.json` ทั้งสองภาษาพร้อมกัน

## ลำดับ deploy

**backend ก่อน frontend** แต่ **ไม่มีหน้าต่างที่ผู้ใช้สมัครไม่ได้** เพราะ backend มี shim หนึ่ง release
ที่แปลง payload `register` แบบเก่าให้เป็น `signup-request` — bundle เก่าที่ค้างบน CDN ยังได้ 201 และ
ผู้ใช้ได้ลิงก์ยืนยันตามปกติ ลิงก์อายุ 24 ชม. ครอบช่วงที่ `/register/verify` ยังไม่ถูก deploy
รายละเอียดอยู่ในข้อ 4.4 และ 9.3 ของดีไซน์ฉบับเต็ม
