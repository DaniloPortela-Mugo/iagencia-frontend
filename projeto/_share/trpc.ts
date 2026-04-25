// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import * as dbHelpers from "../db-helpers";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * =========================
 * PROTECTED
 * =========================
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Não autenticado",
    });
  }

  // garante user legacy no DB
  const legacy = await dbHelpers.getOrCreateUserBySupabaseId({
    supabaseId: ctx.user.id,
    email: ctx.user.email ?? null,
    name: null,
  });

  return next({
    ctx: {
      ...ctx,
      user: {
        ...ctx.user,
        legacyId: legacy.id,
        role: legacy.role ?? "user",
      } as any,
    },
  });
});

/**
 * =========================
 * ADMIN
 * =========================
 * ⚠️ DEV MODE: qualquer user passa
 */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (process.env.NODE_ENV === "development") {
    return next({ ctx });
  }

  const role = (ctx.user as any)?.role ?? "user";
  if (role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sem permissão",
    });
  }

  return next({ ctx });
});
