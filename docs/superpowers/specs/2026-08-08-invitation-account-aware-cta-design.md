# หน้ารับคำเชิญรู้ว่าอีเมลนี้มีบัญชีแล้วหรือยัง

หน้า `/invitations` เสนอทางเลือกที่ถูกทางเดียวแทนที่จะให้ผู้ถูกเชิญเดาเอง — มีบัญชีแล้วเห็นแค่
"เข้าสู่ระบบ" ยังไม่มีบัญชีเห็นแค่ "สร้างบัญชี"

งานนี้กินสองรีโป เอกสารฉบับนี้เป็นฉบับเต็มของทั้งคู่:

- `carmen-turborepo-backend-v2` — เพิ่มฟิลด์ `has_account` ในคำตอบของ `GET /api/invitations/:token`
- `carmen-inventory-frontend-react` — ใช้ฟิลด์นั้นเลือกปุ่ม

## ปัญหา

วันนี้หน้าคำเชิญแสดงสองทางเสมอ: "Create a new account" กับ "I already have an account"
ผู้ถูกเชิญที่มีบัญชีอยู่แล้วมักกดสร้างบัญชี กรอกชื่อ นามสกุล เบอร์ รหัสผ่าน ยืนยันรหัสผ่าน กดส่ง
แล้วเพิ่งได้รู้ว่าทำผิดทาง — backend ตอบ 409 `INVITATION_ACCOUNT_EXISTS` พร้อมข้อความให้ไป
เข้าสู่ระบบแทน (`user-invitation.service.ts:1042-1048`) ฟอร์มที่กรอกไปทิ้งทั้งหมด

อีกด้านหนึ่งก็เสียเปล่าเหมือนกัน: คนที่ยังไม่มีบัญชีแต่กด "I already have an account" จะไปจบที่
หน้าเข้าสู่ระบบที่เขาล็อกอินไม่ได้ และถ้าบังเอิญมีบัญชีอื่นอยู่ก็จะได้ 403 ตอนกดตอบรับ เพราะ
backend เทียบอีเมลของผู้ล็อกอินกับอีเมลของคำเชิญ

## การตัดสินใจหลัก

### 1. ยอมเปิดเผยว่าอีเมลของคำเชิญมีบัญชีแล้วหรือยัง

เดิมตั้งใจไม่เปิดเผย — `user-invitation.interface.ts:78-82` เขียนไว้ว่า *"ที่นี่ไม่เคยคืนอีเมลเต็ม
และไม่คืนสิ่งที่บอกว่าอีเมลนั้นมีบัญชีแล้วหรือยัง"* และ `invitation.route.tsx:29-32` อธิบายเหตุผลว่า
ลิงก์ที่หลุดจะกลายเป็นเครื่องมือค้นว่าใครมีบัญชี

**เหตุผลที่กลับด้าน:** ข้อมูลนี้เปิดเผยอยู่แล้ววันนี้ ผู้ถือลิงก์กดสร้างบัญชีแล้วดู 409 ก็รู้คำตอบ
เดียวกัน การย้ายมาบอกตั้งแต่โหลดหน้าจึงไม่ได้เปิดช่องใหม่ แค่ตัดการกรอกฟอร์มทิ้งออกไป

ขอบเขตของสิ่งที่รู้เพิ่มก็ยังแคบเท่าเดิม: ต้องถือ token ที่ยังไม่หมดอายุและยังไม่ถูกตอบรับของ
คำเชิญใบนั้น ซึ่งมีเพียง cluster admin ที่ออกให้ได้ ไล่เดาอีเมลทีละใบไม่ได้ — ไม่ใช่ enumeration
oracle ที่ทำงานเป็นชุด

คอมเมนต์ทั้งสองที่ต้องเขียนใหม่พร้อมเหตุผลนี้ ปล่อยไว้จะเป็นกับดักให้คนอ่านรอบหน้าเข้าใจผิด

### 2. `null` เป็นสถานะที่สาม ไม่ใช่ค่าพลาด

`has_account` เป็น `true | false | null` โดย `null` แปลว่า "ตอบไม่ได้ตอนนี้"

