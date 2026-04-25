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

describe("production events", () => {
  it("should list all production events", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.production.list();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("should list production events by client", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.production.listByClientId({ clientId: 1 });
    
    expect(Array.isArray(result)).toBe(true);
    result.forEach(event => {
      expect(event.clientId).toBe(1);
    });
  });
});

describe("production checklists", () => {
  it("should list checklists by event id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.productionChecklists.listByEventId({ eventId: 1 });
    
    expect(Array.isArray(result)).toBe(true);
    result.forEach(item => {
      expect(item.eventId).toBe(1);
    });
  });
});

describe("production team", () => {
  it("should list team members by event id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.productionTeam.listByEventId({ eventId: 1 });
    
    expect(Array.isArray(result)).toBe(true);
    result.forEach(member => {
      expect(member.eventId).toBe(1);
    });
  });
});
