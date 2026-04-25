import { router } from "../_core/trpc";

import { clientsRouter } from "./clients"; // você já tem
import { clippingsRouter } from "./clippings";
import { clientNewsSourcesRouter } from "./client-news-sources";
import { clientCompetitorsRouter } from "./client-competitors";
import { newsSearchRouter } from "./news-search";

export const appRouter = router({
  clients: clientsRouter,
  clippings: clippingsRouter,
  clientNewsSources: clientNewsSourcesRouter,
  clientCompetitors: clientCompetitorsRouter,
  newsSearch: newsSearchRouter,
});

export type AppRouter = typeof appRouter;
