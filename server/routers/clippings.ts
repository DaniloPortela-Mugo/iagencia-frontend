import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";

export const clippingsRouter = router({
  listByClientId: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("clippings")
        .select("id, client_id, title, url, source, summary, sentiment, is_competitor, published_date, created_at")
        .eq("client_id", input.clientId)
        .order("published_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  create: adminProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        title: z.string().min(1),
        url: z.string().min(3),
        source: z.string().optional().default(""),
        summary: z.string().optional().default(""),
        sentiment: z.enum(["positive", "neutral", "negative"]).default("neutral"),
        isCompetitor: z.number().int().min(0).max(1).default(0),
        publishedDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("clippings")
        .insert({
          client_id: input.clientId,
          title: input.title,
          url: input.url,
          source: input.source ?? "",
          summary: input.summary ?? "",
          sentiment: input.sentiment,
          is_competitor: input.isCompetitor === 1,
          published_date: input.publishedDate ? input.publishedDate.toISOString() : new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),
});
