# แผน implement — หน้ารับคำเชิญรู้ว่าอีเมลมีบัญชีแล้วหรือยัง

> **สำหรับ agentic worker:** ใช้ `superpowers:subagent-driven-development` (แนะนำ) หรือ
> `superpowers:executing-plans` เดินทีละ task ขั้นตอนใช้ checkbox (`- [ ]`) สำหรับติดตาม

**Goal:** ให้หน้า `/invitations` เสนอทางเดียวที่ถูก — มีบัญชีแล้วเห็นแค่ "เข้าสู่ระบบ" ยังไม่มี
เห็นแค่ "สร้างบัญชี" — แทนที่จะให้ผู้ถูกเชิญเดาแล้วไปเจอ 409 หลังกรอกฟอร์มเสร็จ

**Architecture:** `micro-business` เปิด message pattern `auth.user-exists` ที่อ่านจาก **ฟังก์ชัน
เดียวกับ** ที่เส้นทางสมัครใช้ตัดสิน 409 · `micro-cluster` เรียก pattern นั้นตอนอ่านคำเชิญแล้วใส่
`has_account` ลงในคำตอบ · frontend อ่านฟิลด์นั้นเลือกปุ่ม โดย `null` แปลว่า "ตอบไม่ได้" และตกกลับ
ไปแสดงสองปุ่มเหมือนวันนี้

**Tech Stack:** NestJS microservices (`@MessagePattern` / `ClientProxy` / RxJS) · Prisma ·
React Router 7 + `use-intl` · bun ทั้งสองรีโป

**Spec:** `docs/superpowers/specs/2026-08-08-invitation-account-aware-cta-design.md`

## Global Constraints

- **ไม่เขียนไฟล์เทสต์ใหม่ และไม่มีขั้นตอน TDD** ตามค่าตั้งของผู้ใช้ — ขั้นตอน "เขียนเทสต์ที่ fail"
  / "รันให้เห็นว่า fail" / "รันเทสต์ให้ผ่าน" ถูกตัดออกจากแผนนี้โดยเจตนา **ถ้าส่งงานให้ subagent
  ต้องบอกข้อนี้กับมันตรง ๆ เพราะมันไม่ได้รับสืบทอดมาเอง**
- **static check ไม่ใช่เทสต์ ยังต้องรัน** — type-check และ lint ทุก task
- **เทสต์ที่มีอยู่ต้องไม่พัง** — `micro-business` ต้องเขียว 100% (`backend-gateway` มี 15 suite
  แดงอยู่ก่อนแล้วบน `main` ไม่นับรวม)
- สองรีโป: `carmen-turborepo-backend-v2` (Task 1-2) และ `carmen-inventory-frontend-react`
  (Task 3) — path ในแผนนี้อ้างจาก root ของรีโปที่ระบุในหัว task
- frontend ทำงานบน branch `feature/invitation-account-aware-cta` ซึ่ง rebase อยู่บน
  `fix/invitation-api-path` แล้ว — **ห้ามทำงานบน `main`**
- commit message เขียนเป็นภาษาไทย
- ค่า `has_account` มีสามสถานะเสมอ: `true` · `false` · `null` — `null` ไม่ใช่ค่าพลาด แปลว่า
  "ตอบไม่ได้ตอนนี้" และต้องทำให้หน้าจอกลับไปแสดงสองปุ่ม

## โครงไฟล์

| ไฟล์ | รับผิดชอบ | task |
|---|---|---|
| `micro-business/…/auth.service.ts` | ฟังก์ชันเดียวที่ตอบว่า "อีเมลนี้มีบัญชีไหม" + wrapper สำหรับ service อื่น | 1 |
| `micro-business/…/auth.controller.ts` | เปิด `auth.user-exists` ให้ service อื่นเรียก | 1 |
| `micro-cluster/…/user-invitation.interface.ts` | สัญญาของ `IUserInvitationPublicView` | 2 |
| `micro-cluster/…/user-invitation.service.ts` | ถาม auth แบบมี timeout แล้วใส่ `has_account` | 2 |
| `backend-gateway/…/invitations.controller.ts` | คำอธิบาย OpenAPI ให้ตรงของจริง | 2 |
| `lib/invitation-api.ts` | ชนิดข้อมูลฝั่ง client | 3 |
| `messages/{en,th}.json` | คำบรรยายสองสถานะใหม่ | 3 |
| `routes/invitation/invitation.route.tsx` | เลือกปุ่มและคำบรรยายจาก `has_account` | 3 |