เดาเป็น `false` จะพาผู้ใช้ไปกรอกฟอร์มแล้วเจอ 409 — บั๊กเดิมกลับมา · เดาเป็น `true` จะขัง
คนที่ยังไม่มีบัญชีไว้หน้าเข้าสู่ระบบที่เขาผ่านไม่ได้ ทั้งสองแบบแย่กว่าการยอมรับว่าไม่รู้แล้วแสดง
สองปุ่มแบบเดิม

สถานะนี้ทำให้ลำดับ deploy ไม่สำคัญไปด้วย (ดูหัวข้อ "ลำดับ deploy")

### 3. คำตอบต้องมาจากโค้ดตัวเดียวกับที่ตัดสิน 409

ฟีเจอร์นี้มีค่าก็ต่อเมื่อคำตอบตรงกับ 409 เป๊ะ ถ้าตอบไม่ตรงมันไม่ได้แค่ไม่ช่วย — มันหลอกผู้ใช้
แล้วพาไปเจอ error เดิม จึง**ห้ามเขียนคิวรีชุดใหม่ที่ "เหมือนกัน"** แต่ต้องดึงของเดิมออกมาเป็น
ฟังก์ชันร่วมแล้วให้ทั้งสองทางเรียกตัวเดียวกัน

`micro-cluster` เข้าถึง `prismaSystem.tb_user` ได้ตรงและทำอยู่ห้าที่ใน `cluster.service.ts`
แต่ที่นั่นคิวรี**ด้วย id** คือการอ่านเรกคอร์ดของผู้ใช้ที่ยืนยันตัวตนมาแล้ว ต่างจากคำถามว่า
"อีเมลนี้มีบัญชีไหม" ซึ่งเป็นคำถามเชิงนโยบายที่ auth เป็นเจ้าของ — เส้นแบ่งความเป็นเจ้าของอยู่ตรงนี้
และ `user-invitation.service.ts` ก็คุยกับ auth ผ่าน message pattern อยู่แล้ว

## สัญญา API

`GET /api/invitations/:token` เพิ่มฟิลด์เดียว ที่เหลือคงเดิมทุกอย่าง

```jsonc
{
  "cluster_name": "CARMEN",
  "cluster_role": "user",
  "business_units": [
    { "business_unit_id": "9b6a…", "name": "CARMEN-AVG", "role": "user" }
  ],
  "expires_at": "2026-08-15T07:47:30.212Z",
  "email_masked": "s•••@gmail.com",
  "has_account": true
}
```

| ค่า | ความหมาย | หน้าจอแสดง |
|---|---|---|
| `true` | อีเมลนี้มีบัญชีแล้ว การสมัครจะได้ 409 | ปุ่ม "เข้าสู่ระบบ" ปุ่มเดียว |
| `false` | ยังไม่มีบัญชี สมัครได้ | ปุ่ม "สร้างบัญชี" ปุ่มเดียว |
| `null` · ไม่มีฟิลด์ | ตอบไม่ได้ — auth ไม่ตอบ หรือ backend ยังไม่อัปเดต | สองปุ่มเหมือนวันนี้ |

## Backend — `carmen-turborepo-backend-v2`

### `apps/micro-business/src/authen/auth/auth.service.ts`

เงื่อนไข "มีบัญชีแล้ว" ที่แท้จริงอยู่ในนี้ (บรรทัด 705-710 ใน `createVerifiedUser`) และมันไม่ได้
เช็คแค่อีเมล — มันเช็ค `OR: [{ email }, { username }]` เพราะบัญชี legacy บางรายมี username
ที่ไม่ใช่อีเมล ถ้าเช็คแค่อีเมลจะพลาดกลุ่มนั้นและตอบผิด

ดึงออกมาเป็น private helper แล้วให้ `createVerifiedUser` เรียกแทนที่จะคิวรีเอง:

```ts
private async findExistingUserByEmailOrUsername(email: string) {
  const normalized = email.trim().toLowerCase();
  return this.prismaSystem.tb_user.findFirst({
    where: { deleted_at: null, OR: [{ email: normalized }, { username: normalized }] },
    select: { email: true },
  });
}
```

แล้วเพิ่ม `userExists(email: string): Promise<boolean>` ที่เรียก helper ตัวเดียวกัน

