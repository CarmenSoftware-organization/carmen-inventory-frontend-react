export const APP_VERSION = __APP_VERSION__;
/** git commit สั้นของบิลด์ หรือ `unknown` — ดู `appCommit()` ใน scripts/app-version.ts */
export const APP_COMMIT = __APP_COMMIT__;
/** เวลาที่ build (ISO 8601) */
export const APP_BUILD_TIME = __APP_BUILD_TIME__;
/** เลข release ล่าสุดจาก changelog.json — What's New เทียบกับค่านี้ ไม่ใช่ APP_VERSION ที่ขึ้นทุก build */
export const APP_RELEASE = __APP_RELEASE__;