---

### Task 1: `micro-business` — เปิด `auth.user-exists`

**รีโป:** `carmen-turborepo-backend-v2`

**Files:**
- Modify: `apps/micro-business/src/authen/auth/auth.service.ts:696-711` (ดึง lookup ออกเป็น helper)
- Modify: `apps/micro-business/src/authen/auth/auth.service.ts` (เพิ่ม `userExistsForService` ต่อจาก `createVerifiedUserForService` ที่จบบรรทัด 951)
- Modify: `apps/micro-business/src/authen/auth/auth.controller.ts` (เพิ่ม pattern ต่อจาก `createVerifiedUser` ที่จบบรรทัด 147)

**Interfaces:**
- Produces: `auth.user-exists` รับ `{ data: { email: string } }` คืน
  `{ data: { exists: boolean }, response: { status: 200 } }` เมื่อสำเร็จ และ
  `{ response: { status: 502 } }` (ไม่มี `data`) เมื่อล้มเหลว — Task 2 อ่านผ่านรูปนี้

- [ ] **Step 1: ดึง lookup ออกเป็น private helper**

เพิ่มเมธอดนี้ใน `AuthService` วางไว้เหนือ `createVerifiedUser` (บรรทัด 688):

```ts
  /**
   * The single place that answers "does this address already have an account?"
   * ที่เดียวที่ตอบว่า "อีเมลนี้มีบัญชีอยู่แล้วหรือยัง"
   *
   * Both the sign-up path — which turns a hit into 409 — and the invitation screen — which turns
   * it into "sign in instead" — read this. One function is what stops the screen and the API from
   * disagreeing: a screen that says "create an account" where the API answers 409 is worse than no
   * screen hint at all. The username arm only fires for legacy accounts whose username is not their
   * email, so a duplicate email is never reported as a username collision.
   * ทั้งเส้นทางสมัคร (ซึ่งแปลงผลลัพธ์เป็น 409) และหน้าคำเชิญ (ซึ่งแปลงเป็น "ให้เข้าสู่ระบบแทน") อ่านจากที่นี่
   * การมีฟังก์ชันเดียวคือสิ่งที่กันไม่ให้หน้าจอกับ API ตอบไม่ตรงกัน — หน้าจอที่บอกว่า "สร้างบัญชีได้" ทั้งที่
   * API ตอบ 409 แย่กว่าไม่มีคำใบ้เลย ส่วนเงื่อนไข username ทำงานเฉพาะบัญชี legacy ที่ username ไม่ใช่
   * อีเมล อีเมลซ้ำจึงไม่ถูกรายงานว่าเป็นการชนของ username
   * @param email - Raw address, normalised inside / อีเมลดิบ ถูก normalize ภายใน
   * @returns The matching row's email, or null when nothing matches / อีเมลของแถวที่ตรง หรือ null เมื่อไม่มี
   */
  private async findExistingUserByEmailOrUsername(
    email: string,
  ): Promise<{ email: string } | null> {
    const normalized = email.trim().toLowerCase();
    return this.prismaSystem.tb_user.findFirst({
      where: {
        deleted_at: null,
        OR: [{ email: normalized }, { username: normalized }],
      },
      select: { email: true },
    });
  }
```

การ normalize อยู่**ใน** helper โดยเจตนา ไม่ใช่ที่ผู้เรียก — ไม่งั้นทางเรียกใหม่ที่ลืม normalize จะตอบว่า
"ไม่มีบัญชี" ทั้งที่มี

- [ ] **Step 2: ให้ `createVerifiedUser` เรียก helper แทนคิวรีของตัวเอง**

ใน `createVerifiedUser` แทนที่บรรทัด 701-711 (คอมเมนต์ "One lookup, not two…" และ
`const existingUser = await this.prismaSystem.tb_user.findFirst({…});`) ด้วยบรรทัดเดียว:

```ts
    const existingUser = await this.findExistingUserByEmailOrUsername(input.email);
```

**คงบรรทัด 696-699 ไว้** (`normalizedEmail` / `normalizedUsername`) เพราะยังถูกใช้ต่อที่บรรทัด
715 (เทียบว่าชนที่อีเมลหรือ username) และในการสร้าง `keycloakUserPayload`

- [ ] **Step 3: เพิ่ม `userExistsForService`**

