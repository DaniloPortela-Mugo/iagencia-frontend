import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";

export const clientCompetitorsRouter = router({
  listByClientId: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("client_competitors")
        .select("id, client_id, name, party, created_at")
        .eq("client_id", input.clientId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    }),
});
