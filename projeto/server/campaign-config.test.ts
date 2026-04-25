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

describe("clientSocialMedia", () => {
  it("should have listByClientId procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Verify the procedure exists and can be called
    expect(caller.clientSocialMedia.listByClientId).toBeDefined();
  });

  it("should have create procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.clientSocialMedia.create).toBeDefined();
  });

  it("should have update procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.clientSocialMedia.update).toBeDefined();
  });

  it("should have delete procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.clientSocialMedia.delete).toBeDefined();
  });
});

describe("clientCompetitors", () => {
  it("should have listByClientId procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.clientCompetitors.listByClientId).toBeDefined();
  });

  it("should have create procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.clientCompetitors.create).toBeDefined();
  });

  it("should have update procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.clientCompetitors.update).toBeDefined();
  });

  it("should have delete procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.clientCompetitors.delete).toBeDefined();
  });
});

describe("clientNewsSources", () => {
  it("should have listByClientId procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.clientNewsSources.listByClientId).toBeDefined();
  });

  it("should have create procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.clientNewsSources.create).toBeDefined();
  });

  it("should have update procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.clientNewsSources.update).toBeDefined();
  });

  it("should have delete procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.clientNewsSources.delete).toBeDefined();
  });
});

describe("clientMediaPreferences", () => {
  it("should have listByClientId procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.clientMediaPreferences.listByClientId).toBeDefined();
  });

  it("should have create procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.clientMediaPreferences.create).toBeDefined();
  });

  it("should have update procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.clientMediaPreferences.update).toBeDefined();
  });

  it("should have delete procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.clientMediaPreferences.delete).toBeDefined();
  });
});
