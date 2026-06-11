import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render as rtlRender,
  screen,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactElement, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import Notification from "../notification";
import type { Notification as NotificationType } from "@/types/notification";

// Wrap with TooltipProvider — Notification now uses <Tooltip> for the "View
// all" button. Production app wraps providers in components/providers.tsx;
// tests need a local wrapper.
const render = (ui: ReactElement) =>
  rtlRender(<TooltipProvider>{ui}</TooltipProvider>);

// Mock hooks
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
let mockNotifications: NotificationType[] = [];

const TRANSLATIONS: Record<string, string> = {
  notifications: "Notifications",
  clearAll: "Clear all",
  noNotificationsTitle: "No Notifications Yet",
  noNotificationsDesc: "You're all caught up",
  dismiss: "Dismiss",
};

vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => TRANSLATIONS[key] ?? key,
  useLocale: () => "en",
}));

vi.mock("@/hooks/use-notification", () => ({
  useNotification: () => ({
    isConnected: true,
    notifications: mockNotifications,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
  }),
  useNotificationDetail: () => ({
    data: undefined,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ userId: "user-1", buCode: "BU001" }),
}));

// Mock compat link
vi.mock("@/lib/compat/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
  }) => createElement("a", { href, ...props }, children),
}));

function makeNotification(
  overrides: Partial<NotificationType> = {},
): NotificationType {
  return {
    id: "n1",
    title: "Test Title",
    message: "Test message",
    type: "info",
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
  });

  afterEach(() => {
    cleanup();
  });

  it("renders bell icon button", () => {
    render(<Notification />);
    expect(getTrigger()).toBeInTheDocument();
  });

  it("does not show badge when there are no notifications", () => {
    render(<Notification />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows notification count badge", () => {
    mockNotifications = [makeNotification({ id: "n1" })];
    render(<Notification />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it('shows "9+" when count exceeds 9', () => {
    mockNotifications = Array.from({ length: 12 }, (_, i) =>
      makeNotification({ id: `n${i}` }),
    );
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
      makeNotification({ id: "n1", title: "First Alert", type: "warning" }),
      makeNotification({ id: "n2", title: "Second Alert", type: "success" }),
    ];

    render(<Notification />);
    await openPopover();

    expect(screen.getByText("First Alert")).toBeInTheDocument();
    expect(screen.getByText("Second Alert")).toBeInTheDocument();
  });

  it("shows type badge for each notification", async () => {
    mockNotifications = [
      makeNotification({ id: "n1", type: "info" }),
      makeNotification({ id: "n2", type: "error" }),
    ];

    render(<Notification />);
    await openPopover();

    expect(screen.getByText("info")).toBeInTheDocument();
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("shows Clear all button when there are notifications", async () => {
    mockNotifications = [makeNotification()];

    render(<Notification />);
    await openPopover();

    expect(
      screen.getByRole("button", { name: "Clear all" }),
    ).toBeInTheDocument();
  });

  it("calls markAllAsRead when Clear all is clicked", async () => {
    mockNotifications = [makeNotification()];

    render(<Notification />);
    const user = await openPopover();

    await user.click(screen.getByRole("button", { name: "Clear all" }));

    expect(mockMarkAllAsRead).toHaveBeenCalledOnce();
  });

  it("calls markAsRead when dismiss button is clicked", async () => {
    mockNotifications = [makeNotification({ id: "n1" })];

    render(<Notification />);
    const user = await openPopover();

    const dismissButton = screen.getByTitle("Dismiss");
    await user.click(dismissButton);

    expect(mockMarkAsRead).toHaveBeenCalledWith("n1");
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

  it("renders deep-link when notification type is PR/PO/SR with metadata.id", async () => {
    mockNotifications = [
      makeNotification({
        id: "n1",
        type: "PR",
        metadata: { id: "pr-99" },
      }),
    ];

    render(<Notification />);
    await openPopover();

    const links = screen.getAllByRole("link");
    const notificationLink = links.find(
      (link) =>
        link.getAttribute("href") === "/procurement/purchase-request/pr-99",
    );
    expect(notificationLink).toBeDefined();
  });

  it("renders a dialog-opening button when notification has no navigation target", async () => {
    mockNotifications = [makeNotification({ id: "n1" })];

    render(<Notification />);
    await openPopover();

    // With no entity deep-link and no free-form `link`, the item wraps a
    // <button> overlay (not <a>) — the click opens the detail dialog instead
    // of navigating.
    const buttons = screen.getAllByRole("button", { name: "Test Title" });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("renders a free-form link when notification has `link` but no entity", async () => {
    mockNotifications = [makeNotification({ id: "n1", link: "/some/page" })];

    render(<Notification />);
    await openPopover();

    // getNotificationHref falls back to `notification.link` when there is no
    // PR/PO/SR entity deep-link, so the item navigates instead of opening the
    // dialog.
    const links = screen.getAllByRole("link");
    const notificationLink = links.find(
      (link) => link.getAttribute("href") === "/some/page",
    );
    expect(notificationLink).toBeDefined();
  });

  it("shows Notifications header in popover", async () => {
    render(<Notification />);
    await openPopover();

    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });
});
