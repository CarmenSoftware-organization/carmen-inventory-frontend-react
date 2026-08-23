/**
 * OpenTelemetry ฝั่งเบราว์เซอร์ — ส่ง error และ trace ไป SigNoz ผ่าน gateway
 *
 * **โมดูลนี้ถูก import แบบ dynamic เท่านั้น** (ดู `main.tsx`) เพื่อให้ Vite แยก
 * เป็น chunk ต่างหาก — environment ที่ไม่ได้เปิด telemetry จะไม่โหลด SDK ลงเครื่อง
 * ผู้ใช้เลย ถ้า import ตรง ๆ SDK ราว 60-80 KB จะติดไปกับ bundle หลักของทุกคน
 * เพื่อฟีเจอร์ที่เปิดเฉพาะ dev
 *
 * ปลายทางคือ gateway ไม่ใช่ SigNoz ตรง ๆ เพราะ OTLP ของ SigNoz OSS ไม่มี
 * authentication เลย — รายละเอียดอยู่ใน `telemetry.controller.ts` ฝั่ง backend
 */
import { context, trace } from "@opentelemetry/api";
import { SeverityNumber, logs } from "@opentelemetry/api-logs";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { DocumentLoadInstrumentation } from "@opentelemetry/instrumentation-document-load";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import {
  BatchSpanProcessor,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  WebTracerProvider,
} from "@opentelemetry/sdk-trace-web";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

import { getRuntimeConfig } from "@/lib/runtime-config";
import { tokenStore } from "@/lib/auth/token-store";

const LOGGER_NAME = "carmen.spa";

/**
 * สัดส่วน trace ที่เก็บ — เบราว์เซอร์สร้าง span ได้เร็วกว่า backend มาก
 * (ทุก fetch ทุก navigation) เก็บทั้งหมดคือการถมดิสก์ด้วยข้อมูลที่ไม่มีใครดู
 * error ไม่ถูกกระทบเพราะมันเป็น log ไม่ใช่ span
 */
const TRACE_SAMPLE_RATIO = 0.1;

let started = false;

interface InitOptions {
  serviceName: string;
  version: string;
}

/**
 * header ของทุก request ที่ส่ง telemetry
 *
 * **ส่งเป็นฟังก์ชัน ไม่ใช่ object** — exporter อ่าน header ตอน export แต่ละครั้ง
 * ถ้าส่ง object ที่ประเมินค่าไว้แล้ว token จะถูกแช่ไว้ตั้งแต่ตอน init แล้วกลายเป็น
 * ของหมดอายุหลัง refresh รอบแรก ทำให้ telemetry เงียบไปทั้งหมดโดยขึ้นแค่ 401
 * ที่ไม่มีใครเห็น
 */
async function telemetryHeaders(): Promise<Record<string, string>> {
  const token = tokenStore.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function initTelemetry({ serviceName, version }: InitOptions): void {
  if (started) return;
  started = true;

  const { BACKEND_URL } = getRuntimeConfig();
  const base = `${BACKEND_URL}/telemetry/v1`;

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: version,
    "service.namespace": "carmen",
    // คีย์ชื่อเดิม ไม่ใช่ deployment.environment.name ของ semconv ล่าสุด —
    // SigNoz index ตัวนี้ (ยืนยันจาก facet "Deployment Environment")
    "deployment.environment": "dev",
    "browser.user_agent": navigator.userAgent,
  });

  // ── logs ────────────────────────────────────────────────────────────────
  const loggerProvider = new LoggerProvider({
    resource,
    processors: [
      // เวอร์ชัน browser flush ให้เองตอนผู้ใช้ปิดแท็บหรือสลับแอป (auto flush on
      // document hide) — error ที่เกิดวินาทีสุดท้ายก่อนปิดหน้าจึงไม่หาย
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({ url: `${base}/logs`, headers: telemetryHeaders }),
      }),
    ],
  });
  logs.setGlobalLoggerProvider(loggerProvider);

  // ── traces ──────────────────────────────────────────────────────────────
  const tracerProvider = new WebTracerProvider({
    resource,
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(TRACE_SAMPLE_RATIO),
    }),
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({ url: `${base}/traces`, headers: telemetryHeaders }),
      ),
    ],
  });
  tracerProvider.register({ contextManager: new ZoneContextManager() });

  registerInstrumentations({
    tracerProvider,
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new FetchInstrumentation({
        // **ข้อที่พลาดง่ายที่สุด** — web SDK ไม่ใส่ traceparent ให้ request ข้าม
        // origin โดย default ถ้าไม่ตั้งค่านี้ trace ฝั่งเบราว์เซอร์กับฝั่ง backend
        // จะเป็นคนละเส้นแยกกัน ซึ่งทำลายเหตุผลหลักที่เลือก SigNoz ตั้งแต่แรก
        propagateTraceHeaderCorsUrls: [new RegExp(escapeRegExp(BACKEND_URL))],
        // อย่าให้ตัว exporter เองสร้าง span ของตัวเอง ไม่งั้นวนไม่จบ
        ignoreUrls: [new RegExp(escapeRegExp(base))],
      }),
    ],
  });

  installErrorHandlers();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * ส่ง error หนึ่งรายการขึ้น SigNoz
 *
 * ผูกกับ active context เสมอ จึงได้ `trace_id` ติดไปด้วยเมื่อ error เกิดระหว่าง
 * fetch ที่มี span อยู่ — คลิกจาก error ไปดูว่า request ไหนพังได้เลย
 */
