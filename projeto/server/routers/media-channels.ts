// server/routers/media-channels.ts
import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";

export const mediaChannelsRouter = router({
  listByClientId: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("media_channels")
        .select("id, client_id, name, type, created_at")
        .eq("client_id", input.clientId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  create: adminProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        name: z.string().min(1),
        type: z.string().min(1).default("TV"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("media_channels")
        .insert({
          client_id: input.clientId,
          name: input.name,
          type: input.type,
        })
        .select("id, client_id, name, type, created_at")
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() })) // id é bigint, mas chega como string do front
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("media_channels")
        .delete()
        .eq("id", input.id);

      if (error) throw new Error(error.message);
      return { ok: true } as const;
    }),
});
