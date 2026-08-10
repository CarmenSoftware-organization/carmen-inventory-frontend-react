import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";

// --- Mock WebSocket ---

type WsHandler = (event: { data: string }) => void;

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  onopen: (() => void) | null = null;
  onmessage: WsHandler | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  sent: string[] = [];
  closed = false;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
    this.onclose?.();
  }

  // Test helpers
  simulateOpen() {
    this.onopen?.();
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateClose() {
    this.onclose?.();
  }
}

globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;

// Mock httpClient
vi.mock("@/lib/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// markRead/markAllRead errors go through useErrorToast → sonner. Mock it so
// the mutation-failure tests don't rely on a real toast store implementation
// (same pattern as use-export-error-toast.test.tsx).
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { httpClient } from "@/lib/http-client";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";
import {
  useNotificationRealtime,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  notificationKeys,
} from "../use-notification";
import type { NotificationListResponse } from "@/types/notification";

// hook แจ้ง error ผ่าน useErrorToast ซึ่งอ่านข้อความจาก i18n — ต้องมี provider
// mark-read/mark-all-read ยังใช้ useQueryClient() ด้วย — ต้องมี QueryClientProvider
let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(IntlProvider, {
      locale: "en",
      messages: en,
      timeZone: "Asia/Bangkok",
      children,
    }),
  );

const renderRealtime = (userId: string | undefined) =>
  renderHook(() => useNotificationRealtime(userId), { wrapper });

// popover ใช้ perpage เริ่มต้น 10 (POPOVER_SIZE ภายใน hook) — ใช้ค่าเดียวกัน
// เพื่อให้คีย์แคชที่ทดสอบตรงกับที่ useUnreadNotifications() จะสร้างจริง
const UNREAD_QUERY_KEY = notificationKeys.unreadPopover(10);

/**
 * ดึง MockWebSocket instance ล่าสุดที่ถูกสร้างขึ้นในเทสต์
 * ใช้หลัง render hook เพื่อเข้าถึง WebSocket ที่ hook เพิ่งเปิด
 * @returns MockWebSocket ล่าสุดใน MockWebSocket.instances
 */
function getLatestWs(): MockWebSocket {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1];
}

