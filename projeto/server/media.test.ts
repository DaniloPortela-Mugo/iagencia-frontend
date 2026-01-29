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

describe("mediaChannels", () => {
  it("should list all media channels", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mediaChannels.list();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("should list media channels by type (tv)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mediaChannels.listByType({ channelType: "tv" });
    
    expect(Array.isArray(result)).toBe(true);
    // All returned channels should be TV type
    result.forEach(channel => {
      expect(channel.channelType).toBe("tv");
    });
  });

  it("should list media channels by type (radio)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mediaChannels.listByType({ channelType: "radio" });
    
    expect(Array.isArray(result)).toBe(true);
    // All returned channels should be radio type
    result.forEach(channel => {
      expect(channel.channelType).toBe("radio");
    });
  });
});

describe("mediaBroadcasts", () => {
  it("should list all media broadcasts", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mediaBroadcasts.list();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("should list broadcasts by client id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mediaBroadcasts.listByClientId({ clientId: 1 });
    
    expect(Array.isArray(result)).toBe(true);
    // All returned broadcasts should belong to the specified client
    result.forEach(broadcast => {
      expect(broadcast.clientId).toBe(1);
    });
  });

  it("should list broadcasts by channel id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mediaBroadcasts.listByChannelId({ channelId: 1 });
    
    expect(Array.isArray(result)).toBe(true);
    // All returned broadcasts should belong to the specified channel
    result.forEach(broadcast => {
      expect(broadcast.channelId).toBe(1);
    });
  });
});

describe("mediaPackages", () => {
  it("should list all media packages", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mediaPackages.list();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("should list packages by client id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mediaPackages.listByClientId({ clientId: 1 });
    
    expect(Array.isArray(result)).toBe(true);
    // All returned packages should belong to the specified client
    result.forEach(pkg => {
      expect(pkg.clientId).toBe(1);
    });
  });
});
