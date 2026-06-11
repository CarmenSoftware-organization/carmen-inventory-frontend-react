import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

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

// Set env and WebSocket mock BEFORE module evaluation
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_WS_URL = "ws://localhost:3001";
});

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

import { httpClient } from "@/lib/http-client";
import { useNotification } from "../use-notification";

/**
 * ดึง MockWebSocket instance ล่าสุดที่ถูกสร้างขึ้นในเทสต์
 * ใช้หลัง render hook เพื่อเข้าถึง WebSocket ที่ hook เพิ่งเปิด
 * @returns MockWebSocket ล่าสุดใน MockWebSocket.instances
 */
function getLatestWs(): MockWebSocket {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1];
}

describe("useNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockWebSocket.instances = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not connect when userId is undefined", () => {
    renderHook(() => useNotification(undefined));

    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it("connects to WebSocket and registers user on open", async () => {
    vi.useRealTimers();

    const { result } = renderHook(() => useNotification("user-1"));

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

  it("receives notifications from WebSocket messages", async () => {
    vi.useRealTimers();

    const { result } = renderHook(() => useNotification("user-1"));

    const ws = getLatestWs();
    act(() => {
      ws.simulateOpen();
    });

    const notification = {
      id: "n1",
      title: "Test",
      message: "Hello",
      type: "info",
      created_at: "2026-03-01T00:00:00Z",
    };

    act(() => {
      ws.simulateMessage({ type: "notification", data: notification });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    expect(result.current.notifications[0]).toEqual(notification);
  });

  it("prepends new notifications (newest first)", async () => {
    vi.useRealTimers();

    const { result } = renderHook(() => useNotification("user-1"));

    const ws = getLatestWs();
    act(() => {
      ws.simulateOpen();
    });

    act(() => {
      ws.simulateMessage({
        type: "notification",
        data: { id: "n1", title: "First" },
      });
    });

    act(() => {
      ws.simulateMessage({
        type: "notification",
        data: { id: "n2", title: "Second" },
      });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    expect(result.current.notifications[0].id).toBe("n2");
    expect(result.current.notifications[1].id).toBe("n1");
  });

  it("ignores malformed WebSocket messages", async () => {
    vi.useRealTimers();

    const { result } = renderHook(() => useNotification("user-1"));

    const ws = getLatestWs();
    act(() => {
      ws.simulateOpen();
    });

    act(() => {
      ws.onmessage?.({ data: "not-json{{{" });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(0);
    });
  });

  it("ignores non-notification message types", async () => {
    vi.useRealTimers();

    const { result } = renderHook(() => useNotification("user-1"));

    const ws = getLatestWs();
    act(() => {
      ws.simulateOpen();
    });

    act(() => {
      ws.simulateMessage({ type: "ping", data: {} });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(0);
    });
  });

  it("markAsRead calls PUT /read with category and removes the notification", async () => {
    vi.useRealTimers();
    vi.mocked(httpClient.put).mockResolvedValue({ ok: true } as Response);

    const { result } = renderHook(() => useNotification("user-1"));

    const ws = getLatestWs();
    act(() => {
      ws.simulateOpen();
    });

    act(() => {
      ws.simulateMessage({
        type: "notification",
        data: { id: "n1", title: "A", category: "user-to-user" },
      });
      ws.simulateMessage({
        type: "notification",
        data: { id: "n2", title: "B" },
      });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    await act(async () => {
      await result.current.markAsRead("n1");
    });

    expect(httpClient.put).toHaveBeenCalledWith(
      "/api/proxy/api/notifications/n1/read",
      { category: "user-to-user" },
    );
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].id).toBe("n2");
  });

  it("markAsRead rolls back and keeps the notification when the request fails", async () => {
    vi.useRealTimers();
    vi.mocked(httpClient.put).mockResolvedValue({ ok: false } as Response);

    const { result } = renderHook(() => useNotification("user-1"));

    const ws = getLatestWs();
    act(() => {
      ws.simulateOpen();
    });

    act(() => {
      ws.simulateMessage({
        type: "notification",
        data: { id: "n1", title: "A", category: "bu-to-user" },
      });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    await act(async () => {
      await result.current.markAsRead("n1");
    });

    expect(httpClient.put).toHaveBeenCalledTimes(1);
    expect(result.current.notifications).toHaveLength(1);
  });

  it("markAllAsRead calls the mark-all-read endpoint and clears notifications", async () => {
    vi.useRealTimers();
    vi.mocked(httpClient.put).mockResolvedValue({ ok: true } as Response);

    const { result } = renderHook(() => useNotification("user-1"));

    const ws = getLatestWs();
    act(() => {
      ws.simulateOpen();
    });

    act(() => {
      ws.simulateMessage({
        type: "notification",
        data: { id: "n1", title: "A" },
      });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(httpClient.put).toHaveBeenCalledWith(
      "/api/proxy/api/notifications/mark-all-read",
    );
    expect(result.current.notifications).toHaveLength(0);
  });

  it("markAllAsRead sends a single bulk request regardless of notification count", async () => {
    vi.useRealTimers();
    vi.mocked(httpClient.put).mockResolvedValue({ ok: true } as Response);

    const { result } = renderHook(() => useNotification("user-1"));

    const ws = getLatestWs();
    act(() => {
      ws.simulateOpen();
    });

    act(() => {
      ws.simulateMessage({
        type: "notification",
        data: { id: "n1", title: "A" },
      });
      ws.simulateMessage({
        type: "notification",
        data: { id: "n2", title: "B" },
      });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(httpClient.put).toHaveBeenCalledTimes(1);
    expect(result.current.notifications).toHaveLength(0);
  });

  it("markAllAsRead rolls back and keeps notifications when the request fails", async () => {
    vi.useRealTimers();
    vi.mocked(httpClient.put).mockResolvedValue({ ok: false } as Response);

    const { result } = renderHook(() => useNotification("user-1"));

    const ws = getLatestWs();
    act(() => {
      ws.simulateOpen();
    });

    act(() => {
      ws.simulateMessage({
        type: "notification",
        data: { id: "n1", title: "A" },
      });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(httpClient.put).toHaveBeenCalledTimes(1);
    expect(result.current.notifications).toHaveLength(1);
  });

  it("markAllAsRead does nothing when userId is undefined", async () => {
    vi.useRealTimers();

    const { result } = renderHook(() => useNotification(undefined));

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(httpClient.put).not.toHaveBeenCalled();
  });

  it("receives notifications from custom notification-sent event", async () => {
    vi.useRealTimers();

    const { result } = renderHook(() => useNotification(undefined));

    const notification = {
      id: "n1",
      title: "Custom",
      message: "Via event",
      type: "success",
      created_at: "2026-03-01T00:00:00Z",
    };

    act(() => {
      window.dispatchEvent(
        new CustomEvent("notification-sent", { detail: notification }),
      );
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    expect(result.current.notifications[0]).toEqual(notification);
  });

  it("sets isConnected to false on WebSocket close", async () => {
    vi.useRealTimers();

    const { result } = renderHook(() => useNotification("user-1"));

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
    renderHook(() => useNotification("user-1"));

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
    renderHook(() => useNotification("user-1"));

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

    const { unmount } = renderHook(() => useNotification("user-1"));

    const ws = getLatestWs();
    act(() => {
      ws.simulateOpen();
    });

    unmount();

    expect(ws.closed).toBe(true);
  });

  it("resets reconnect counter on successful connection", () => {
    renderHook(() => useNotification("user-1"));

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
