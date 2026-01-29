// server/_core/systemRouter.ts
import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

import { mediaChannelsRouter } from "../routers/media-channels";
import { mediaBroadcastsRouter } from "../routers/media-broadcasts";

export const systemRouter = router({
  health: publicProcedure
    .input(z.object({ timestamp: z.number().min(0) }))
    .query(() => ({ ok: true })),

  notifyOwner: adminProcedure
    .input(z.object({ title: z.string().min(1), content: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return { success: delivered } as const;
    }),

  // ✅ precisa estar EXATAMENTE com esses nomes (pq seu front chama trpc.mediaChannels / trpc.mediaBroadcasts)
  mediaChannels: mediaChannelsRouter,
  mediaBroadcasts: mediaBroadcastsRouter,
});
