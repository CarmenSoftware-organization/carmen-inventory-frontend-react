# ยืนยันอีเมลก่อนสร้างบัญชี — ส่วน frontend

ดีไซน์ฉบับเต็มอยู่ที่ฝั่ง backend เพราะแกนของงานอยู่ที่นั่น:
`../../../carmen-turborepo-backend-v2/docs/superpowers/specs/2026-08-08-verify-before-register-design.md`

เอกสารนี้สรุปเฉพาะสิ่งที่เปลี่ยนในรีโปนี้ ทุกการตัดสินใจอ้างจากไฟล์ข้างบน

## เปลี่ยนอะไร

เส้นทางสมัครกลับลำดับจาก **สมัคร → ยืนยันอีเมล** เป็น **ยืนยันอีเมล → สมัคร** หน้า `/register`
จึงกลายเป็นสองขั้น และบัญชีถูกสร้างก็ต่อเมื่อผู้สมัครพิสูจน์แล้วว่าเปิดกล่องจดหมายนั้นได้จริง

## Routes

```
routes/register/
  register.route.tsx           ฟอร์มอีเมลอย่างเดียว ครอบด้วย RedirectIfAuthed เหมือนเดิม
  register-verify.route.tsx    ใหม่ — path "register/verify" อ่าน ?token= ด้วย useSearchParams
  signup-email-form.tsx        ขั้น 1
  check-inbox.tsx              "ส่งลิงก์ไปที่ a@b.com แล้ว" + ส่งอีกครั้ง cooldown 60 วินาที
  signup-profile-form.tsx      ขั้น 2 — ชื่อ นามสกุล เบอร์ รหัสผ่าน ยืนยันรหัสผ่าน
  signup-schema.ts             สอง schema แยกกัน อีเมลล้วน / โปรไฟล์+รหัสผ่าน
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

## สถานะของหน้าที่สอง

```
เปิดหน้า → POST signup-token/verify
  ├─ 200 → ฟอร์ม พร้อมป้าย "✓ a@b.com ยืนยันแล้ว" แบบอ่านอย่างเดียว
  └─ 410 → "ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว" + ปุ่มกลับไปขอลิงก์ใหม่

กดสร้างบัญชี → POST register
  ├─ 201 → navigate("/login", { state: { justRegistered: true } }) แสดง banner สำเร็จ
  ├─ 410 → token ตายคาฟอร์ม แสดง error พร้อมปุ่มขอลิงก์ใหม่ โดยไม่ล้างสิ่งที่กรอกไว้
  └─ 409 → อีเมลถูกสมัครไปแล้ว ชวนไปหน้า login
```

token อ่านจาก query แล้วส่งใน request body เท่านั้น ไม่ถูกส่งต่อไปที่อื่นและไม่เก็บลง storage ใด

i18n เพิ่มคีย์ใน `messages/{en,th}.json` ทั้งสองภาษาพร้อมกัน

## ลำดับ deploy

**backend ก่อน frontend** มีหน้าต่างที่ frontend เก่าที่ค้างบน CDN จะสมัครไม่ได้เพราะ contract
เปลี่ยน — login และการใช้งานอื่นไม่กระทบ รายละเอียดและเหตุผลอยู่ในข้อ 9.3 ของดีไซน์ฉบับเต็ม
