import { ApiError } from "@/lib/api-error";
import type { UserInfo } from "@/lib/auth/auth-api";
import { httpClient } from "@/lib/http-client";

/**
 * API ของฝั่งผู้ถูกเชิญ — อ่านคำเชิญ สมัครจากคำเชิญ ยินยอม และปฏิเสธ
 *
 * `getInvitation` และ `acceptInvitationWithSignup` เรียกได้ตอนยังไม่ล็อกอิน เพราะ token ในลิงก์
 * คือหลักฐานอย่างเดียวที่ backend ต้องการ ส่วน accept/decline ต้องล็อกอินแล้ว (backend เทียบอีเมล
 * ของผู้ล็อกอินกับอีเมลของคำเชิญ) — `httpClient` แนบ Authorization ให้เองเมื่อมี token และไม่แนบ
 * เมื่อไม่มี ทั้งสองกรณีจึงใช้ตัวเดียวกันได้
 */

export interface InvitationBusinessUnit {
  business_unit_id: string;
  name: string;
  role: string;
}

export interface InvitationPreview {
  cluster_name: string;
  cluster_role: string;
  business_units: InvitationBusinessUnit[];
  expires_at: string;
  /** อีเมลแบบปิดบัง เช่น j•••@example.com — backend ไม่คืนอีเมลเต็มโดยตั้งใจ */
  email_masked: string;
}

/**
 * อ่านคำเชิญด้วย token — public ไม่ต้องล็อกอิน
 *
 * @param token - token ดิบจากลิงก์ในอีเมล
 * @returns ข้อมูลคำเชิญเท่าที่หน้าจอต้องใช้
 * @throws {ApiError} statusCode 410 เมื่อลิงก์ไม่มีจริง หมดอายุ หรือถูกใช้ไปแล้ว
 */
export async function getInvitation(token: string): Promise<InvitationPreview> {
  const res = await httpClient.get(
    `/api/proxy/invitations/${encodeURIComponent(token)}`,
  );
  if (!res.ok) throw await ApiError.from(res, "This invitation link is no longer valid");
  const json = await res.json();
  return json?.data ?? json;
}

/**
 * สร้างบัญชีแล้วรับคำเชิญในคราวเดียว — สำหรับผู้ถูกเชิญที่ยังไม่มีบัญชี
 *
 * ไม่มีฟิลด์อีเมลใน payload โดยตั้งใจ — อีเมลมาจากคำเชิญที่ token ระบุเท่านั้น
 *
 * @param token - token ดิบจากลิงก์ในอีเมล
 * @param payload - รหัสผ่านและข้อมูลโปรไฟล์ที่กรอกในฟอร์ม
 * @throws {ApiError} statusCode 409 เมื่ออีเมลนั้นมีบัญชีอยู่แล้ว · 410 เมื่อลิงก์ใช้ไม่ได้
 */
export async function acceptInvitationWithSignup(
  token: string,
  payload: { password: string; user_info: UserInfo },
): Promise<void> {
  const res = await httpClient.post(
    `/api/proxy/invitations/${encodeURIComponent(token)}/accept-with-signup`,
    payload,
  );
  if (!res.ok) throw await ApiError.from(res, "Could not create the account");
}

/**
 * ยินยอมรับคำเชิญด้วยบัญชีที่ล็อกอินอยู่
 *
 * @param token - token ดิบจากลิงก์ในอีเมล
 * @throws {ApiError} statusCode 403 เมื่ออีเมลของผู้ล็อกอินไม่ตรงกับคำเชิญ · 410 เมื่อลิงก์ใช้ไม่ได้
 */
export async function acceptInvitation(token: string): Promise<void> {
  const res = await httpClient.post(
    `/api/proxy/invitations/${encodeURIComponent(token)}/accept`,
  );
  if (!res.ok) throw await ApiError.from(res, "Could not accept the invitation");
}

/**
 * ปฏิเสธคำเชิญ
 *
 * @param token - token ดิบจากลิงก์ในอีเมล
 * @throws {ApiError} statusCode 403 เมื่ออีเมลของผู้ล็อกอินไม่ตรงกับคำเชิญ · 410 เมื่อลิงก์ใช้ไม่ได้
 */
export async function declineInvitation(token: string): Promise<void> {
  const res = await httpClient.post(
    `/api/proxy/invitations/${encodeURIComponent(token)}/decline`,
  );
  if (!res.ok) throw await ApiError.from(res, "Could not decline the invitation");
}
