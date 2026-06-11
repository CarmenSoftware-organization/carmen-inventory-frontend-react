/**
 * Refresh token ใน localStorage — backend ปัจจุบันรับ refresh_token ทาง request body
 * (ไม่มี cookie support) โมดูลนี้คือ swap point เดียวหาก backend เพิ่ม
 * httpOnly-cookie mode ในอนาคต (ดู spec §4)
 */
const KEY = "carmen.refresh_token";

export const refreshTokenStorage = {
  get: (): string | null => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null; // storage ถูกปิด (private mode บางเบราว์เซอร์)
    }
  },
  set: (token: string): void => {
    try {
      localStorage.setItem(KEY, token);
    } catch {
      // storage unavailable — session จะอยู่ได้แค่ใน memory
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  },
};
