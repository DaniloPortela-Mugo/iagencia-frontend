// server/db-helpers-extra.ts
import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";

import {
  calendarEvents,
  aiConversations,
  performanceMetrics,
  productionEvents,
  mediaChannels,
  mediaBroadcasts,
  clientCompetitors,
  clientSocialMedia,
  clientMediaPreferences,
  clientMaterials,
  materialVersions,

  type InsertCalendarEvent,
  type InsertAiConversation,
  type InsertPerformanceMetric,
  type InsertProductionEvent,
  type InsertMediaChannel,
  type InsertMediaBroadcast,
  type InsertClientCompetitor,
  type InsertClientSocialMedia,
  type InsertClientMediaPreference,
  type InsertClientMaterial,
  type InsertMaterialVersion,
} from "../drizzle/schema";

/** ======================================================================
 *  CALENDAR EVENTS
 * ====================================================================== */
export async function listCalendarEvents() {
  const db = await getDb();
  return (db as any).select().from(calendarEvents).orderBy(desc((calendarEvents as any).startDate));
}

export async function listCalendarEventsByClientId(clientId: number) {
  const db = await getDb();
  return (db as any)
    .select()
    .from(calendarEvents)
    .where(eq((calendarEvents as any).clientId, clientId))
    .orderBy(desc((calendarEvents as any).startDate));
}

export async function createCalendarEvent(data: InsertCalendarEvent) {
  const db = await getDb();
  const result = await (db as any).insert(calendarEvents).values(data as any);
  return Number((result as any)[0]?.insertId ?? 0);
}

/** ======================================================================
 *  AI CONVERSATIONS
 * ====================================================================== */
export async function listAiConversationsByUser(userId: number, section?: string) {
  const db = await getDb();
  const where = section
    ? and(eq((aiConversations as any).userId, userId), eq((aiConversations as any).section, section))
    : eq((aiConversations as any).userId, userId);

  return (db as any).select().from(aiConversations).where(where).orderBy(desc((aiConversations as any).updatedAt));
}

export async function createAiConversation(data: InsertAiConversation) {
  const db = await getDb();
  const result = await (db as any).insert(aiConversations).values(data as any);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function updateAiConversation(id: number, data: Partial<InsertAiConversation>) {
  const db = await getDb();
  await (db as any).update(aiConversations).set(data as any).where(eq((aiConversations as any).id, id));
}

/** ======================================================================
 *  PERFORMANCE METRICS
 * ====================================================================== */
export async function listPerformanceMetricsByClientId(clientId: number) {
  const db = await getDb();
  return (db as any)
    .select()
    .from(performanceMetrics)
    .where(eq((performanceMetrics as any).clientId, clientId))
    .orderBy(desc((performanceMetrics as any).metricDate));
}

export async function createPerformanceMetric(data: InsertPerformanceMetric) {
  const db = await getDb();
  const result = await (db as any).insert(performanceMetrics).values(data as any);
  return Number((result as any)[0]?.insertId ?? 0);
}

/** ======================================================================
 *  PRODUCTION (events)
 * ====================================================================== */
export async function listProductionEvents() {
  const db = await getDb();
  return (db as any).select().from(productionEvents).orderBy(desc((productionEvents as any).scheduledDate));
}

export async function createProductionEvent(data: InsertProductionEvent) {
  const db = await getDb();
  const result = await (db as any).insert(productionEvents).values(data as any);
  return Number((result as any)[0]?.insertId ?? 0);
}

/** ======================================================================
 *  MEDIA CHANNELS / BROADCASTS
 * ====================================================================== */
export async function listMediaChannels() {
  const db = await getDb();
  return (db as any).select().from(mediaChannels).orderBy(desc((mediaChannels as any).createdAt));
}

export async function createMediaChannel(data: InsertMediaChannel) {
  const db = await getDb();
  const result = await (db as any).insert(mediaChannels).values(data as any);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function listMediaBroadcasts() {
  const db = await getDb();
  return (db as any).select().from(mediaBroadcasts).orderBy(desc((mediaBroadcasts as any).scheduledDate));
}

export async function createMediaBroadcast(data: InsertMediaBroadcast) {
  const db = await getDb();
  const result = await (db as any).insert(mediaBroadcasts).values(data as any);
  return Number((result as any)[0]?.insertId ?? 0);
}

/** ======================================================================
 *  COMPETITORS / SOCIAL / PREFERENCES
 * ====================================================================== */
export async function listClientCompetitorsByClientId(clientId: number) {
  const db = await getDb();
  return (db as any)
    .select()
    .from(clientCompetitors)
    .where(eq((clientCompetitors as any).clientId, clientId))
    .orderBy(desc((clientCompetitors as any).createdAt));
}

export async function listClientSocialMediaByClientId(clientId: number) {
  const db = await getDb();
  return (db as any)
    .select()
    .from(clientSocialMedia)
    .where(eq((clientSocialMedia as any).clientId, clientId))
    .orderBy(desc((clientSocialMedia as any).createdAt));
}

export async function listClientMediaPreferencesByClientId(clientId: number) {
  const db = await getDb();
  return (db as any)
    .select()
    .from(clientMediaPreferences)
    .where(eq((clientMediaPreferences as any).clientId, clientId))
    .orderBy(desc((clientMediaPreferences as any).createdAt));
}

/** ======================================================================
 *  MATERIALS (DB only)
 * ====================================================================== */
export async function listClientMaterialsByClientId(clientId: number) {
  const db = await getDb();
  return (db as any)
    .select()
    .from(clientMaterials)
    .where(eq((clientMaterials as any).clientId, clientId))
    .orderBy(desc((clientMaterials as any).createdAt));
}

export async function createClientMaterial(data: InsertClientMaterial) {
  const db = await getDb();
  const result = await (db as any).insert(clientMaterials).values(data as any);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function createMaterialVersion(data: InsertMaterialVersion) {
  const db = await getDb();
  const result = await (db as any).insert(materialVersions).values(data as any);
  return Number((result as any)[0]?.insertId ?? 0);
}