วางต่อจาก `createVerifiedUserForService` (จบที่บรรทัด 951):

```ts
  /**
   * Answer whether an address already has an account, for another service
   * ตอบให้ service อื่นว่าอีเมลมีบัญชีอยู่แล้วหรือยัง
   *
   * Returns the same envelope shape the other patterns use, so a caller that cannot reach a
   * conclusion (502) is distinguishable from one that concluded "no account" (200 + false). The
   * invitation screen depends on that difference: it shows both ways in when the answer is unknown.
   * คืน envelope รูปเดียวกับ pattern อื่น เพื่อให้ผู้เรียกแยกออกระหว่าง "สรุปไม่ได้" (502) กับ "สรุปว่าไม่มี
   * บัญชี" (200 + false) หน้าคำเชิญพึ่งความต่างนี้ เพราะมันแสดงทั้งสองทางเมื่อคำตอบไม่แน่ชัด
   * @param input - Contains the address to check / ประกอบด้วยอีเมลที่จะตรวจ
   * @returns `{ exists: boolean }` under `data` on success / `{ exists: boolean }` ใต้ `data` เมื่อสำเร็จ
   */
  async userExistsForService(input: { email: string }): Promise<any> {
    this.logger.debug({ function: 'userExistsForService' }, AuthService.name);

    try {
      const existing = await this.findExistingUserByEmailOrUsername(input.email);
      return {
        data: { exists: existing !== null },
        response: { status: HttpStatus.OK, message: 'Success' },
      };
    } catch (error: unknown) {
      this.logger.error(
        error instanceof Error
          ? error.message
          : 'An error occurred while checking whether an address has an account',
        { file: AuthService.name, function: 'userExistsForService' },
      );
      return {
        response: {
          status: HttpStatus.BAD_GATEWAY,
          message: 'Could not check the address. Please try again.',
        },
      };
    }
  }
```

- [ ] **Step 4: เปิด message pattern ใน controller**

วางต่อจาก `createVerifiedUser` (จบที่บรรทัด 147):

```ts
  /**
   * Answer whether an address already has an account, so a service can offer the right next step
   * before a person fills in a form — the invitation screen shows "sign in" instead of "create
   * account". Same lookup the sign-up path turns into 409, so the two can never disagree.
   * ตอบว่าอีเมลมีบัญชีอยู่แล้วหรือยัง เพื่อให้ service เสนอขั้นถัดไปที่ถูกต้องก่อนผู้ใช้กรอกฟอร์ม — หน้าคำเชิญ
   * แสดง "เข้าสู่ระบบ" แทน "สร้างบัญชี" ใช้การค้นชุดเดียวกับที่เส้นทางสมัครแปลงเป็น 409 ทั้งสองทางจึงตอบ
   * ต่างกันไม่ได้
   * @param payload - Microservice payload carrying the address to check / payload ที่มีอีเมลที่จะตรวจ
   * @returns `{ exists: boolean }` under `data` / `{ exists: boolean }` ใต้ `data`
   */
  @MessagePattern({ cmd: 'auth.user-exists', service: 'auth' })
  async userExists(@Payload() payload: MicroservicePayload): Promise<MicroserviceResponse> {
    // payload.data carries an email address — log the function and version only, never the address.
    // payload.data มีอีเมล — log เฉพาะชื่อฟังก์ชันและเวอร์ชัน ห้าม log อีเมล
    this.logger.debug(
      { function: 'userExists', version: payload.version },
      AuthController.name,
    );

    const auditContext = this.createAuditContext(payload);
    return runWithAuditContext(auditContext, () =>
      this.authService.userExistsForService(payload.data),
    );
  }
```

- [ ] **Step 5: static check**

```bash
cd carmen-turborepo-backend-v2
bun run check-types
bun run lint
```
คาดหวัง: ผ่านทั้งคู่

- [ ] **Step 6: เทสต์เดิมของ micro-business ต้องยังเขียว**

```bash
cd carmen-turborepo-backend-v2/apps/micro-business && bun run test
```
คาดหวัง: เขียว 100% — ถ้าแดง ให้ดูว่าเทสต์ตัวไหนพึ่งคิวรีเดิมใน `createVerifiedUser` แล้วแก้ให้
มันพึ่ง helper ตัวใหม่ **ห้ามข้ามไป Task 2 โดยปล่อยให้แดง**

- [ ] **Step 7: commit**