การ normalize (`trim().toLowerCase()`) ต้องอยู่**ใน** helper ไม่ใช่ที่ caller — ไม่งั้นทางใหม่
ลืม normalize แล้วอีเมลตัวใหญ่จะตอบว่า "ไม่มีบัญชี" ทั้งที่มี

### `apps/micro-business/src/authen/auth/auth.controller.ts`

เพิ่ม `@MessagePattern({ cmd: 'auth.user-exists', service: 'auth' })` รับ `{ email }`

คืนค่าเป็น **envelope มาตรฐานเดียวกับ pattern อื่นในไฟล์** ไม่ใช่ boolean เปล่า ๆ — ดูได้จากฝั่ง
ผู้เรียกที่ `user-invitation.service.ts:1041-1047` ซึ่งอ่าน `created?.response?.status` และ
`created?.data?.id` ข้อมูลจริงคือ `{ exists: boolean }` ใต้ `data`

### `apps/micro-cluster/src/cluster/user-invitation/user-invitation.service.ts`

ใน `getInvitationByToken` (บรรทัด 754-787) หลังจากได้ `invitation` แล้ว ยิงถาม auth ด้วย
`this.businessService.send` แบบเดียวกับที่ `acceptWithSignup` ทำที่บรรทัด 1020-1039
แล้วใส่ `has_account` ลงใน `Result.ok({...})`

`.catch()` ต้องคืน `null` ไม่ใช่ throw — auth ล่มต้องไม่ทำให้หน้าคำเชิญตาย เพราะข้อมูล
คำเชิญที่เหลือ (เครือ หน่วยธุรกิจ บทบาท วันหมดอายุ) ยังอ่านได้ครบและยังมีประโยชน์

**ต้องมี timeout ด้วย ไม่ใช่แค่ `.catch()`** — `acceptWithSignup` ไม่ได้ตั้ง timeout ไว้ แต่ที่นั่น
ผู้ใช้กดปุ่มแล้วรอได้ ส่วนนี่คือ GET ที่โหลดทุกครั้งที่เปิดลิงก์จากอีเมล ถ้า auth ไม่ตอบแบบค้าง
(ไม่ใช่ error) `.catch()` จะไม่ทำงานเลยและหน้าจอจะค้างที่สปินเนอร์ ซึ่งแย่กว่าไม่มีฟีเจอร์นี้
ใส่ `timeout()` ของ RxJS สั้น ๆ ก่อน `firstValueFrom` แล้วให้มันตกลง `.catch()` เป็น `null`

### `apps/micro-cluster/src/cluster/user-invitation/interface/user-invitation.interface.ts`

เพิ่ม `has_account: boolean | null` ใน `IUserInvitationPublicView` (บรรทัด 73) และเขียน
คอมเมนต์ที่บรรทัด 78-82 ใหม่ตามการตัดสินใจข้อ 1

### `apps/backend-gateway/` — ไม่ต้องแก้โค้ด

`invitations.service.ts:27-41` เป็น passthrough ล้วน (`Result.ok(response.data)`) ไม่มี
`@Serialize` มาตัดฟิลด์ กับดักที่เคยเจอตอนเพิ่มฟิลด์ให้ entity อื่นไม่โดนงานนี้

แก้เฉพาะคำอธิบาย OpenAPI ที่ `invitations.controller.ts:111-116` ซึ่งเขียนว่าคืนเฉพาะ
"chain name, properties, role, and expiry"

## Frontend — `carmen-inventory-frontend-react`

### `lib/invitation-api.ts`

เพิ่มฟิลด์ใน `InvitationPreview` (บรรทัด 20-27) พร้อมคอมเมนต์อธิบายสามสถานะ:

```ts
/** true = มีบัญชีแล้ว · false = ยังไม่มี · null/undefined = ตอบไม่ได้ */
has_account?: boolean | null;
```

ประกาศเป็น optional เพื่อให้ backend ที่ยังไม่อัปเดตตกลงมาที่สถานะ "ไม่รู้" เองตามชนิดข้อมูล

### `routes/invitation/invitation.route.tsx`

state `mode: "choose" | "signup"` คงไว้ เปลี่ยนแค่ปุ่มบนหน้าจอ choose (บรรทัด 195-214):