export function reportError(
  message: string,
  detail?: { stack?: string; source?: string; extra?: Record<string, unknown> },
): void {
  try {
    logs.getLogger(LOGGER_NAME).emit({
      severityNumber: SeverityNumber.ERROR,
      severityText: "ERROR",
      body: message,
      attributes: {
        "carmen.source": detail?.source ?? "unknown",
        "carmen.url": window.location.pathname,
        ...(detail?.stack ? { "exception.stacktrace": detail.stack } : {}),
        ...(detail?.extra
          ? Object.fromEntries(
              Object.entries(detail.extra).map(([k, v]) => [
                `carmen.${k}`,
                typeof v === "object" ? JSON.stringify(v) : String(v),
              ]),
            )
          : {}),
      },
      context: context.active(),
    });
  } catch {
    // telemetry ต้องไม่มีวันทำให้แอปพัง — กลืนทุก error ที่นี่โดยตั้งใจ
  }
}

/**
 * error ที่เกิด **ก่อน login** ส่งผ่านช่อง anonymous ที่ gateway จำกัดหนัก
 *
 * ตอนนั้นยังไม่มี token จึงผ่าน guard ปกติไม่ได้ แต่บั๊กกลุ่มนี้กระทบหนักที่สุด
 * (ผู้ใช้เข้าระบบไม่ได้เลย) ใช้ `fetch` ตรง ๆ ไม่ผ่าน SDK เพราะ SDK ยัง init
 * ไม่ได้ในหลายเคสที่ boot ล้ม
 */
export async function reportPreLoginError(
  message: string,
  stack?: string,
): Promise<void> {
  try {
    const { BACKEND_URL } = getRuntimeConfig();
    const nowNano = `${Date.now()}000000`;
    await fetch(`${BACKEND_URL}/telemetry/v1/anonymous/logs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        resourceLogs: [
          {
            resource: {
              attributes: [
                { key: "service.name", value: { stringValue: "carmen-spa" } },
                { key: "service.namespace", value: { stringValue: "carmen" } },
                { key: "deployment.environment", value: { stringValue: "dev" } },
              ],
            },
            scopeLogs: [
              {
                scope: { name: LOGGER_NAME },
                logRecords: [
                  {
                    timeUnixNano: nowNano,
                    severityNumber: 17,
                    severityText: "ERROR",
                    body: { stringValue: message },
                    attributes: [
                      { key: "carmen.source", value: { stringValue: "pre-login" } },
                      { key: "carmen.url", value: { stringValue: window.location.pathname } },
                      ...(stack
                        ? [{ key: "exception.stacktrace", value: { stringValue: stack } }]
                        : []),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    });
  } catch {
    // เงียบเสมอ — ถ้าส่ง error ไม่ได้ก็ไม่ควรสร้าง error ใหม่ทับ
  }
}

function installErrorHandlers(): void {
  window.addEventListener("error", (e) => {
    reportError(e.message || "window.onerror", {
      stack: e.error instanceof Error ? e.error.stack : undefined,
      source: "window.onerror",
      extra: { file: e.filename, line: e.lineno, col: e.colno },
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    reportError(
      reason instanceof Error ? reason.message : String(reason),
      {
        stack: reason instanceof Error ? reason.stack : undefined,
        source: "unhandledrejection",
      },
    );
  });
}

/** ใช้ตอน error boundary จับได้ */
export function currentTraceId(): string | undefined {
  return trace.getActiveSpan()?.spanContext().traceId;
}
