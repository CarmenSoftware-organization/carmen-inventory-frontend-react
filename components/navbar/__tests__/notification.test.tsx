import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render as rtlRender,
  screen,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import Notification from "../notification";
import type { Notification as NotificationType } from "@/types/notification";

// Wrap with MemoryRouter (Notification renders react-router <Link>) +
// TooltipProvider (the "View all" button uses <Tooltip>). Production wraps
// these in providers.tsx / the data router; tests need a local wrapper.
const render = (ui: ReactElement) =>
  rtlRender(
    <MemoryRouter>
      <TooltipProvider>{ui}</TooltipProvider>
    </MemoryRouter>,
  );

// Mock hooks
const markReadSpy = vi.fn();
const markAllSpy = vi.fn();
let mockNotifications: NotificationType[] = [];
// unreadCount มาจาก paginate.total ของ backend — ไม่ใช่ mockNotifications.length
// (popover ถือแถวได้มากสุดตาม perpage แต่ badge ต้องนับทั้งหมด) ตั้งค่าต่อ test
// เพื่อพิสูจน์ว่า component อ่าน unreadCount จริง ไม่ได้แอบนับ mockNotifications.length
let mockUnreadCount = 0;
// เลขที่ mockNotifications ไม่มีทางนับได้เอง (ไม่มี fixture ไหนมี 47 แถว) — ใช้เป็นค่า
// unreadCount ในเคสที่ต้องเกินเพดาน "9+" เพื่อพิสูจน์ threshold ยังผูกกับ unreadCount จริง
const MOCK_UNREAD_TOTAL = 47;
// detail ที่ useNotificationDetail จะคืน — ตั้งค่าต่อ test (badge doc_type อยู่ใน dialog)
let mockDetail: NotificationType | undefined;

const TRANSLATIONS: Record<string, string> = {
  notifications: "Notifications",
  clearAll: "Clear all",
  noNotificationsTitle: "No Notifications Yet",
  noNotificationsDesc: "You're all caught up",
  dismiss: "Dismiss",
  "modules.purchaseRequest": "Purchase Request",
};

vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => TRANSLATIONS[key] ?? key,
  useLocale: () => "en",
}));

vi.mock("@/hooks/use-notification", () => ({
  useNotificationRealtime: () => ({ isConnected: true }),
  useUnreadNotifications: () => ({
    notifications: mockNotifications,
    unreadCount: mockUnreadCount,
    isLoading: false,
    error: null,
  }),
  useMarkNotificationRead: () => ({ mutate: markReadSpy, isPending: false }),
  useMarkAllNotificationsRead: () => ({
    mutate: markAllSpy,
    isPending: false,
  }),
  useNotificationDetail: () => ({
    data: mockDetail,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ userId: "user-1", buCode: "BU001" }),
}));

function makeNotification(
  overrides: Partial<NotificationType> = {},
): NotificationType {
  return {
    id: "n1",
    title: "Test Title",
    message: "Test message",
    // @deprecated — คอลัมน์ถูกลบจากสายจริงแล้ว แต่ยังเป็น field required บน
    // Notification interface จนกว่า Task 6 จะถอดออก (ดู types/notification.ts)
    type: "info",
    source: "personal",
    created_at: "2026-03-01T10:30:00Z",
    ...overrides,
  };
}

function getTrigger() {
  return document.querySelector(
    '[data-slot="popover-trigger"]',
  ) as HTMLElement;
}

async function openPopover() {
  const user = userEvent.setup();
  const trigger = getTrigger();
  await user.click(trigger);
  // Wait for popover content to appear
  await screen.findByText("Notifications");
  return user;
}