```tsx
const hasAccount = state.invitation.has_account;

{hasAccount !== true && (
  <Button onClick={() => setMode("signup")}>{t("invitation.createAccount")}</Button>
)}
{hasAccount !== false && (
  <Link to={`/login?next=${encodeURIComponent(`/invitations/${token}`)}`}>
    {t("invitation.haveAccount")}
  </Link>
)}
```

เขียนเป็น `!== true` / `!== false` แทน `if/else` สามขา เพราะทั้ง `null` และ `undefined`
ตกลงมาที่พฤติกรรมเดิม (สองปุ่ม) เองโดยไม่ต้องมี branch ที่สาม

ปุ่มที่เหลือปุ่มเดียวต้องได้สไตล์ปุ่มหลัก — วันนี้ "I already have an account" เป็น
`variant="outline"` เพราะเป็นทางรอง ถ้ามันกลายเป็นทางเดียวแล้วยังจางอยู่จะดูเหมือนปุ่มที่ถูกปิด

คำบรรยายใต้หัวข้อเปลี่ยนตามสถานะ:

| `has_account` | คีย์ที่ใช้ |
|---|---|
| `true` | `invitation.signInDescription` |
| `false` | `invitation.createDescription` |
| `null` · ไม่มีฟิลด์ | `invitation.chooseDescription` (เดิม) |

### `messages/{en,th}.json`

เพิ่มสองคีย์ใต้ `auth.invitation`:

| คีย์ | en | th |
|---|---|---|
| `signInDescription` | Sign in to accept this invitation. | เข้าสู่ระบบเพื่อตอบรับคำเชิญนี้ |
| `createDescription` | Create an account to join. | สร้างบัญชีเพื่อเข้าร่วม |

## ลำดับ deploy

**ไม่มี gate ปล่อยเรียงยังไงก็ไม่พัง**

- FE เก่า + BE ใหม่ → ฟิลด์เกินถูกเมิน หน้าเดิมทำงานปกติ
- FE ใหม่ + BE เก่า → `undefined` → สองปุ่ม = พฤติกรรมวันนี้

คุณสมบัตินี้มาจากการตัดสินใจข้อ 2 โดยตรง — `null` อยู่ในสัญญาตั้งแต่แรก ไม่ใช่ค่าที่ลืมคิด

## นอกขอบเขต

- **การจัดการ 409 ยังต้องอยู่ครบ** — ระหว่างโหลดหน้ากับกดส่งฟอร์ม บัญชีอาจถูกสร้างขึ้นได้
  (เปิดสองแท็บ / admin สร้างให้) โค้ดที่ `invitation.route.tsx:166-168` ห้ามลบ ฟีเจอร์นี้ลด
  **โอกาส**เจอ 409 ไม่ได้กำจัดมัน
- **branch ที่ผู้ใช้ล็อกอินอยู่แล้ว** (บรรทัด 120-161) ไม่เปลี่ยน — `has_account` ไม่เกี่ยว
  เพราะ backend เทียบอีเมลเองและตอบ 403 ถ้าผิดบัญชี
- **การ `.catch()` ที่กลืน error ทุกชนิดเป็น `kind: "gone"`** (บรรทัด 55) เป็นคนละเรื่องและยัง
  ไม่แก้ในงานนี้
- ไม่แตะหน้า `/register` และเส้นทางสมัครปกติ

## การตรวจงาน

- `bunx tsc --noEmit` และ `bun run lint` ทั้งสองรีโป
- เทสต์ที่มีอยู่ของ `micro-business` ต้องเขียว 100% (gateway มี 15 suite แดงอยู่ก่อนแล้วบน
  `main` ไม่นับรวม)
- ตรวจในเบราว์เซอร์จริงสามเคส:
  1. token ของอีเมลที่มีบัญชีแล้ว → เห็นปุ่มเข้าสู่ระบบปุ่มเดียว
  2. token ของอีเมลที่ยังไม่มีบัญชี → เห็นปุ่มสร้างบัญชีปุ่มเดียว
  3. ปิด `micro-business` แล้วโหลดหน้า → กลับไปสองปุ่ม ไม่ใช่หน้าตายและไม่ใช่หน้าค้างโหลด

ไม่เขียนไฟล์เทสต์ใหม่ตามค่าตั้งของผู้ใช้
