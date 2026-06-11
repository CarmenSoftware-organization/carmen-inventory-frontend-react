/**
 * Runtime config ของ SPA — โหลดจาก /config.json ตอน boot (ไม่ฝังใน bundle)
 * เพื่อให้ artifact เดียว deploy ได้ทุก environment (uat/aws)
 */
export interface RuntimeConfig {
  /** Origin ของ backend (ค่าว่าง = same-origin, ใช้กับ Vite dev proxy) */
  BACKEND_URL: string;
  /** ค่า x-app-id header ที่ backend ต้องการ */
  X_APP_ID: string;
}

let config: RuntimeConfig | null = null;

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  const res = await fetch("/config.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load /config.json");
  const json = (await res.json()) as Partial<RuntimeConfig>;
  if (typeof json.BACKEND_URL !== "string") {
    throw new Error("config.json missing BACKEND_URL");
  }
  if (typeof json.X_APP_ID !== "string" || !json.X_APP_ID) {
    throw new Error("config.json missing X_APP_ID");
  }
  config = {
    BACKEND_URL: json.BACKEND_URL.replace(/\/+$/, ""),
    X_APP_ID: json.X_APP_ID,
  };
  return config;
}

export function getRuntimeConfig(): RuntimeConfig {
  if (!config) {
    throw new Error("Runtime config not loaded — call loadRuntimeConfig() first");
  }
  return config;
}

/** สำหรับ unit tests เท่านั้น */
export function setRuntimeConfigForTests(value: RuntimeConfig | null): void {
  config = value;
}
