import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as dbHelpers from "./db-helpers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-calendar",
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

describe("calendar events router", () => {
  let testClientId: number;
  let testEventId: number;

  beforeAll(async () => {
    // Create a test client for calendar events
    testClientId = await dbHelpers.createClient({
      name: "Test Client for Calendar",
      description: "Test client for calendar tests",
      createdBy: 1,
    });
  });

  afterAll(async () => {
    // Cleanup: delete test client
    if (testClientId) {
      await dbHelpers.deleteClient(testClientId);
    }
  });

  it("should create a calendar event", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.calendarEvents.create({
      clientId: testClientId,
      title: "Test Social Post",
      description: "Test event description",
      eventType: "social_post",
      startDate: new Date("2026-01-15T10:00:00"),
      endDate: new Date("2026-01-15T11:00:00"),
      platform: "instagram",
      color: "#8B5CF6",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
    testEventId = result.id;
  });

  it("should list all calendar events", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const events = await caller.calendarEvents.list();

    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
  });

  it("should list calendar events by client", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const events = await caller.calendarEvents.listByClientId({
      clientId: testClientId,
    });

    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].clientId).toBe(testClientId);
  });

  it("should get calendar event by id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const event = await caller.calendarEvents.getById({
      id: testEventId,
    });

    expect(event).toBeDefined();
    expect(event?.title).toBe("Test Social Post");
    expect(event?.eventType).toBe("social_post");
    expect(event?.platform).toBe("instagram");
  });

  it("should update a calendar event", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.calendarEvents.update({
      id: testEventId,
      title: "Updated Social Post",
      status: "in_progress",
    });

    expect(result).toEqual({ success: true });

    // Verify the update
    const updatedEvent = await caller.calendarEvents.getById({
      id: testEventId,
    });
    expect(updatedEvent?.title).toBe("Updated Social Post");
    expect(updatedEvent?.status).toBe("in_progress");
  });

  it("should create events with different types", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // TV Broadcast event
    const tvEvent = await caller.calendarEvents.create({
      clientId: testClientId,
      title: "TV Program Broadcast",
      eventType: "tv_broadcast",
      startDate: new Date("2026-01-20T18:00:00"),
      platform: "tv",
    });
    expect(tvEvent).toHaveProperty("id");

    // Meeting event
    const meetingEvent = await caller.calendarEvents.create({
      clientId: testClientId,
      title: "Campaign Strategy Meeting",
      eventType: "meeting",
      startDate: new Date("2026-01-22T14:00:00"),
      allDay: 0,
    });
    expect(meetingEvent).toHaveProperty("id");

    // Rally event
    const rallyEvent = await caller.calendarEvents.create({
      clientId: testClientId,
      title: "Public Rally",
      eventType: "rally",
      startDate: new Date("2026-01-25T16:00:00"),
      allDay: 1,
    });
    expect(rallyEvent).toHaveProperty("id");

    // Cleanup created events
    await caller.calendarEvents.delete({ id: tvEvent.id });
    await caller.calendarEvents.delete({ id: meetingEvent.id });
    await caller.calendarEvents.delete({ id: rallyEvent.id });
  });

  it("should delete a calendar event", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.calendarEvents.delete({
      id: testEventId,
    });

    expect(result).toEqual({ success: true });

    // Verify deletion
    const deletedEvent = await caller.calendarEvents.getById({
      id: testEventId,
    });
    expect(deletedEvent).toBeUndefined();
  });
});
