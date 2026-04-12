import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { registerOAuthRoutes } from "../server/_core/oauth";
import { createContext } from "../server/_core/context";
import { appRouter } from "../server/routers";

/**
 * Vercel Serverless Function entrypoint.
 *
 * - Frontend is served by Vercel as static assets from dist/public.
 * - This function only exposes backend routes under /api/*.
 */
const app = express();

// Larger size limit for uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// OAuth callback under /api/oauth/callback
registerOAuthRoutes(app);

// tRPC API under /api/trpc
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default async function handler(req: any, res: any) {
  return app(req, res);
}
