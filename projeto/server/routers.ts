// server/routers.ts
import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "./_core/trpc";
import * as dbHelpers from "./db-helpers";
import { systemRouter } from "./_core/systemRouter";
import { searchNewsForClient } from "./news-search";
import { runDueSearches, isSchedulerRunning } from "./scheduler";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import * as extraDb from "./db-helpers-extra";


type CtxUser = { id: string; legacyId?: number | null };
const legacyUserId = (user: CtxUser | null | undefined) => {
  const v = user?.legacyId;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return 1; // fallback
};

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  clients: router({
    list: protectedProcedure.query(async () => dbHelpers.getAllClients()),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => dbHelpers.getClientById(input.id)),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          logo: z.string().optional(),
          slogan: z.string().optional(),
          proposals: z.string().optional(),
          achievements: z.string().optional(),
          toneOfVoice: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await dbHelpers.createClient({ ...(input as any), createdBy: legacyUserId(ctx.user) } as any);
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          logo: z.string().optional(),
          slogan: z.string().optional(),
          proposals: z.string().optional(),
          achievements: z.string().optional(),
          toneOfVoice: z.string().optional(),
          status: z.enum(["active", "paused", "completed"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await dbHelpers.updateClient(id, data as any);
        return { success: true };
      }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await dbHelpers.deleteClient(input.id);
      return { success: true };
    }),
  }),

  clientNewsSources: router({
    listByClientId: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => dbHelpers.getNewsSourcesByClientId(input.clientId)),

    create: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          name: z.string(),
          url: z.string(),
          type: z.enum(["rss", "google_news", "site", "other"]).optional(),
          enabled: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const id = await dbHelpers.createNewsSource({
          clientId: input.clientId as any,
          name: input.name,
          url: input.url,
          type: (input.type ?? "site") as any,
          enabled: input.enabled ?? 1,
        } as any);
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          url: z.string().optional(),
          type: z.enum(["rss", "google_news", "site", "other"]).optional(),
          enabled: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await dbHelpers.updateNewsSource(id, data as any);
        return { success: true };
      }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await dbHelpers.deleteNewsSource(input.id);
      return { success: true };
    }),
  }),
  calendarEvents: router({
    list: protectedProcedure.query(async () => extraDb.listCalendarEvents()),
  
    listByClientId: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => extraDb.listCalendarEventsByClientId(input.clientId)),
  
    create: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          title: z.string(),
          description: z.string().optional(),
          eventType: z.string(),
          startDate: z.coerce.date(),
          endDate: z.coerce.date().optional(),
          allDay: z.number().optional(),
          platform: z.string().optional(),
          color: z.string().optional(),
          status: z.string().optional(),
          contentId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await extraDb.createCalendarEvent({
          ...(input as any),
          createdBy: legacyUserId(ctx.user),
        } as any);
        return { id };
      }),
  }),
  aiConversations: router({
    listByUser: protectedProcedure
      .input(z.object({ section: z.string().optional() }))
      .query(async ({ input, ctx }) => extraDb.listAiConversationsByUser(legacyUserId(ctx.user), input.section)),
  
    // Por enquanto só cria conversa vazia (pra UI parar de quebrar)
    create: protectedProcedure
      .input(
        z.object({
          clientId: z.number().optional(),
          title: z.string().optional(),
          section: z.string(),
          messages: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await extraDb.createAiConversation({
          clientId: (input as any).clientId ?? null,
          userId: legacyUserId(ctx.user),
          title: input.title ?? null,
          section: input.section as any,
          messages: input.messages ?? "[]",
          isArchived: 0,
        } as any);
        return { id };
      }),
  }),
  performanceMetrics: router({
    listByClientId: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => extraDb.listPerformanceMetricsByClientId(input.clientId)),
  }),
  production: router({
    list: protectedProcedure.query(async () => extraDb.listProductionEvents()),
    create: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          title: z.string(),
          eventType: z.string(),
          description: z.string().optional(),
          scheduledDate: z.coerce.date(),
          location: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await extraDb.createProductionEvent({
          ...(input as any),
          createdBy: legacyUserId(ctx.user),
        } as any);
        return { id };
      }),
  }),
  mediaChannels: router({
    list: protectedProcedure.query(async () => extraDb.listMediaChannels()),
  }),
  
  mediaBroadcasts: router({
    list: protectedProcedure.query(async () => extraDb.listMediaBroadcasts()),
    create: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          channelId: z.number(),
          title: z.string(),
          broadcastType: z.string(),
          duration: z.number(),
          scheduledDate: z.coerce.date(),
          scheduledTime: z.string(),
          endTime: z.string().optional(),
          costPerInsertion: z.number().optional(),
          totalCost: z.number().optional(),
          insertionsCount: z.number().optional(),
          status: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await extraDb.createMediaBroadcast({
          ...(input as any),
          createdBy: legacyUserId(ctx.user),
        } as any);
        return { id };
      }),
  }),
  clientCompetitors: router({
    listByClientId: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => extraDb.listClientCompetitorsByClientId(input.clientId)),
  }),
  
  clientSocialMedia: router({
    listByClientId: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => extraDb.listClientSocialMediaByClientId(input.clientId)),
  }),
  
  clientMediaPreferences: router({
    listByClientId: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => extraDb.listClientMediaPreferencesByClientId(input.clientId)),
  }),
          
  clientMaterials: router({
    listByClientId: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => extraDb.listClientMaterialsByClientId(input.clientId)),
  }),
  
  clippings: router({
    listByClientId: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => dbHelpers.getClippingsByClientId(input.clientId)),

    create: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          title: z.string(),
          url: z.string(),
          source: z.string().optional(),
          publishedAt: z.date().optional(),
          summary: z.string().optional(),
          sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await dbHelpers.createClipping({
          clientId: input.clientId as any,
          title: input.title,
          url: input.url,
          source: input.source ?? null,
          publishedAt: input.publishedAt ?? null,
          summary: input.summary ?? null,
          sentiment: (input.sentiment ?? "neutral") as any,
          createdBy: legacyUserId(ctx.user),
        } as any);
        return { id };
      }),
  }),

  artTemplates: router({
    listByClientId: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => dbHelpers.getArtTemplatesByClientId(input.clientId)),

    create: protectedProcedure
      .input(z.object({ clientId: z.number(), name: z.string(), fileUrl: z.string(), fileKey: z.string(), fileType: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const id = await dbHelpers.createArtTemplate({ ...(input as any), uploadedBy: legacyUserId(ctx.user) } as any);
        return { id };
      }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await dbHelpers.deleteArtTemplate(input.id);
      return { success: true };
    }),
  }),

  pits: router({
    listByClientId: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input }) => dbHelpers.getPitsByClientId(input.clientId)),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => dbHelpers.getPitById(input.id)),

    create: protectedProcedure
      .input(z.object({ clientId: z.number(), title: z.string(), briefing: z.string(), assignedTo: z.number().optional(), priority: z.enum(["low", "medium", "high", "urgent"]).optional(), dueDate: z.date().optional() }))
      .mutation(async ({ input, ctx }) => {
        const id = await dbHelpers.createPit({ ...(input as any), createdBy: legacyUserId(ctx.user) } as any);
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), title: z.string().optional(), briefing: z.string().optional(), assignedTo: z.number().optional(), status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(), priority: z.enum(["low", "medium", "high", "urgent"]).optional(), dueDate: z.date().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await dbHelpers.updatePit(id, data as any);
        return { success: true };
      }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await dbHelpers.deletePit(input.id);
      return { success: true };
    }),
  }),

  contents: router({
    listByClientId: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input }) => dbHelpers.getContentsByClientId(input.clientId)),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => dbHelpers.getContentById(input.id)),

    create: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          pitId: z.number().optional(),
          title: z.string(),
          contentType: z.enum(["tv_program", "radio_program", "tv_insertion", "radio_insertion", "social_post", "speech", "jingle", "graphic"]),
          content: z.string(),
          fileUrl: z.string().optional(),
          fileKey: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await dbHelpers.createContent({ ...(input as any), createdBy: legacyUserId(ctx.user) } as any);
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), title: z.string().optional(), content: z.string().optional(), status: z.enum(["to_do", "in_approval", "done"]).optional(), fileUrl: z.string().optional(), fileKey: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await dbHelpers.updateContent(id, data as any);
        return { success: true };
      }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await dbHelpers.deleteContent(input.id);
      return { success: true };
    }),
  }),

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => dbHelpers.getNotificationsByUserId(legacyUserId(ctx.user))),
    unreadCount: protectedProcedure.query(async ({ ctx }) => dbHelpers.getUnreadNotificationsCount(legacyUserId(ctx.user))),

    markAsRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await dbHelpers.markNotificationAsRead(input.id);
      return { success: true };
    }),

    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await dbHelpers.markAllNotificationsAsRead(legacyUserId(ctx.user));
      return { success: true };
    }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await dbHelpers.deleteNotification(input.id);
      return { success: true };
    }),
  }),

  newsSearch: router({
    search: protectedProcedure
      .input(z.object({ clientId: z.number(), query: z.string().optional() }))
      .mutation(async ({ input, ctx }) => searchNewsForClient(input.clientId, legacyUserId(ctx.user), input.query)),

    history: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input }) => dbHelpers.getNewsSearchesByClient(input.clientId)),
    recent: protectedProcedure.query(async () => dbHelpers.getRecentNewsSearches(20)),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => dbHelpers.getNewsSearchById(input.id)),
  }),

  scheduledSearches: router({
    getByClientId: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input }) => dbHelpers.getScheduledSearchByClientId(input.clientId)),
    list: protectedProcedure.query(async () => dbHelpers.getAllScheduledSearches()),

    create: protectedProcedure
      .input(z.object({ clientId: z.number(), frequency: z.enum(["6h", "12h", "24h"]), searchQuery: z.string().optional(), isEnabled: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        const existing = await dbHelpers.getScheduledSearchByClientId(input.clientId);
        if (existing) {
          await dbHelpers.updateScheduledSearch((existing as any).id, {
            frequency: input.frequency as any,
            searchQuery: input.searchQuery ?? null,
            isEnabled: input.isEnabled ?? 1,
          } as any);
          return { id: (existing as any).id, updated: true };
        }

        const id = await dbHelpers.createScheduledSearch({
          clientId: input.clientId as any,
          frequency: input.frequency as any,
          searchQuery: input.searchQuery ?? null,
          isEnabled: input.isEnabled ?? 1,
          createdBy: legacyUserId(ctx.user),
        } as any);

        return { id, updated: false };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), frequency: z.enum(["6h", "12h", "24h"]).optional(), searchQuery: z.string().optional(), isEnabled: z.number().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await dbHelpers.updateScheduledSearch(id, data as any);
        return { success: true };
      }),

    toggle: protectedProcedure
      .input(z.object({ id: z.number(), isEnabled: z.number() }))
      .mutation(async ({ input }) => {
        await dbHelpers.updateScheduledSearch(input.id, { isEnabled: input.isEnabled } as any);
        return { success: true };
      }),

    status: protectedProcedure.query(async () => {
      const enabled = (await dbHelpers.getEnabledScheduledSearches()) as any[];
      return {
        isRunning: isSchedulerRunning(),
        enabledCount: enabled.length,
        nextDue: enabled[0]?.nextRunAt ?? null,
      };
    }),

    runNow: protectedProcedure.mutation(async () => runDueSearches()),
  }),

  admin: router({
    ping: adminProcedure.query(() => ({ ok: true })),
  }),
});

export type AppRouter = typeof appRouter;