describe("Notification component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotifications = [];
    mockUnreadCount = 0;
    mockDetail = undefined;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders bell icon button", () => {
    render(<Notification />);
    expect(getTrigger()).toBeInTheDocument();
  });

  it("does not show badge when there are no notifications", () => {
    // ตั้ง unreadCount ตรง ๆ (ไม่พึ่ง mockNotifications.length ที่บังเอิญเป็น 0)
    mockUnreadCount = 0;
    render(<Notification />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows notification count badge", () => {
    // แถวใน popover (2) ไม่เท่ากับ unreadCount (5) โดยตั้งใจ — ถ้า component แอบอ่าน
    // notifications.length แทน unreadCount จริง เทสต์นี้จะเห็น "2" ไม่ใช่ "5"
    mockNotifications = [
      makeNotification({ id: "n1" }),
      makeNotification({ id: "n2" }),
    ];
    mockUnreadCount = 5;
    render(<Notification />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

  it('shows "9+" when count exceeds 9', () => {
    // popover ถือแถวได้มากสุดตาม perpage (นี่คือแค่ 3) แต่ unreadCount มาจาก
    // paginate.total ซึ่งพุ่งเกิน 9 ได้ทั้งที่แถวในมือมีไม่กี่ใบ
    mockNotifications = Array.from({ length: 3 }, (_, i) =>
      makeNotification({ id: `n${i}` }),
    );
    mockUnreadCount = MOCK_UNREAD_TOTAL;
    render(<Notification />);
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("shows empty state when popover is opened with no notifications", async () => {
    render(<Notification />);
    await openPopover();

    expect(screen.getByText("No Notifications Yet")).toBeInTheDocument();
  });

  it("does not show Clear all button when there are no notifications", async () => {
    render(<Notification />);
    await openPopover();

    expect(
      screen.queryByRole("button", { name: "Clear all" }),
    ).not.toBeInTheDocument();
  });

  it("shows notifications list in popover", async () => {
    mockNotifications = [
      makeNotification({ id: "n1", title: "First Alert" }),
      makeNotification({ id: "n2", title: "Second Alert" }),
    ];

    render(<Notification />);
    await openPopover();

    expect(screen.getByText("First Alert")).toBeInTheDocument();
    expect(screen.getByText("Second Alert")).toBeInTheDocument();
  });

  it("shows the notification doc_type as a translated badge in the detail dialog", async () => {
    // The list row no longer renders the raw type as text — the redesign
    // (commit 8378979) moved the type into a leading module icon, and the
    // doc_type badge now lives only in the detail dialog, translated via
    // DOC_TYPE_LABEL_KEY (never the raw enum value). Opening an item with no
    // navigation target opens that dialog.
    mockNotifications = [makeNotification({ id: "n1" })];
    mockDetail = makeNotification({
      id: "n1",
      doc_type: "purchase_request",
    });

    render(<Notification />);
    const user = await openPopover();

    // sanity: the list itself does not surface the raw doc_type string
    expect(screen.queryByText("purchase_request")).not.toBeInTheDocument();

    // click the row overlay (no entity / no link → opens the detail dialog)
    const [overlay] = screen.getAllByRole("button", { name: "Test Title" });
    await user.click(overlay);

    // the dialog renders the translated label, never the raw enum value
    expect(await screen.findByText("Purchase Request")).toBeInTheDocument();
    expect(screen.queryByText("purchase_request")).not.toBeInTheDocument();
  });

  it("shows Clear all button when there are notifications", async () => {
    mockNotifications = [makeNotification()];
    // ปุ่ม Clear all คุมด้วย unreadCount ไม่ใช่ notifications.length — ต้องตั้งเอง
    mockUnreadCount = 1;

    render(<Notification />);
    await openPopover();

    expect(
      screen.getByRole("button", { name: "Clear all" }),
    ).toBeInTheDocument();
  });

  it("calls markAllAsRead when Clear all is clicked", async () => {
    mockNotifications = [makeNotification()];
    mockUnreadCount = 1;

    render(<Notification />);
    const user = await openPopover();

    await user.click(screen.getByRole("button", { name: "Clear all" }));

    expect(markAllSpy).toHaveBeenCalledOnce();
  });

  it("calls markAsRead when dismiss button is clicked", async () => {
    mockNotifications = [
      makeNotification({ id: "n1", source: "broadcast" }),
    ];

    render(<Notification />);
    const user = await openPopover();

    const dismissButton = screen.getByTitle("Dismiss");
    await user.click(dismissButton);

    // source ต้องติดไปด้วยเพื่อให้ backend เขียนลงตารางที่ถูก (broadcast vs personal)
    expect(markReadSpy).toHaveBeenCalledWith({
      id: "n1",
      source: "broadcast",
    });
  });

  it("renders markdown links in notification message", async () => {
    mockNotifications = [
      makeNotification({
        id: "n1",
        message: "Please review [PR-001](/procurement/purchase-request/123)",
      }),
    ];

    render(<Notification />);
    await openPopover();

    const link = screen.getByText("PR-001");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "/procurement/purchase-request/123",
    );
  });

  it("renders plain text for messages without links", async () => {
    mockNotifications = [
      makeNotification({ id: "n1", message: "Simple text message" }),
    ];

    render(<Notification />);
    await openPopover();

    expect(screen.getByText("Simple text message")).toBeInTheDocument();
  });

  it("renders deep-link when notification doc_type has metadata.id (or the legacy id key as a fallback)", async () => {
    mockNotifications = [
      makeNotification({
        id: "n1",
        doc_type: "purchase_request",
        metadata: { id: "pr-99" },
      }),
      // ชนิดใหม่ที่ redesign เพิ่มเข้ามา — ครอบคลุมนอกเหนือจาก PR เดิม
      makeNotification({
        id: "n2",
        doc_type: "good_received_note",
        metadata: { id: "grn-5" },
      }),
      // แถวเก่าก่อน redesign — ไม่มี metadata.id ต้อง fallback ไปที่คีย์เดิม (pr_id)
      makeNotification({
        id: "n3",
        doc_type: "purchase_request",
        metadata: { pr_id: "pr-legacy" },
      }),
    ];

    render(<Notification />);
    await openPopover();

    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/procurement/purchase-request/pr-99");
    expect(hrefs).toContain("/procurement/goods-receive-note/grn-5");
    expect(hrefs).toContain("/procurement/purchase-request/pr-legacy");
  });

  it("renders a dialog-opening button when notification has no navigation target", async () => {
    mockNotifications = [makeNotification({ id: "n1" })];

    render(<Notification />);
    await openPopover();

    // With no entity deep-link, the item wraps a <button> overlay (not <a>) —
    // the click opens the detail dialog instead of navigating.
    const buttons = screen.getAllByRole("button", { name: "Test Title" });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("shows Notifications header in popover", async () => {
    render(<Notification />);
    await openPopover();

    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });
});