```bash
cd carmen-turborepo-backend-v2
git add apps/micro-business/src/authen/auth/auth.service.ts apps/micro-business/src/authen/auth/auth.controller.ts
git commit -m "feat(auth): เปิด auth.user-exists จาก lookup ตัวเดียวกับที่ตัดสิน 409"
```

---

### Task 2: `micro-cluster` + gateway — ใส่ `has_account` ในคำตอบ

**รีโป:** `carmen-turborepo-backend-v2`

**Files:**
- Modify: `apps/micro-cluster/src/cluster/user-invitation/interface/user-invitation.interface.ts:73-86`
- Modify: `apps/micro-cluster/src/cluster/user-invitation/user-invitation.service.ts:3` (import `timeout`)
- Modify: `apps/micro-cluster/src/cluster/user-invitation/user-invitation.service.ts:738-787` (คอมเมนต์ + เรียก auth + ใส่ฟิลด์)
- Modify: `apps/backend-gateway/src/application/invitations/invitations.controller.ts:113`

**Interfaces:**
- Consumes: `auth.user-exists` จาก Task 1 — `{ data: { exists: boolean }, response: { status } }`
- Produces: `GET /api/invitations/:token` คืน `has_account: boolean | null` เพิ่มจากของเดิม
  ทั้งหมด — Task 3 อ่านฟิลด์นี้

- [ ] **Step 1: เพิ่มฟิลด์ใน interface**

ใน `IUserInvitationPublicView` เพิ่มต่อจาก `email_masked: string;` (บรรทัด 85):

```ts
  /**
   * Whether the invited address already has an account. `true` means signing up would be rejected
   * as a duplicate and the screen should offer sign-in; `false` means signing up is the way in;
   * `null` means auth could not answer in time and the screen must keep offering both ways.
   *
   * This does say something about the address, which the fields above deliberately do not. It is
   * accepted because the sign-up call already discloses the same fact — as a 409 — but only after
   * the person has filled in the whole form and thrown it away. Moving it earlier spends no secret
   * that was being kept. Reading it still needs an unexpired, unanswered token that only a cluster
   * admin can issue, so it cannot be swept across addresses.
   * อีเมลที่ถูกเชิญมีบัญชีอยู่แล้วหรือยัง `true` แปลว่าสมัครไปก็ถูกปฏิเสธว่าซ้ำ หน้าจอควรเสนอให้เข้าสู่ระบบ
   * `false` แปลว่าสมัครได้ `null` แปลว่า auth ตอบไม่ทัน หน้าจอต้องคงทั้งสองทางไว้
   *
   * ฟิลด์นี้บอกบางอย่างเกี่ยวกับอีเมล ซึ่งฟิลด์ข้างบนตั้งใจไม่บอก ที่ยอมรับได้เพราะการเรียกสมัครเปิดเผยข้อเท็จจริง
   * เดียวกันอยู่แล้วในรูป 409 เพียงแต่หลังผู้ใช้กรอกฟอร์มจนจบแล้วทิ้ง การย้ายมาบอกก่อนจึงไม่ได้จ่ายความลับ
   * ที่เคยเก็บไว้ และการอ่านยังต้องถือ token ที่ยังไม่หมดอายุและยังไม่ถูกตอบรับ ซึ่งมีแต่ cluster admin ออกให้ได้
   * จึงกวาดข้ามอีเมลไม่ได้
   */
  has_account: boolean | null;
```

ลบประโยค `and neither is anything saying whether it already has an account.` กับ
`และไม่คืนสิ่งที่บอกว่าอีเมลนั้นมีบัญชีแล้วหรือยัง` ออกจากคอมเมนต์ของ `email_masked` (บรรทัด 81, 83)
เพราะมันขัดกับฟิลด์ใหม่

- [ ] **Step 2: import `timeout` และตั้งค่าเพดานเวลา**

แก้บรรทัด 3 ของ `user-invitation.service.ts`:

```ts
import { firstValueFrom, timeout } from 'rxjs';
```

เพิ่มค่าคงที่ระดับโมดูล วางไว้เหนือ `@Injectable()` ของคลาส:

```ts
/**
 * How long the invitation screen waits for auth before giving up and answering "unknown"
 * หน้าคำเชิญรอ auth นานแค่ไหนก่อนยอมแพ้แล้วตอบว่า "ไม่รู้"
 *
 * This is a GET that runs every time someone opens the link from their mail, so a hung auth must
 * not hang the page. A plain `.catch()` does not cover this: a call that never settles never
 * rejects either, and the screen would sit on its spinner forever — worse than not having the hint.
 * นี่คือ GET ที่ทำงานทุกครั้งที่มีคนเปิดลิงก์จากอีเมล auth ที่ค้างจึงต้องไม่ทำให้หน้าค้างตาม `.catch()` เปล่า ๆ
 * ไม่ครอบกรณีนี้ เพราะการเรียกที่ไม่จบก็ไม่ reject เช่นกัน หน้าจอจะค้างที่สปินเนอร์ตลอดไป ซึ่งแย่กว่าไม่มีคำใบ้
 */
const AUTH_LOOKUP_TIMEOUT_MS = 3_000;
```

- [ ] **Step 3: เพิ่มเมธอดถาม auth**

วางเป็น private method ใน `UserInvitationService` เหนือ `getInvitationByToken` (บรรทัด 753):

```ts
  /**
   * Ask auth whether the invited address already has an account, degrading to "unknown" on any doubt
   * ถาม auth ว่าอีเมลที่ถูกเชิญมีบัญชีอยู่แล้วหรือยัง โดยตกเป็น "ไม่รู้" เมื่อมีข้อสงสัย
   *
   * Every failure mode collapses to null on purpose — timeout, transport error, an envelope that is
   * not 200, or a `data.exists` that is not a boolean. Guessing false sends someone into a form that
   * ends in 409; guessing true traps someone at a sign-in they cannot pass. Only a clear answer is
   * worth acting on.
   * ทุกรูปแบบความล้มเหลวยุบเป็น null โดยเจตนา — timeout, ข้อผิดพลาดของการรับส่ง, envelope ที่ไม่ใช่ 200
   * หรือ `data.exists` ที่ไม่ใช่ boolean การเดาว่า false จะส่งคนไปกรอกฟอร์มที่จบด้วย 409 การเดาว่า true
   * จะขังคนไว้ที่หน้าเข้าสู่ระบบที่เขาผ่านไม่ได้ มีแต่คำตอบที่ชัดเจนเท่านั้นที่ควรเอาไปใช้
   * @param email - The invited address / อีเมลที่ถูกเชิญ
   * @returns true/false when auth answered, null when it could not / true/false เมื่อ auth ตอบ null เมื่อตอบไม่ได้
   */
  private async lookupHasAccount(email: string): Promise<boolean | null> {
    const answer = await firstValueFrom(
      this.businessService
        .send({ cmd: 'auth.user-exists', service: 'auth' }, { data: { email: email } })
        .pipe(timeout(AUTH_LOOKUP_TIMEOUT_MS)),
    ).catch((error: unknown) => {
      this.logger.error(
        `Could not check whether the invited address has an account: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        UserInvitationService.name,
      );
      return null;
    });

    if (answer?.response?.status !== HttpStatus.OK) {
      return null;
    }
    return typeof answer?.data?.exists === 'boolean' ? answer.data.exists : null;
  }