describe("useNotificationRealtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockWebSocket.instances = [];
    vi.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    // WS_URL มาจาก runtime config แล้ว (เดิมคือ NEXT_PUBLIC_WS_URL env)
    setRuntimeConfigForTests({
      BACKEND_URL: "",
      X_APP_ID: "app-test",
      WS_URL: "ws://localhost:3001",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not connect when userId is undefined", () => {
    renderRealtime(undefined);

    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it("connects to WebSocket and registers user on open", async () => {
    vi.useRealTimers();

    const { result } = renderRealtime("user-1");

    const ws = getLatestWs();
    expect(ws.url).toBe("ws://localhost:3001");

    act(() => {
      ws.simulateOpen();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(ws.sent).toContain(
      JSON.stringify({ type: "register", user_id: "user-1" }),
    );
  });

  it("invalidates the notifications query when a notification message arrives", () => {
    vi.useRealTimers();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderRealtime("user-1");

    const ws = getLatestWs();
    act(() => {
      ws.simulateOpen();
    });

    act(() => {
      ws.simulateMessage({
        type: "notification",
        data: { id: "n1", title: "Test" },
      });
    });

    // hook ไม่ถือรายการเองอีกแล้ว (payload บน WS ไม่ครบฟิลด์) — สัญญาที่เหลือคือ
    // invalidate คีย์ "notifications" ทั้งกลุ่มให้ REST ดึงสดแทน
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: notificationKeys.all,
    });
  });

  it("ignores malformed WebSocket messages", () => {
    vi.useRealTimers();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderRealtime("user-1");

    const ws = getLatestWs();
    act(() => {
      ws.simulateOpen();
    });

    act(() => {
      ws.onmessage?.({ data: "not-json{{{" });
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("ignores non-notification message types", () => {
    vi.useRealTimers();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderRealtime("user-1");

    const ws = getLatestWs();
    act(() => {
      ws.simulateOpen();
    });

    act(() => {
      ws.simulateMessage({ type: "ping", data: {} });
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("sets isConnected to false on WebSocket close", async () => {
    vi.useRealTimers();

    const { result } = renderRealtime("user-1");

    const ws = getLatestWs();
    act(() => {
      ws.simulateOpen();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      ws.simulateClose();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

  it("attempts to reconnect with exponential backoff on close", () => {
    renderRealtime("user-1");

    expect(MockWebSocket.instances).toHaveLength(1);

    const ws = getLatestWs();
    act(() => {
      ws.simulateOpen();
    });

    // First close: reconnect after 1s (1000 * 2^0)
    act(() => {
      ws.simulateClose();
    });

    expect(MockWebSocket.instances).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(MockWebSocket.instances).toHaveLength(2);

    // Second close: reconnect after 2s (1000 * 2^1)
    const ws2 = getLatestWs();
    act(() => {
      ws2.simulateClose();
    });

    act(() => {
      vi.advanceTimersByTime(1999);
    });

    expect(MockWebSocket.instances).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(MockWebSocket.instances).toHaveLength(3);
  });

  it("caps reconnect delay at 30 seconds", () => {
    renderRealtime("user-1");

    const ws = getLatestWs();
    act(() => {
      ws.simulateOpen();
    });

    // Simulate many closures to exceed 30s cap
    for (let i = 0; i < 10; i++) {
      const currentWs = getLatestWs();
      act(() => {
        currentWs.simulateClose();
      });
      act(() => {
        vi.advanceTimersByTime(30000);
      });
    }

    const instancesBefore = MockWebSocket.instances.length;

    const lastWs = getLatestWs();
    act(() => {
      lastWs.simulateClose();
    });

    // Should not reconnect before 30s
    act(() => {
      vi.advanceTimersByTime(29999);
    });

    expect(MockWebSocket.instances).toHaveLength(instancesBefore);

    // Should reconnect at 30s
    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(MockWebSocket.instances).toHaveLength(instancesBefore + 1);
  });

  it("cleans up WebSocket on unmount", async () => {
    vi.useRealTimers();

    const { unmount } = renderRealtime("user-1");

    const ws = getLatestWs();
    act(() => {
      ws.simulateOpen();
    });

    unmount();

    expect(ws.closed).toBe(true);
  });

  it("resets reconnect counter on successful connection", () => {
    renderRealtime("user-1");

    const ws1 = getLatestWs();

    // Simulate close without opening (reconnect attempt 0 → delay 1s)
    act(() => {
      ws1.simulateClose();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(MockWebSocket.instances).toHaveLength(2);

    const ws2 = getLatestWs();

    // Successfully connect → counter resets
    act(() => {
      ws2.simulateOpen();
    });

    // Close again → delay should be 1s again (not 2s)
    act(() => {
      ws2.simulateClose();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(MockWebSocket.instances).toHaveLength(3);
  });
});

describe("useMarkNotificationRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it("markAsRead calls PUT /read with source and removes the notification", async () => {
    vi.mocked(httpClient.put).mockResolvedValue({ ok: true } as Response);

    queryClient.setQueryData<NotificationListResponse>(UNREAD_QUERY_KEY, {
      data: [
        { id: "n1", title: "A", type: "info", source: "broadcast" },
        { id: "n2", title: "B", type: "info", source: "personal" },
      ],
      paginate: { total: 2, page: 1, perpage: 10, pages: 1 },
    });

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({ id: "n1", source: "broadcast" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(httpClient.put).toHaveBeenCalledWith(
      "/api/proxy/api/notifications/n1/read",
      { source: "broadcast" },
    );

    const cached = queryClient.getQueryData<NotificationListResponse>(
      UNREAD_QUERY_KEY,
    );
    expect(cached?.data.map((n) => n.id)).toEqual(["n2"]);
    expect(cached?.paginate.total).toBe(1);
  });

  it("markAsRead rolls back and keeps the notification when the request fails", async () => {
    vi.mocked(httpClient.put).mockResolvedValue({ ok: false } as Response);
    // errorToast ล็อก console.error ใน DEV — คาดหมายในเคสนี้ ไม่ใช่บั๊ก แต่ทำให้
    // เอาต์พุตเทสต์ไม่สะอาด กันไว้เฉพาะเคสที่ตั้งใจให้ล้มเหลว
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const original: NotificationListResponse = {
      data: [{ id: "n1", title: "A", type: "info", source: "personal" }],
      paginate: { total: 1, page: 1, perpage: 10, pages: 1 },
    };
    queryClient.setQueryData<NotificationListResponse>(
      UNREAD_QUERY_KEY,
      original,
    );

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({ id: "n1", source: "personal" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(httpClient.put).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryData<NotificationListResponse>(UNREAD_QUERY_KEY),
    ).toEqual(original);

    consoleErrorSpy.mockRestore();
  });
});

describe("useMarkAllNotificationsRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it("markAllAsRead calls the mark-all-read endpoint and clears the unread cache", async () => {
    vi.mocked(httpClient.put).mockResolvedValue({ ok: true } as Response);

    queryClient.setQueryData<NotificationListResponse>(UNREAD_QUERY_KEY, {
      data: [
        { id: "n1", title: "A", type: "info", source: "personal" },
        { id: "n2", title: "B", type: "info", source: "broadcast" },
      ],
      paginate: { total: 2, page: 1, perpage: 10, pages: 1 },
    });

    const { result } = renderHook(() => useMarkAllNotificationsRead(), {
      wrapper,
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(httpClient.put).toHaveBeenCalledWith(
      "/api/proxy/api/notifications/mark-all-read",
    );

    const cached = queryClient.getQueryData<NotificationListResponse>(
      UNREAD_QUERY_KEY,
    );
    expect(cached?.data).toHaveLength(0);
    expect(cached?.paginate.total).toBe(0);
  });

  it("markAllAsRead rolls back and keeps notifications when the request fails", async () => {
    vi.mocked(httpClient.put).mockResolvedValue({ ok: false } as Response);
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const original: NotificationListResponse = {
      data: [{ id: "n1", title: "A", type: "info", source: "personal" }],
      paginate: { total: 1, page: 1, perpage: 10, pages: 1 },
    };
    queryClient.setQueryData<NotificationListResponse>(
      UNREAD_QUERY_KEY,
      original,
    );

    const { result } = renderHook(() => useMarkAllNotificationsRead(), {
      wrapper,
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(httpClient.put).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryData<NotificationListResponse>(UNREAD_QUERY_KEY),
    ).toEqual(original);

    consoleErrorSpy.mockRestore();
  });
});
