// server/routers/media-broadcasts.ts
import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";

export const mediaBroadcastsRouter = router({
  listByClientId: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("media_broadcasts")
        .select(
          "id, client_id, channel_id, title, insertions_count, duration, cost_per_insertion, notes, created_at"
        )
        .eq("client_id", input.clientId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  create: adminProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        channelId: z.string(), // bigint vindo do select como string no front
        title: z.string().min(1),
        insertionsCount: z.number().int().min(1).default(1),
        duration: z.number().int().min(1).default(30),
        costPerInsertion: z.number().nullable().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("media_broadcasts")
        .insert({
          client_id: input.clientId,
          channel_id: input.channelId,
          title: input.title,
          insertions_count: input.insertionsCount,
          duration: input.duration,
          cost_per_insertion: input.costPerInsertion ?? null,
          notes: input.notes ?? null,
        })
        .select(
          "id, client_id, channel_id, title, insertions_count, duration, cost_per_insertion, notes, created_at"
        )
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("media_broadcasts")
        .delete()
        .eq("id", input.id);

      if (error) throw new Error(error.message);
      return { ok: true } as const;
    }),
});
