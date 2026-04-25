import { z } from "zod";
import { router, protectedProcedure } from "../trpc"; // ajuste o path se teu projeto usa outro
import * as dbx from "../db-helpers-extra";
import * as db from "../db-helpers";

// =========================
// AI Conversations
// =========================
export const aiConversationsRouter = router({
  listByUser: protectedProcedure
    .input(z.object({ section: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return dbx.listAiConversationsByUser((ctx as any).user.id, input.section);
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.number().optional(),
        title: z.string().optional(),
        section: z.string().optional(),
        messages: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await dbx.createAiConversation({
        clientId: input.clientId ?? null,
        userId: (ctx as any).user.id,
        title: input.title ?? "Nova conversa",
        section: input.section ?? "general",
        messages: input.messages ?? [],
        isArchived: 0,
      } as any);
      return { id };
    }),

  save: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        messages: z.any().optional(),
        isArchived: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await dbx.updateAiConversation(input.id, {
        title: input.title,
        messages: input.messages,
        isArchived: input.isArchived,
      } as any);
      return { ok: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // se você não tiver delete no db, faz "archive"
      await dbx.updateAiConversation(input.id, { isArchived: 1 } as any);
      return { ok: true };
    }),

  chat: protectedProcedure
    .input(
      z.object({
        conversationId: z.number().optional(),
        section: z.string().optional(),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // stub: devolve eco (pra UI parar de quebrar)
      return {
        reply: `OK. Recebi: ${input.message}`,
      };
    }),
});

// =========================
// Media Channels
// =========================
export const mediaChannelsRouter = router({
  list: protectedProcedure.query(async () => dbx.listMediaChannels()),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        type: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await dbx.createMediaChannel({
        name: input.name,
        type: input.type ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
      } as any);
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        type: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // se não tiver update no db-helpers-extra ainda, vira stub
      return { ok: true, note: "update stub" };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async () => {
      // stub
      return { ok: true, note: "delete stub" };
    }),
});

// =========================
// Media Broadcasts
// =========================
export const mediaBroadcastsRouter = router({
  list: protectedProcedure.query(async () => dbx.listMediaBroadcasts()),

  listByClientId: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async () => {
      // se teu schema tem client_id, implemente filtro depois
      return dbx.listMediaBroadcasts();
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        channelId: z.number(),
        title: z.string(),
        scheduledDate: z.string(), // ISO
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await dbx.createMediaBroadcast({
        clientId: input.clientId,
        channelId: input.channelId,
        title: input.title,
        scheduledDate: new Date(input.scheduledDate) as any,
        notes: input.notes ?? null,
      } as any);
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async () => ({ ok: true, note: "update stub" })),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async () => ({ ok: true, note: "delete stub" })),
});

// =========================
// Calendar Events
// =========================
export const calendarEventsRouter = router({
  list: protectedProcedure.query(async () => dbx.listCalendarEvents()),

  listByClientId: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => dbx.listCalendarEventsByClientId(input.clientId)),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        title: z.string(),
        startDate: z.string(),
        endDate: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await dbx.createCalendarEvent({
        clientId: input.clientId,
        title: input.title,
        startDate: new Date(input.startDate) as any,
        endDate: input.endDate ? (new Date(input.endDate) as any) : null,
        notes: input.notes ?? null,
        createdBy: (ctx as any).user.id,
      } as any);
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async () => ({ ok: true, note: "update stub" })),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async () => ({ ok: true, note: "delete stub" })),
});

// =========================
// Scheduled Searches
// =========================
export const scheduledSearchesRouter = router({
  getByClientId: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => db.getScheduledSearchByClientId(input.clientId)),

  list: protectedProcedure.query(async () => db.getAllScheduledSearches()),

  recentLogs: protectedProcedure.query(async () => {
    // se você quiser, depois buscamos os logs reais
    return [];
  }),

  runNow: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async () => ({ ok: true })),
});

// =========================
// Notification Settings (stub)
// =========================
export const notificationSettingsRouter = router({
  get: protectedProcedure.query(async () => {
    return { enabled: 1, channels: ["email"] };
  }),
  update: protectedProcedure.input(z.any()).mutation(async () => ({ ok: true })),
});
