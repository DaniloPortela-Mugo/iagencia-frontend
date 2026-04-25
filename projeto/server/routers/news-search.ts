import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";

export const newsSearchRouter = router({
  search: adminProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        query: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // registra no histórico (se existir a tabela news_searches)
      // se não existir, simplesmente devolve completed vazio
      try {
        await ctx.supabase.from("news_searches").insert({
          client_id: input.clientId,
          search_query: input.query?.trim() || "automatic",
          status: "completed",
          news_found: 0,
          news_saved: 0,
        });
      } catch {}

      return {
        status: "completed",
        newsFound: [],
        newsSaved: 0,
      };
    }),

  history: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // se não existir, retorna vazio sem quebrar
      const { data, error } = await ctx.supabase
        .from("news_searches")
        .select("id, client_id, search_query, status, news_found, news_saved, created_at")
        .eq("client_id", input.clientId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) return [];
      // compat com o front: createdAt + newsFound
      return (data ?? []).map((r: any) => ({
        ...r,
        createdAt: r.created_at,
        newsFound: r.news_found ?? 0,
      }));
    }),
});
