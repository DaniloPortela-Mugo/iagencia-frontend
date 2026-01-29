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

describe("material versions", () => {
  it("should get versions for a material", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This should return empty array for non-existent material
    const versions = await caller.clientMaterials.getVersions({ materialId: 999999 });
    
    expect(Array.isArray(versions)).toBe(true);
  });

  it("should have uploadNewVersion procedure available", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Verify the procedure exists by checking the router structure
    expect(caller.clientMaterials.uploadNewVersion).toBeDefined();
  });

  it("should have restoreVersion procedure available", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Verify the procedure exists by checking the router structure
    expect(caller.clientMaterials.restoreVersion).toBeDefined();
  });
});

describe("material version workflow", () => {
  it("should support version number tracking", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get versions returns array with version numbers
    const versions = await caller.clientMaterials.getVersions({ materialId: 1 });
    
    expect(Array.isArray(versions)).toBe(true);
    // Each version should have versionNumber property
    if (versions.length > 0) {
      expect(versions[0]).toHaveProperty("versionNumber");
      expect(versions[0]).toHaveProperty("isCurrentVersion");
    }
  });
});
