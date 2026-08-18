import { Navigate } from "react-router";
import { useLandingPath } from "@/hooks/use-landing-path";

/**
 * หน้าแรกหลังล็อกอิน — ไป leaf แรกที่ผู้ใช้เปิดได้จริง
 *
 * เดิม index route hardcode `/dashboard` ซึ่งมี `licenseFeature: "dashboard.widget"`
 * จึงถูกล็อกได้เมื่อ BU ไม่ได้ซื้อ → ผู้ใช้เจอ `AccessDeniedBlock` ทันทีที่ล็อกอินเสร็จ
 * โดยไม่มี history ให้ถอยกลับ
 *
 * render เป็น `<Outlet />` ใต้ `ProfileGate` ใน `RootLayout` อยู่แล้ว hook จึงอ่าน
 * profile/license ที่โหลดเสร็จแล้วได้เลย
 *
 * แยกไฟล์ออกจาก `router.tsx` เพราะไฟล์นั้น export `router` ที่ไม่ใช่คอมโพเนนต์ปนอยู่
 * — วางไว้ด้วยกันจะโดน `react-refresh/only-export-components` เพิ่มอีกตัว
 */
export default function LandingRedirect() {
  return <Navigate to={useLandingPath()} replace />;
}
