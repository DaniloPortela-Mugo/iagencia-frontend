import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";

export const clientNewsSourcesRouter = router({
  listByClientId: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("client_news_sources")
        .select("id, client_id, name, url, source_type, keywords, created_at")
        .eq("client_id", input.clientId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      // 👇 Compat com seu front (sourceType camelCase)
      return (data ?? []).map((r: any) => ({
        ...r,
        sourceType: r.source_type ?? r.sourceType ?? "other",
      }));
    }),
});
