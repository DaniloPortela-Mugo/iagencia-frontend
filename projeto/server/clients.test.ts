import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
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
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("clients router", () => {
  it("should list all clients", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const clients = await caller.clients.list();
    expect(Array.isArray(clients)).toBe(true);
  });

  it("should create a new client", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.clients.create({
      name: "Test Client",
      description: "Test Description",
      slogan: "Test Slogan",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("should get client by id", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a client first
    const created = await caller.clients.create({
      name: "Test Client for Get",
      description: "Test Description",
    });

    // Get the client
    const client = await caller.clients.getById({ id: created.id });
    expect(client).toBeDefined();
    expect(client?.name).toBe("Test Client for Get");
  });

  it("should update client", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a client first
    const created = await caller.clients.create({
      name: "Test Client for Update",
      description: "Original Description",
    });

    // Update the client
    const result = await caller.clients.update({
      id: created.id,
      description: "Updated Description",
    });

    expect(result.success).toBe(true);

    // Verify update
    const updated = await caller.clients.getById({ id: created.id });
    expect(updated?.description).toBe("Updated Description");
  });
});

describe("contents router", () => {
  it("should create content for a client", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a client first
    const client = await caller.clients.create({
      name: "Test Client for Content",
    });

    // Create content
    const result = await caller.contents.create({
      clientId: client.id,
      title: "Test Content",
      contentType: "social_post",
      content: "This is test content",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("should list contents by client", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a client
    const client = await caller.clients.create({
      name: "Test Client for Content List",
    });

    // Create content
    await caller.contents.create({
      clientId: client.id,
      title: "Test Content 1",
      contentType: "social_post",
      content: "Content 1",
    });

    // List contents
    const contents = await caller.contents.listByClientId({ clientId: client.id });
    expect(Array.isArray(contents)).toBe(true);
    expect(contents.length).toBeGreaterThan(0);
  });

  it("should update content status", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create client and content
    const client = await caller.clients.create({
      name: "Test Client for Status Update",
    });

    const content = await caller.contents.create({
      clientId: client.id,
      title: "Test Content",
      contentType: "social_post",
      content: "Test",
    });

    // Update status
    const result = await caller.contents.update({
      id: content.id,
      status: "in_approval",
    });

    expect(result.success).toBe(true);

    // Verify update
    const updated = await caller.contents.getById({ id: content.id });
    expect(updated?.status).toBe("in_approval");
  });
});

describe("pits router", () => {
  it("should create a PIT", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a client
    const client = await caller.clients.create({
      name: "Test Client for PIT",
    });

    // Create PIT
    const result = await caller.pits.create({
      clientId: client.id,
      title: "Test PIT",
      briefing: "This is a test briefing",
      priority: "high",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("should list PITs by client", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create client and PIT
    const client = await caller.clients.create({
      name: "Test Client for PIT List",
    });

    await caller.pits.create({
      clientId: client.id,
      title: "Test PIT",
      briefing: "Test briefing",
    });

    // List PITs
    const pits = await caller.pits.listByClientId({ clientId: client.id });
    expect(Array.isArray(pits)).toBe(true);
    expect(pits.length).toBeGreaterThan(0);
  });
});

describe("AI conversations", () => {
  it("should handle chat messages", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.aiConversations.chat({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello" },
      ],
      section: "creation",
    });

    expect(result).toHaveProperty("content");
    expect(typeof result.content).toBe("string");
  });
});
