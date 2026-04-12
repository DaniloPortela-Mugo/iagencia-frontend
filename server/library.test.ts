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

describe("library", () => {
  describe("list", () => {
    it("should list all materials without filters", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.library.list();
      
      expect(result).toHaveProperty("materials");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.materials)).toBe(true);
      expect(typeof result.total).toBe("number");
    });

    it("should filter materials by category", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.library.list({ category: "image" });
      
      expect(result).toHaveProperty("materials");
      expect(Array.isArray(result.materials)).toBe(true);
    });

    it("should filter materials by search term", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.library.list({ search: "logo" });
      
      expect(result).toHaveProperty("materials");
      expect(Array.isArray(result.materials)).toBe(true);
    });

    it("should support pagination", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.library.list({ limit: 10, offset: 0 });
      
      expect(result).toHaveProperty("materials");
      expect(result.materials.length).toBeLessThanOrEqual(10);
    });

    it("should support sorting", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.library.list({ sortBy: "name", sortOrder: "asc" });
      
      expect(result).toHaveProperty("materials");
      expect(Array.isArray(result.materials)).toBe(true);
    });
  });

  describe("stats", () => {
    it("should return global statistics", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const stats = await caller.library.stats();
      
      expect(stats).toHaveProperty("totalMaterials");
      expect(stats).toHaveProperty("totalSize");
      expect(stats).toHaveProperty("byCategory");
      expect(stats).toHaveProperty("byClient");
      expect(stats).toHaveProperty("recentUploads");
      expect(typeof stats.totalMaterials).toBe("number");
      expect(["number", "string"].includes(typeof stats.totalSize)).toBe(true);
    });
  });
});
