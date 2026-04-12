import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("notifications router", () => {
  it("should list all notifications for user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.list();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("should return unread count", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.unreadCount();
    
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("should create a test notification", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.createTest({
      title: "Test Notification",
      message: "This is a test notification",
      type: "system",
    });
    
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("should mark all notifications as read", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.markAllAsRead();
    
    expect(result).toEqual({ success: true });
  });

  it("should trigger event reminders check", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.triggerEventReminders();
    
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("eventsChecked");
    expect(typeof result.eventsChecked).toBe("number");
  });
});

describe("notification settings router", () => {
  it("should get notification settings with defaults", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notificationSettings.get();
    
    expect(result).toHaveProperty("eventReminder24h");
    expect(result).toHaveProperty("eventReminder1h");
    expect(result).toHaveProperty("pitAssigned");
    expect(result).toHaveProperty("contentUpdates");
    expect(result).toHaveProperty("teamConfirmation");
    expect(result).toHaveProperty("emailNotifications");
  });

  it("should update notification settings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notificationSettings.update({
      eventReminder24h: 1,
      eventReminder1h: 0,
    });
    
    expect(result).toEqual({ success: true });
  });
});
