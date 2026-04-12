// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./index";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Se você ainda não tem auth no ctx, deixa "adminProcedure" como liberado por enquanto
export const adminProcedure = t.procedure;

// (se quiser um protected de verdade depois, a gente liga com session)
export const protectedProcedure = t.procedure;

export { TRPCError };