```

- [ ] **Step 4: เรียกใช้แล้วใส่ลงในคำตอบ**

ใน `getInvitationByToken` เพิ่มบรรทัดนี้หลัง `businessUnits` (บรรทัด 771-774) และก่อน
`return Result.ok({`:

```ts
    const hasAccount = await this.lookupHasAccount(invitation.email);
```

แล้วเพิ่มฟิลด์ต่อจาก `email_masked` ใน `Result.ok({…})`:

```ts
      email_masked: maskEmail(invitation.email),
      has_account: hasAccount,
```

- [ ] **Step 5: แก้คอมเมนต์ของเมธอดให้ตรงกับของจริง**

ในคอมเมนต์บรรทัด 738-749 ลบสองประโยคที่ขัดกับฟิลด์ใหม่ —
`Nothing here says whether that address already has an account — that answer belongs to the person
who owns it, not the person holding the link.` และ `และที่นี่ไม่มีอะไรบอกว่าอีเมลนั้นมีบัญชีแล้วหรือยัง
เพราะคำตอบนั้นเป็นของเจ้าของอีเมล ไม่ใช่ของคนที่ถือลิงก์` — แล้วแทนด้วย:

```
   * It does say whether that address already has an account, so the screen can offer the one way in
   * that will work. That is the same fact the sign-up call discloses as a 409, only early enough to
   * save a wasted form.
   * ที่นี่บอกว่าอีเมลนั้นมีบัญชีแล้วหรือยัง เพื่อให้หน้าจอเสนอทางเข้าทางเดียวที่ใช้ได้จริง ซึ่งเป็นข้อเท็จจริง
   * เดียวกับที่การเรียกสมัครเปิดเผยในรูป 409 เพียงแต่เร็วพอที่จะไม่ต้องกรอกฟอร์มทิ้ง
```

- [ ] **Step 6: แก้คำอธิบาย OpenAPI ของ gateway**

ใน `apps/backend-gateway/src/application/invitations/invitations.controller.ts` บรรทัด 113
เปลี่ยน `chain name, properties, role, and expiry` เป็น
`chain name, properties, role, expiry, and whether the address already has an account` และใน
ข้อความไทยเปลี่ยน `ชื่อเครือ หน่วยธุรกิจ บทบาท และวันหมดอายุ` เป็น
`ชื่อเครือ หน่วยธุรกิจ บทบาท วันหมดอายุ และอีเมลนั้นมีบัญชีแล้วหรือยัง`

**ไม่ต้องแก้โค้ดอื่นใน gateway** — `invitations.service.ts:27-41` เป็น passthrough
(`Result.ok(response.data)`) ไม่มี `@Serialize` มาตัดฟิลด์

- [ ] **Step 7: static check**

```bash
cd carmen-turborepo-backend-v2
bun run check-types
bun run lint
```
คาดหวัง: ผ่านทั้งคู่

- [ ] **Step 8: ตรวจของจริงด้วย API ก่อนไป frontend**

รัน backend ทั้งชุดขึ้นมา แล้วยิง โดยใช้ token ของคำเชิญที่ยังไม่หมดอายุและยังไม่ถูกตอบรับ

**อย่าเขียน token จริงลงไฟล์ใด ๆ ในรีโป** — token คำเชิญเป็นความลับที่ใช้เข้าถึงได้จริง ใครถือก็กด
ตอบรับแล้วได้สมาชิกภาพใน cluster ทันที ส่งผ่าน shell ตอนรันเท่านั้น

```bash
TOKEN=<token จากลิงก์ในอีเมลคำเชิญ>
curl -s -H "x-app-id: 9c83fd4b-ce3f-4de2-a522-349ad1280b10" \
  "http://localhost:4000/api/invitations/$TOKEN" \
  | grep -o '"has_account":[^,}]*'
```
คาดหวัง: `"has_account":true` หรือ `"has_account":false` — **ถ้าได้ `null` ห้ามเดินต่อ** แปลว่า
`micro-cluster` คุยกับ `micro-business` ไม่ได้ ให้ไล่ดู log ของทั้งสองตัวก่อน

จากนั้นทดสอบทางถอย: ปิด `micro-business` แล้วยิงซ้ำ
คาดหวัง: `"has_account":null` ภายในเวลาไม่เกิน ~3 วินาที และฟิลด์อื่นยังครบ **ไม่ใช่** 500 และ
**ไม่ใช่** ค้างยาว

- [ ] **Step 9: commit**

```bash
cd carmen-turborepo-backend-v2
git add apps/micro-cluster/src/cluster/user-invitation/ apps/backend-gateway/src/application/invitations/invitations.controller.ts
git commit -m "feat(invitation): คืน has_account ในคำตอบของ GET /api/invitations/:token"
```

---

### Task 3: frontend — หน้า `/invitations` เลือกปุ่มตาม `has_account`

**รีโป:** `carmen-inventory-frontend-react` (branch `feature/invitation-account-aware-cta`)

**Files:**
- Modify: `lib/invitation-api.ts:20-27`
- Modify: `messages/en.json:492` และ `messages/th.json:492` (แทรกต่อจาก `chooseDescription`)
- Modify: `routes/invitation/invitation.route.tsx:26-37` (คอมเมนต์) และ `:195-214` (หน้าจอ choose)

**Interfaces:**
- Consumes: `has_account: boolean | null` จาก Task 2

- [ ] **Step 1: เพิ่มฟิลด์ในชนิดข้อมูล**

ใน `InvitationPreview` เพิ่มต่อจาก `email_masked: string;`:

```ts
  /**
   * อีเมลของคำเชิญมีบัญชีอยู่แล้วหรือยัง — `true` เสนอเข้าสู่ระบบอย่างเดียว `false` เสนอสมัครอย่างเดียว
   *
   * ประกาศเป็น optional เพื่อให้ backend รุ่นก่อนหน้านี้ตกลงมาที่สถานะ "ไม่รู้" เองตามชนิดข้อมูล ไม่ต้องมี
   * โค้ดพิเศษรองรับ และเป็น `null` ได้เมื่อ backend ตอบไม่ทัน — ทั้งสองกรณีต้องแสดงสองทางเลือกเหมือนเดิม
   */
  has_account?: boolean | null;
```

- [ ] **Step 2: เพิ่มคำแปลสองคีย์**

`messages/en.json` แทรกต่อจากบรรทัด 492 (`chooseDescription`):

```json
      "signInDescription": "Sign in to accept this invitation.",
      "createDescription": "Create an account to join.",
```

`messages/th.json` ตำแหน่งเดียวกัน:

```json
      "signInDescription": "เข้าสู่ระบบเพื่อตอบรับคำเชิญนี้",
      "createDescription": "สร้างบัญชีเพื่อเข้าร่วม",
```

- [ ] **Step 3: แก้หน้าจอ choose**

แทนที่ `return (…)` ก้อนสุดท้ายของคอมโพเนนต์ (บรรทัด 195-214) ด้วย:

```tsx
  // true = มีบัญชีแล้ว · false = ยังไม่มี · null/undefined = backend ตอบไม่ได้ (auth ไม่ตอบ หรือยัง
  // ไม่ได้ deploy) กรณีที่สามต้องคงสองทางเลือกไว้เหมือนเดิม เพราะเดาผิดทางไหนก็พาผู้ใช้ไปชนกำแพง —
  // เดาว่าไม่มีบัญชีจะจบที่ 409 หลังกรอกฟอร์ม เดาว่ามีจะขังคนไว้ที่หน้าเข้าสู่ระบบที่เขาผ่านไม่ได้
  const hasAccount = state.invitation.has_account;

  return (
    <AuthSplitShell
      title={t("invitation.title")}
      subtitle={
        hasAccount === true
          ? t("invitation.signInDescription")
          : hasAccount === false
            ? t("invitation.createDescription")
            : t("invitation.chooseDescription")
      }
    >
      <InvitationSummary invitation={state.invitation} />
      <div className="mt-4 flex flex-col gap-2">
        {hasAccount !== true && (
          <Button className="h-10 w-full" onClick={() => setMode("signup")}>
            {t("invitation.createAccount")}
          </Button>
        )}
        {hasAccount !== false && (
          <Button
            variant={hasAccount === true ? "default" : "outline"}
            className="h-10 w-full"
            asChild
          >
            <Link
              to={`/login?next=${encodeURIComponent(`/invitations/${token}`)}`}
            >
              {hasAccount === true
                ? t("signIn")
                : t("invitation.haveAccount")}
            </Link>
          </Button>
        )}
      </div>
    </AuthSplitShell>
  );
```

สามอย่างที่ตั้งใจ: เขียน `!== true` / `!== false` แทน if/else สามขา เพราะ `null` กับ `undefined`
ตกมาที่พฤติกรรมเดิมเองโดยไม่ต้องมี branch ที่สาม · `variant` สลับเป็น `default` เมื่อเหลือปุ่มเดียว
ไม่งั้นปุ่มจางจะดูเหมือนปุ่มที่ถูกปิด · ป้ายเปลี่ยนเป็น `t("signIn")` เพราะ "ฉันมีบัญชีอยู่แล้ว" อ่านแล้ว
แปลกเมื่อเป็นทางเลือกเดียว

- [ ] **Step 4: แก้คอมเมนต์หัวคอมโพเนนต์**

ในคอมเมนต์บรรทัด 26-37 ย่อหน้าที่ขึ้นต้นว่า `หน้าจอไม่เคยถาม backend ว่าอีเมลของคำเชิญมีบัญชีอยู่แล้ว
หรือไม่…` ขัดกับโค้ดใหม่แล้ว แทนด้วย:

```
 * หน้าจอถาม backend ว่าอีเมลของคำเชิญมีบัญชีอยู่แล้วหรือไม่ (`has_account`) เพื่อเสนอทางเข้าทางเดียว
 * ที่ใช้ได้จริง ข้อเท็จจริงนี้ถูกเปิดเผยอยู่แล้วในรูป 409 ตอนกดสร้างบัญชี การถามก่อนจึงไม่ได้จ่ายความลับ
 * เพิ่ม แต่ตัดการกรอกฟอร์มทิ้งออกไป เมื่อ backend ตอบไม่ได้ (`null`) หน้าจอกลับไปเสนอทั้งสองทาง และ
 * backend ยังเป็นผู้ตัดสินความจริงเสมอ — กดสร้างบัญชีทั้งที่มีอยู่แล้วยังได้ 409 พร้อมคำแนะนำให้ไปเข้าสู่ระบบ
```

- [ ] **Step 5: static check**

```bash
cd carmen-inventory-frontend-react
bun run typecheck
bun run lint
```
คาดหวัง: typecheck สะอาด · lint 0 errors (129 warnings เดิมของโปรเจกต์ไม่นับ)

- [ ] **Step 6: เทสต์เดิมต้องยังเขียว**

```bash
bun test:run
```
คาดหวัง: เขียวทั้งหมด

- [ ] **Step 7: ตรวจในเบราว์เซอร์ สามเคส**

รัน `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev` ไม่ก็ `bun dev` เฉย ๆ (config.local
ชี้ `http://localhost:4000` อยู่แล้ว) แล้วเปิด `http://localhost:3000/invitations?token=<token>`

1. **token ของอีเมลที่มีบัญชีแล้ว** → เห็นสรุปคำเชิญ + ปุ่ม "Sign in" ปุ่มเดียวแบบทึบ ไม่มีปุ่มสร้างบัญชี
2. **token ของอีเมลที่ยังไม่มีบัญชี** → เห็นปุ่ม "Create a new account" ปุ่มเดียว ไม่มีลิงก์เข้าสู่ระบบ
3. **ปิด `micro-business` แล้วโหลดใหม่** → กลับไปเห็นสองปุ่มเหมือนก่อนหน้านี้ ภายในไม่กี่วินาที
   ไม่ใช่หน้า "ลิงก์ใช้ไม่ได้แล้ว" และไม่ใช่สปินเนอร์ค้าง

เช็ค console ต้องไม่มี error และสลับภาษาเป็นไทยดูว่าคำบรรยายใหม่ขึ้นครบทั้งสองสถานะ

**การหา token สองใบ:** ใช้ token ที่มีอยู่สำหรับเคสหนึ่ง แล้วออกคำเชิญใหม่จากหน้า Cluster Admin
ของ `carmen-platform` ไปยังอีเมลที่ยังไม่มีบัญชีสำหรับอีกเคส — **ฐาน `:4000` เป็นฐาน dev ที่ใช้
ร่วมกัน** การออกคำเชิญเป็นการเขียนจริง ให้ใช้อีเมลทดสอบที่ไม่ชนของใครและอย่าลบข้อมูลเดิม

- [ ] **Step 8: commit**

```bash
cd carmen-inventory-frontend-react
git add lib/invitation-api.ts messages/en.json messages/th.json routes/invitation/invitation.route.tsx
git commit -m "feat(invitation): เสนอทางเข้าทางเดียวที่ใช้ได้ตาม has_account"
```

---

## สิ่งที่ตั้งใจไม่ทำในแผนนี้

- **ไม่ลบการจัดการ 409** ที่ `invitation.route.tsx:166-168` — ระหว่างโหลดหน้ากับกดส่งฟอร์ม บัญชี
  อาจถูกสร้างขึ้นได้ (เปิดสองแท็บ / admin สร้างให้) แผนนี้ลด**โอกาส**เจอ 409 ไม่ได้กำจัดมัน
- **ไม่แตะ branch ที่ผู้ใช้ล็อกอินอยู่แล้ว** (บรรทัด 120-161) — `has_account` ไม่เกี่ยว เพราะ backend
  เทียบอีเมลเองและตอบ 403 ถ้าผิดบัญชี
- **ไม่แก้ `.catch()` ที่กลืน error ทุกชนิดเป็น `kind: "gone"`** (บรรทัด 55) — คนละเรื่อง
- ไม่แตะ `/register` และเส้นทางสมัครปกติ

## ลำดับ deploy

ปล่อยเรียงยังไงก็ไม่พัง — FE เก่า + BE ใหม่ ฟิลด์เกินถูกเมิน · FE ใหม่ + BE เก่า ได้ `undefined`
แล้วตกไปที่สองปุ่มซึ่งคือพฤติกรรมวันนี้ ไม่ต้องมี gate และไม่ต้องนัดเวลา
