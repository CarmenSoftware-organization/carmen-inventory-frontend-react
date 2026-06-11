import { describe, it, expect } from "vitest";
import { getLogCreatedAt, type ActivityLog } from "@/types/activity-log";

/**
 * สร้าง ActivityLog จำลองสำหรับทดสอบ โดย override ได้บางฟิลด์
 * @param overrides - ฟิลด์ที่ต้องการเขียนทับค่าเริ่มต้น
 * @returns ActivityLog object สำหรับใช้ในเทสต์
 */
function makeLog(overrides: Partial<ActivityLog> = {}): ActivityLog {
  return {
    id: "log-1",
    action: "login",
    entity_type: "auth",
    entity_id: "e-1",
    actor_id: "a-1",
    actor_username: "admin@zebra.com",
    actor_firstname: "Admin",
    actor_middlename: null,
    actor_lastname: "Zebra",
    description: "User admin@zebra.com logged in",
    ip_address: "::1",
    user_agent: "node",
    meta_data: null,
    old_data: null,
    new_data: null,
    audit: {
      created: { at: "2026-05-27T12:46:56.727Z", id: "a-1", name: "Admin Zebra" },
      updated: { at: "2026-05-27T12:46:56.727Z" },
    },
    ...overrides,
  };
}

describe("getLogCreatedAt", () => {
  it("returns the log timestamp from audit.created.at", () => {
    const log = makeLog();
    expect(getLogCreatedAt(log)).toBe("2026-05-27T12:46:56.727Z");
  });

  it("returns empty string when audit is missing", () => {
    const log = makeLog({ audit: undefined as unknown as ActivityLog["audit"] });
    expect(getLogCreatedAt(log)).toBe("");
  });
});
