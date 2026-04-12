// server/_core/loadEnv.ts
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
function load(fileName) {
  const filePath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return false;
  dotenv.config({
    path: filePath,
    override: true
    // .env.local sobrescreve .env
  });
  return true;
}
var loadedEnv = load(".env");
var loadedEnvLocal = load(".env.local");
if (!process.env.SUPABASE_URL) {
  console.warn(
    `[loadEnv] SUPABASE_URL ainda n\xE3o veio. cwd=${process.cwd()} | .env=${loadedEnv} | .env.local=${loadedEnvLocal}`
  );
}

// server/_core/env.ts
import { z } from "zod";
var schema = z.object({
  SUPABASE_URL: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.string().optional(),
  OPENAI_MODEL: z.string().optional()
});
var parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const msg = parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`ENV inv\xE1lido:
${msg}`);
}
var ENV = parsed.data;

// server/_core/index.ts
import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/routers.ts
import { z as z3 } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

// server/supabase-admin.ts
import { createClient } from "@supabase/supabase-js";
function req(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} n\xE3o definido`);
  return v;
}
var supabaseAdmin = createClient(
  req("SUPABASE_URL"),
  req("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

// server/db-helpers.ts
function unwrap(res, label) {
  if (res.error) {
    throw new Error(`${label}: ${res.error.message || String(res.error)}`);
  }
  if (res.data == null) {
    throw new Error(`${label}: no data returned`);
  }
  return res.data;
}
async function getOrCreateUserBySupabaseId(input) {
  const { supabaseUserId, email, name } = input;
  const existingRes = await supabaseAdmin.from("users").select("*").eq("supabase_user_id", supabaseUserId).maybeSingle();
  if (existingRes.error) {
    throw new Error(
      `getOrCreateUserBySupabaseId.select: ${existingRes.error.message}`
    );
  }
  if (existingRes.data) return existingRes.data;
  const insertRes = await supabaseAdmin.from("users").insert({
    supabase_user_id: supabaseUserId,
    email: email ?? null,
    name: name ?? null
  }).select("*").single();
  return unwrap(insertRes, "getOrCreateUserBySupabaseId.insert");
}
async function getAllClients() {
  const res = await supabaseAdmin.from("clients").select("*").order("id", {
    ascending: true
  });
  return unwrap(res, "getAllClients");
}
async function getClientById(id) {
  const res = await supabaseAdmin.from("clients").select("*").eq("id", id).single();
  return unwrap(res, "getClientById");
}
async function createClient2(data) {
  const res = await supabaseAdmin.from("clients").insert(data).select("id").single();
  const row = unwrap(res, "createClient");
  return row.id;
}
async function updateClient(id, data) {
  const res = await supabaseAdmin.from("clients").update(data).eq("id", id).select("id").single();
  unwrap(res, "updateClient");
  return true;
}
async function deleteClient(id) {
  const res = await supabaseAdmin.from("clients").delete().eq("id", id).select("id").single();
  unwrap(res, "deleteClient");
  return true;
}
async function getAllScheduledSearches() {
  const res = await supabaseAdmin.from("scheduled_searches").select("*").order("id", { ascending: true });
  return unwrap(res, "getAllScheduledSearches");
}
async function getEnabledScheduledSearches() {
  const res = await supabaseAdmin.from("scheduled_searches").select("*").eq("enabled", true).order("id", { ascending: true });
  return unwrap(res, "getEnabledScheduledSearches");
}
async function getScheduledSearchByClientId(clientId) {
  const res = await supabaseAdmin.from("scheduled_searches").select("*").eq("client_id", clientId).maybeSingle();
  if (res.error) {
    throw new Error(
      `getScheduledSearchByClientId: ${res.error.message || String(res.error)}`
    );
  }
  return res.data;
}
async function createScheduledSearch(data) {
  const res = await supabaseAdmin.from("scheduled_searches").insert(data).select("id").single();
  const row = unwrap(res, "createScheduledSearch");
  return row.id;
}
async function updateScheduledSearch(id, data) {
  const res = await supabaseAdmin.from("scheduled_searches").update(data).eq("id", id).select("id").single();
  unwrap(res, "updateScheduledSearch");
  return true;
}
async function updateScheduledSearchAfterRun(id, data) {
  return updateScheduledSearch(id, data);
}
async function createScheduledSearchLog(data) {
  const res = await supabaseAdmin.from("scheduled_search_logs").insert(data).select("id").single();
  const row = unwrap(res, "createScheduledSearchLog");
  return row.id;
}
async function getDueScheduledSearches() {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const res = await supabaseAdmin.from("scheduled_searches").select("*").eq("enabled", true).lte("next_run_at", nowIso).order("next_run_at", { ascending: true });
  return unwrap(res, "getDueScheduledSearches");
}
async function getNewsSourcesByClientId(clientId) {
  const res = await supabaseAdmin.from("news_sources").select("*").eq("client_id", clientId).order("id", { ascending: true });
  return unwrap(res, "getNewsSourcesByClientId");
}
async function createNewsSource(data) {
  const res = await supabaseAdmin.from("news_sources").insert(data).select("id").single();
  const row = unwrap(res, "createNewsSource");
  return row.id;
}
async function updateNewsSource(id, data) {
  const res = await supabaseAdmin.from("news_sources").update(data).eq("id", id).select("id").single();
  unwrap(res, "updateNewsSource");
  return true;
}
async function deleteNewsSource(id) {
  const res = await supabaseAdmin.from("news_sources").delete().eq("id", id).select("id").single();
  unwrap(res, "deleteNewsSource");
  return true;
}
async function getClippingsByClientId(clientId) {
  const res = await supabaseAdmin.from("clippings").select("*").eq("client_id", clientId).order("published_at", { ascending: false }).order("id", { ascending: false });
  return unwrap(res, "getClippingsByClientId");
}
async function createClipping(data) {
  const res = await supabaseAdmin.from("clippings").insert(data).select("id").single();
  const row = unwrap(res, "createClipping");
  return row.id;
}

// server/_core/trpc.ts
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "N\xE3o autenticado"
    });
  }
  const legacy = await getOrCreateUserBySupabaseId({
    supabaseId: ctx.user.id,
    email: ctx.user.email ?? null,
    name: null
  });
  return next({
    ctx: {
      ...ctx,
      user: {
        ...ctx.user,
        legacyId: legacy.id,
        role: legacy.role ?? "user"
      }
    }
  });
});
var adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (process.env.NODE_ENV === "development") {
    return next({ ctx });
  }
  const role = ctx.user?.role ?? "user";
  if (role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sem permiss\xE3o"
    });
  }
  return next({ ctx });
});

// server/_core/systemRouter.ts
import { z as z2 } from "zod";

// server/_core/notification.ts
import { TRPCError as TRPCError2 } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError2({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError2({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError2({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError2({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError2({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError2({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z2.object({
      timestamp: z2.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z2.object({
      title: z2.string().min(1, "title is required"),
      content: z2.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/news-search.ts
async function searchNewsForClient(...args) {
  return [];
}

// server/scheduler.ts
var CHECK_INTERVAL = 5 * 60 * 1e3;
var schedulerInterval = null;
var isRunning = false;
async function runDueSearches() {
  if (isRunning) {
    console.log("[Scheduler] Already running, skipping...");
    return { executed: 0, successful: 0, failed: 0, results: [] };
  }
  isRunning = true;
  const results = [];
  try {
    const dueSearches = await getDueScheduledSearches();
    if (dueSearches.length === 0) {
      console.log("[Scheduler] No due searches found");
      return { executed: 0, successful: 0, failed: 0, results: [] };
    }
    console.log(`[Scheduler] Found ${dueSearches.length} due searches`);
    for (const schedule of dueSearches) {
      const startTime = Date.now();
      try {
        console.log(`[Scheduler] Running search for client ${schedule.clientId}`);
        const searchResult = await searchNewsForClient(
          schedule.clientId,
          schedule.createdBy,
          schedule.searchQuery || void 0
        );
        const executionTime = Date.now() - startTime;
        await createScheduledSearchLog({
          scheduledSearchId: schedule.id,
          clientId: schedule.clientId,
          status: searchResult.status === "completed" ? "success" : "failed",
          newsFound: searchResult.newsFound.length,
          newsSaved: searchResult.newsSaved,
          executionTimeMs: executionTime,
          errorMessage: searchResult.errorMessage || null
        });
        await updateScheduledSearchAfterRun(
          schedule.id,
          searchResult.status === "completed"
        );
        results.push({
          clientId: schedule.clientId,
          status: searchResult.status === "completed" ? "success" : "failed",
          newsFound: searchResult.newsFound.length,
          newsSaved: searchResult.newsSaved,
          error: searchResult.errorMessage
        });
        console.log(`[Scheduler] Client ${schedule.clientId}: ${searchResult.newsFound.length} found, ${searchResult.newsSaved} saved`);
      } catch (error) {
        const executionTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await createScheduledSearchLog({
          scheduledSearchId: schedule.id,
          clientId: schedule.clientId,
          status: "failed",
          newsFound: 0,
          newsSaved: 0,
          executionTimeMs: executionTime,
          errorMessage
        });
        await updateScheduledSearchAfterRun(schedule.id, false);
        results.push({
          clientId: schedule.clientId,
          status: "failed",
          newsFound: 0,
          newsSaved: 0,
          error: errorMessage
        });
        console.error(`[Scheduler] Error for client ${schedule.clientId}:`, errorMessage);
      }
    }
    const successful = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "failed").length;
    console.log(`[Scheduler] Completed: ${successful} successful, ${failed} failed`);
    return {
      executed: results.length,
      successful,
      failed,
      results
    };
  } finally {
    isRunning = false;
  }
}
function isSchedulerRunning() {
  return schedulerInterval !== null;
}

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;

// server/_core/cookies.ts
function isSecureRequest(req2) {
  if (req2.protocol === "https") return true;
  const forwardedProto = req2.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req2) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req2)
  };
}

// server/db-helpers-extra.ts
import { eq, desc, and } from "drizzle-orm";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
var _db = null;
function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL n\xE3o definido no .env");
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });
  _db = drizzle(pool);
  return _db;
}

// drizzle/schema.ts
import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  timestamp,
  varchar
} from "drizzle-orm/pg-core";
var roleEnum = pgEnum("role", ["user", "admin"]);
var clientStatusEnum = pgEnum("client_status", ["active", "paused", "completed"]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  // ponte com Supabase
  supabaseId: varchar("supabase_id", { length: 64 }).notNull().unique(),
  // id “de login” usado no código (ex: supabase:xxx)
  openId: varchar("openId", { length: 128 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  logo: text("logo"),
  slogan: text("slogan"),
  proposals: text("proposals"),
  achievements: text("achievements"),
  toneOfVoice: text("tone_of_voice"),
  status: clientStatusEnum("status").default("active").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var clientNewsSources = pgTable("client_news_sources", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  name: text("name").notNull(),
  sourceType: varchar("source_type", { length: 50 }).notNull(),
  url: text("url").notNull(),
  region: text("region"),
  keywords: text("keywords"),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var clippings = pgTable("clippings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  source: text("source").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  url: text("url").notNull(),
  publishedDate: timestamp("published_date"),
  sentiment: varchar("sentiment", { length: 20 }),
  isCompetitor: integer("is_competitor").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var newsSearchHistory = pgTable("news_search_history", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  searchQuery: text("search_query").notNull(),
  sourcesSearched: integer("sources_searched").default(0).notNull(),
  newsFound: integer("news_found").default(0).notNull(),
  newsSaved: integer("news_saved").default(0).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull()
});
var scheduledSearches = pgTable("scheduled_searches", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  isEnabled: integer("is_enabled").default(1).notNull(),
  frequency: varchar("frequency", { length: 10 }).default("12h").notNull(),
  searchQuery: text("search_query"),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  totalRuns: integer("total_runs").default(0).notNull(),
  successfulRuns: integer("successful_runs").default(0).notNull(),
  failedRuns: integer("failed_runs").default(0).notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var scheduledSearchLogs = pgTable("scheduled_search_logs", {
  id: serial("id").primaryKey(),
  scheduledSearchId: integer("scheduled_search_id").notNull(),
  clientId: integer("client_id").notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  newsFound: integer("news_found").default(0).notNull(),
  newsSaved: integer("news_saved").default(0).notNull(),
  executionTimeMs: integer("execution_time_ms"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var artTemplates = pgTable("art_templates", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  name: text("name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileKey: text("file_key").notNull(),
  fileType: varchar("file_type", { length: 50 }),
  uploadedBy: integer("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var pits = pgTable("pits", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: text("title").notNull(),
  briefing: text("briefing").notNull(),
  assignedTo: integer("assigned_to"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  priority: varchar("priority", { length: 20 }).default("medium").notNull(),
  dueDate: timestamp("due_date"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var contents = pgTable("contents", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  pitId: integer("pit_id"),
  approvalId: integer("approval_id"),
  title: text("title").notNull(),
  contentType: varchar("content_type", { length: 40 }).notNull(),
  content: text("content").notNull(),
  status: varchar("status", { length: 20 }).default("to_do").notNull(),
  fileUrl: text("file_url"),
  fileKey: text("file_key"),
  createdBy: integer("created_by").notNull(),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: varchar("type", { length: 40 }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedType: varchar("related_type", { length: 50 }),
  relatedId: integer("related_id"),
  isRead: integer("is_read").default(0).notNull(),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var aiSectionEnum = pgEnum("ai_section", [
  "strategy",
  "creation",
  "art_direction",
  "production",
  "media",
  "planning"
]);
var aiConversations = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id"),
  userId: integer("user_id").notNull(),
  title: text("title"),
  section: aiSectionEnum("section").notNull(),
  messages: text("messages").notNull(),
  isArchived: integer("is_archived").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date", { withTimezone: false }).notNull(),
  endDate: timestamp("end_date", { withTimezone: false }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var performanceMetrics = pgTable("performance_metrics", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  metricDate: timestamp("metric_date").notNull(),
  source: varchar("source", { length: 64 }),
  // ex: "instagram"
  payloadJson: text("payload_json").notNull(),
  // json string com métricas
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var productionEvents = pgTable("production_events", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: varchar("status", { length: 32 }).default("scheduled"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var mediaChannels = pgTable("media_channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: varchar("type", { length: 32 }),
  // tv/radio/portal/insta etc
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var mediaBroadcasts = pgTable("media_broadcasts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  channelId: integer("channel_id"),
  title: text("title").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var clientCompetitors = pgTable("client_competitors", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  name: text("name").notNull(),
  instagram: varchar("instagram", { length: 128 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var clientSocialMedia = pgTable("client_social_media", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  platform: varchar("platform", { length: 32 }).notNull(),
  // instagram/tiktok/youtube
  handle: varchar("handle", { length: 128 }),
  url: text("url"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var clientMediaPreferences = pgTable("client_media_preferences", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  key: varchar("key", { length: 64 }).notNull(),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var clientMaterials = pgTable("client_materials", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  // arquivo pode vir de qualquer lugar (storage supabase/s3/drive)
  fileUrl: text("file_url"),
  fileKey: text("file_key"),
  fileType: varchar("file_type", { length: 64 }),
  // pdf/docx/png/mp4 etc
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var materialVersions = pgTable("material_versions", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").notNull(),
  versionLabel: varchar("version_label", { length: 64 }).default("v1"),
  fileUrl: text("file_url"),
  fileKey: text("file_key"),
  fileType: varchar("file_type", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// server/db-helpers-extra.ts
async function listCalendarEvents() {
  const db = await getDb();
  return db.select().from(calendarEvents).orderBy(desc(calendarEvents.startDate));
}
async function listCalendarEventsByClientId(clientId) {
  const db = await getDb();
  return db.select().from(calendarEvents).where(eq(calendarEvents.clientId, clientId)).orderBy(desc(calendarEvents.startDate));
}
async function createCalendarEvent(data) {
  const db = await getDb();
  const result = await db.insert(calendarEvents).values(data);
  return Number(result[0]?.insertId ?? 0);
}
async function listAiConversationsByUser(userId, section) {
  const db = await getDb();
  const where = section ? and(eq(aiConversations.userId, userId), eq(aiConversations.section, section)) : eq(aiConversations.userId, userId);
  return db.select().from(aiConversations).where(where).orderBy(desc(aiConversations.updatedAt));
}
async function createAiConversation(data) {
  const db = await getDb();
  const result = await db.insert(aiConversations).values(data);
  return Number(result[0]?.insertId ?? 0);
}
async function listPerformanceMetricsByClientId(clientId) {
  const db = await getDb();
  return db.select().from(performanceMetrics).where(eq(performanceMetrics.clientId, clientId)).orderBy(desc(performanceMetrics.metricDate));
}
async function listProductionEvents() {
  const db = await getDb();
  return db.select().from(productionEvents).orderBy(desc(productionEvents.scheduledDate));
}
async function createProductionEvent(data) {
  const db = await getDb();
  const result = await db.insert(productionEvents).values(data);
  return Number(result[0]?.insertId ?? 0);
}
async function listMediaChannels() {
  const db = await getDb();
  return db.select().from(mediaChannels).orderBy(desc(mediaChannels.createdAt));
}
async function listMediaBroadcasts() {
  const db = await getDb();
  return db.select().from(mediaBroadcasts).orderBy(desc(mediaBroadcasts.scheduledDate));
}
async function createMediaBroadcast(data) {
  const db = await getDb();
  const result = await db.insert(mediaBroadcasts).values(data);
  return Number(result[0]?.insertId ?? 0);
}
async function listClientCompetitorsByClientId(clientId) {
  const db = await getDb();
  return db.select().from(clientCompetitors).where(eq(clientCompetitors.clientId, clientId)).orderBy(desc(clientCompetitors.createdAt));
}
async function listClientSocialMediaByClientId(clientId) {
  const db = await getDb();
  return db.select().from(clientSocialMedia).where(eq(clientSocialMedia.clientId, clientId)).orderBy(desc(clientSocialMedia.createdAt));
}
async function listClientMediaPreferencesByClientId(clientId) {
  const db = await getDb();
  return db.select().from(clientMediaPreferences).where(eq(clientMediaPreferences.clientId, clientId)).orderBy(desc(clientMediaPreferences.createdAt));
}
async function listClientMaterialsByClientId(clientId) {
  const db = await getDb();
  return db.select().from(clientMaterials).where(eq(clientMaterials.clientId, clientId)).orderBy(desc(clientMaterials.createdAt));
}

// server/routers.ts
var legacyUserId = (user) => {
  const v = user?.legacyId;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return 1;
};
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  clients: router({
    list: protectedProcedure.query(async () => getAllClients()),
    getById: protectedProcedure.input(z3.object({ id: z3.number() })).query(async ({ input }) => getClientById(input.id)),
    create: protectedProcedure.input(
      z3.object({
        name: z3.string(),
        description: z3.string().optional(),
        logo: z3.string().optional(),
        slogan: z3.string().optional(),
        proposals: z3.string().optional(),
        achievements: z3.string().optional(),
        toneOfVoice: z3.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const id = await createClient2({ ...input, createdBy: legacyUserId(ctx.user) });
      return { id };
    }),
    update: protectedProcedure.input(
      z3.object({
        id: z3.number(),
        name: z3.string().optional(),
        description: z3.string().optional(),
        logo: z3.string().optional(),
        slogan: z3.string().optional(),
        proposals: z3.string().optional(),
        achievements: z3.string().optional(),
        toneOfVoice: z3.string().optional(),
        status: z3.enum(["active", "paused", "completed"]).optional()
      })
    ).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateClient(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deleteClient(input.id);
      return { success: true };
    })
  }),
  clientNewsSources: router({
    listByClientId: protectedProcedure.input(z3.object({ clientId: z3.number() })).query(async ({ input }) => getNewsSourcesByClientId(input.clientId)),
    create: protectedProcedure.input(
      z3.object({
        clientId: z3.number(),
        name: z3.string(),
        url: z3.string(),
        type: z3.enum(["rss", "google_news", "site", "other"]).optional(),
        enabled: z3.number().optional()
      })
    ).mutation(async ({ input }) => {
      const id = await createNewsSource({
        clientId: input.clientId,
        name: input.name,
        url: input.url,
        type: input.type ?? "site",
        enabled: input.enabled ?? 1
      });
      return { id };
    }),
    update: protectedProcedure.input(
      z3.object({
        id: z3.number(),
        name: z3.string().optional(),
        url: z3.string().optional(),
        type: z3.enum(["rss", "google_news", "site", "other"]).optional(),
        enabled: z3.number().optional()
      })
    ).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateNewsSource(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deleteNewsSource(input.id);
      return { success: true };
    })
  }),
  calendarEvents: router({
    list: protectedProcedure.query(async () => listCalendarEvents()),
    listByClientId: protectedProcedure.input(z3.object({ clientId: z3.number() })).query(async ({ input }) => listCalendarEventsByClientId(input.clientId)),
    create: protectedProcedure.input(
      z3.object({
        clientId: z3.number(),
        title: z3.string(),
        description: z3.string().optional(),
        eventType: z3.string(),
        startDate: z3.coerce.date(),
        endDate: z3.coerce.date().optional(),
        allDay: z3.number().optional(),
        platform: z3.string().optional(),
        color: z3.string().optional(),
        status: z3.string().optional(),
        contentId: z3.number().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const id = await createCalendarEvent({
        ...input,
        createdBy: legacyUserId(ctx.user)
      });
      return { id };
    })
  }),
  aiConversations: router({
    listByUser: protectedProcedure.input(z3.object({ section: z3.string().optional() })).query(async ({ input, ctx }) => listAiConversationsByUser(legacyUserId(ctx.user), input.section)),
    // Por enquanto só cria conversa vazia (pra UI parar de quebrar)
    create: protectedProcedure.input(
      z3.object({
        clientId: z3.number().optional(),
        title: z3.string().optional(),
        section: z3.string(),
        messages: z3.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const id = await createAiConversation({
        clientId: input.clientId ?? null,
        userId: legacyUserId(ctx.user),
        title: input.title ?? null,
        section: input.section,
        messages: input.messages ?? "[]",
        isArchived: 0
      });
      return { id };
    })
  }),
  performanceMetrics: router({
    listByClientId: protectedProcedure.input(z3.object({ clientId: z3.number() })).query(async ({ input }) => listPerformanceMetricsByClientId(input.clientId))
  }),
  production: router({
    list: protectedProcedure.query(async () => listProductionEvents()),
    create: protectedProcedure.input(
      z3.object({
        clientId: z3.number(),
        title: z3.string(),
        eventType: z3.string(),
        description: z3.string().optional(),
        scheduledDate: z3.coerce.date(),
        location: z3.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const id = await createProductionEvent({
        ...input,
        createdBy: legacyUserId(ctx.user)
      });
      return { id };
    })
  }),
  mediaChannels: router({
    list: protectedProcedure.query(async () => listMediaChannels())
  }),
  mediaBroadcasts: router({
    list: protectedProcedure.query(async () => listMediaBroadcasts()),
    create: protectedProcedure.input(
      z3.object({
        clientId: z3.number(),
        channelId: z3.number(),
        title: z3.string(),
        broadcastType: z3.string(),
        duration: z3.number(),
        scheduledDate: z3.coerce.date(),
        scheduledTime: z3.string(),
        endTime: z3.string().optional(),
        costPerInsertion: z3.number().optional(),
        totalCost: z3.number().optional(),
        insertionsCount: z3.number().optional(),
        status: z3.string().optional(),
        notes: z3.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const id = await createMediaBroadcast({
        ...input,
        createdBy: legacyUserId(ctx.user)
      });
      return { id };
    })
  }),
  clientCompetitors: router({
    listByClientId: protectedProcedure.input(z3.object({ clientId: z3.number() })).query(async ({ input }) => listClientCompetitorsByClientId(input.clientId))
  }),
  clientSocialMedia: router({
    listByClientId: protectedProcedure.input(z3.object({ clientId: z3.number() })).query(async ({ input }) => listClientSocialMediaByClientId(input.clientId))
  }),
  clientMediaPreferences: router({
    listByClientId: protectedProcedure.input(z3.object({ clientId: z3.number() })).query(async ({ input }) => listClientMediaPreferencesByClientId(input.clientId))
  }),
  clientMaterials: router({
    listByClientId: protectedProcedure.input(z3.object({ clientId: z3.number() })).query(async ({ input }) => listClientMaterialsByClientId(input.clientId))
  }),
  clippings: router({
    listByClientId: protectedProcedure.input(z3.object({ clientId: z3.number() })).query(async ({ input }) => getClippingsByClientId(input.clientId)),
    create: protectedProcedure.input(
      z3.object({
        clientId: z3.number(),
        title: z3.string(),
        url: z3.string(),
        source: z3.string().optional(),
        publishedAt: z3.date().optional(),
        summary: z3.string().optional(),
        sentiment: z3.enum(["positive", "neutral", "negative"]).optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const id = await createClipping({
        clientId: input.clientId,
        title: input.title,
        url: input.url,
        source: input.source ?? null,
        publishedAt: input.publishedAt ?? null,
        summary: input.summary ?? null,
        sentiment: input.sentiment ?? "neutral",
        createdBy: legacyUserId(ctx.user)
      });
      return { id };
    })
  }),
  artTemplates: router({
    listByClientId: protectedProcedure.input(z3.object({ clientId: z3.number() })).query(async ({ input }) => (void 0)(input.clientId)),
    create: protectedProcedure.input(z3.object({ clientId: z3.number(), name: z3.string(), fileUrl: z3.string(), fileKey: z3.string(), fileType: z3.string().optional() })).mutation(async ({ input, ctx }) => {
      const id = await (void 0)({ ...input, uploadedBy: legacyUserId(ctx.user) });
      return { id };
    }),
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await (void 0)(input.id);
      return { success: true };
    })
  }),
  pits: router({
    listByClientId: protectedProcedure.input(z3.object({ clientId: z3.number() })).query(async ({ input }) => (void 0)(input.clientId)),
    getById: protectedProcedure.input(z3.object({ id: z3.number() })).query(async ({ input }) => (void 0)(input.id)),
    create: protectedProcedure.input(z3.object({ clientId: z3.number(), title: z3.string(), briefing: z3.string(), assignedTo: z3.number().optional(), priority: z3.enum(["low", "medium", "high", "urgent"]).optional(), dueDate: z3.date().optional() })).mutation(async ({ input, ctx }) => {
      const id = await (void 0)({ ...input, createdBy: legacyUserId(ctx.user) });
      return { id };
    }),
    update: protectedProcedure.input(z3.object({ id: z3.number(), title: z3.string().optional(), briefing: z3.string().optional(), assignedTo: z3.number().optional(), status: z3.enum(["pending", "in_progress", "completed", "cancelled"]).optional(), priority: z3.enum(["low", "medium", "high", "urgent"]).optional(), dueDate: z3.date().optional() })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await (void 0)(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await (void 0)(input.id);
      return { success: true };
    })
  }),
  contents: router({
    listByClientId: protectedProcedure.input(z3.object({ clientId: z3.number() })).query(async ({ input }) => (void 0)(input.clientId)),
    getById: protectedProcedure.input(z3.object({ id: z3.number() })).query(async ({ input }) => (void 0)(input.id)),
    create: protectedProcedure.input(
      z3.object({
        clientId: z3.number(),
        pitId: z3.number().optional(),
        title: z3.string(),
        contentType: z3.enum(["tv_program", "radio_program", "tv_insertion", "radio_insertion", "social_post", "speech", "jingle", "graphic"]),
        content: z3.string(),
        fileUrl: z3.string().optional(),
        fileKey: z3.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const id = await (void 0)({ ...input, createdBy: legacyUserId(ctx.user) });
      return { id };
    }),
    update: protectedProcedure.input(z3.object({ id: z3.number(), title: z3.string().optional(), content: z3.string().optional(), status: z3.enum(["to_do", "in_approval", "done"]).optional(), fileUrl: z3.string().optional(), fileKey: z3.string().optional() })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await (void 0)(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await (void 0)(input.id);
      return { success: true };
    })
  }),
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => (void 0)(legacyUserId(ctx.user))),
    unreadCount: protectedProcedure.query(async ({ ctx }) => (void 0)(legacyUserId(ctx.user))),
    markAsRead: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await (void 0)(input.id);
      return { success: true };
    }),
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await (void 0)(legacyUserId(ctx.user));
      return { success: true };
    }),
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await (void 0)(input.id);
      return { success: true };
    })
  }),
  newsSearch: router({
    search: protectedProcedure.input(z3.object({ clientId: z3.number(), query: z3.string().optional() })).mutation(async ({ input, ctx }) => searchNewsForClient(input.clientId, legacyUserId(ctx.user), input.query)),
    history: protectedProcedure.input(z3.object({ clientId: z3.number() })).query(async ({ input }) => (void 0)(input.clientId)),
    recent: protectedProcedure.query(async () => (void 0)(20)),
    getById: protectedProcedure.input(z3.object({ id: z3.number() })).query(async ({ input }) => (void 0)(input.id))
  }),
  scheduledSearches: router({
    getByClientId: protectedProcedure.input(z3.object({ clientId: z3.number() })).query(async ({ input }) => getScheduledSearchByClientId(input.clientId)),
    list: protectedProcedure.query(async () => getAllScheduledSearches()),
    create: protectedProcedure.input(z3.object({ clientId: z3.number(), frequency: z3.enum(["6h", "12h", "24h"]), searchQuery: z3.string().optional(), isEnabled: z3.number().optional() })).mutation(async ({ input, ctx }) => {
      const existing = await getScheduledSearchByClientId(input.clientId);
      if (existing) {
        await updateScheduledSearch(existing.id, {
          frequency: input.frequency,
          searchQuery: input.searchQuery ?? null,
          isEnabled: input.isEnabled ?? 1
        });
        return { id: existing.id, updated: true };
      }
      const id = await createScheduledSearch({
        clientId: input.clientId,
        frequency: input.frequency,
        searchQuery: input.searchQuery ?? null,
        isEnabled: input.isEnabled ?? 1,
        createdBy: legacyUserId(ctx.user)
      });
      return { id, updated: false };
    }),
    update: protectedProcedure.input(z3.object({ id: z3.number(), frequency: z3.enum(["6h", "12h", "24h"]).optional(), searchQuery: z3.string().optional(), isEnabled: z3.number().optional() })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateScheduledSearch(id, data);
      return { success: true };
    }),
    toggle: protectedProcedure.input(z3.object({ id: z3.number(), isEnabled: z3.number() })).mutation(async ({ input }) => {
      await updateScheduledSearch(input.id, { isEnabled: input.isEnabled });
      return { success: true };
    }),
    status: protectedProcedure.query(async () => {
      const enabled = await getEnabledScheduledSearches();
      return {
        isRunning: isSchedulerRunning(),
        enabledCount: enabled.length,
        nextDue: enabled[0]?.nextRunAt ?? null
      };
    }),
    runNow: protectedProcedure.mutation(async () => runDueSearches())
  }),
  admin: router({
    ping: adminProcedure.query(() => ({ ok: true }))
  })
});

// server/_core/supabaseAdmin.ts
import { createClient as createClient3 } from "@supabase/supabase-js";
var supabaseUrl = process.env.SUPABASE_URL;
var serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) throw new Error("SUPABASE_URL n\xE3o definido");
if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY n\xE3o definido");
var supabaseAdmin2 = createClient3(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

// server/_core/context.ts
async function createContext(opts) {
  const { req: req2, res } = opts;
  const auth = req2.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return { req: req2, res, user: null };
  }
  const { data, error } = await supabaseAdmin2.auth.getUser(token);
  if (error || !data?.user) {
    return { req: req2, res, user: null };
  }
  return {
    req: req2,
    res,
    user: {
      id: data.user.id,
      email: data.user.email ?? null
    }
  };
}

// server/_core/index.ts
var app = express();
app.use(cors());
app.use(express.json());
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req: req2, res }) => createContext({ req: req2, res }),
    onError({ error, path: path2, type, input, req: req2 }) {
      console.error("\n===== tRPC ERROR =====");
      console.error("path:", path2);
      console.error("type:", type);
      console.error("message:", error.message);
      console.error("code:", error.code);
      console.error("input:", input);
      console.error("req:", req2.method, req2.url);
      console.error("stack:", error.stack);
      console.error("======================\n");
    }
  })
);
app.get("/health", (_req, res) => res.json({ ok: true }));
var port = process.env.PORT ? Number(process.env.PORT) : 3e3;
app.listen(port, () => console.log(`Server on http://localhost:${port}`));
