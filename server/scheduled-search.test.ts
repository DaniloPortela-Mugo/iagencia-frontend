import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-scheduled",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("scheduled searches", () => {
  describe("list", () => {
    it("should return list of scheduled searches", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.scheduledSearches.list();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("status", () => {
    it("should return scheduler status", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.scheduledSearches.status();

      expect(result).toHaveProperty("isRunning");
      expect(result).toHaveProperty("enabledCount");
      expect(typeof result.isRunning).toBe("boolean");
      expect(typeof result.enabledCount).toBe("number");
    });
  });

  describe("recentLogs", () => {
    it("should return recent execution logs", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.scheduledSearches.recentLogs();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("create and update", () => {
    it("should create a scheduled search for a client", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // First create a client to use
      const client = await caller.clients.create({
        name: "Test Client for Schedule",
        description: "Test description",
      });

      // Create scheduled search
      const result = await caller.scheduledSearches.create({
        clientId: client.id,
        frequency: "12h",
        isEnabled: 1,
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");
    });

    it("should get scheduled search by client id", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a client
      const client = await caller.clients.create({
        name: "Test Client for Schedule Get",
        description: "Test description",
      });

      // Create scheduled search
      await caller.scheduledSearches.create({
        clientId: client.id,
        frequency: "6h",
        isEnabled: 1,
      });

      // Get by client id
      const result = await caller.scheduledSearches.getByClientId({ clientId: client.id });

      expect(result).toBeDefined();
      expect(result?.clientId).toBe(client.id);
      expect(result?.frequency).toBe("6h");
    });

    it("should toggle scheduled search on/off", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a client
      const client = await caller.clients.create({
        name: "Test Client for Toggle",
        description: "Test description",
      });

      // Create scheduled search (enabled)
      await caller.scheduledSearches.create({
        clientId: client.id,
        frequency: "24h",
        isEnabled: 1,
      });

      // Toggle off
      const toggleResult = await caller.scheduledSearches.toggle({
        clientId: client.id,
        isEnabled: 0,
      });

      expect(toggleResult.success).toBe(true);

      // Verify it's disabled
      const updated = await caller.scheduledSearches.getByClientId({ clientId: client.id });
      expect(updated?.isEnabled).toBe(0);
    });
  });
});
