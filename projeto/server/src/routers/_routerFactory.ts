import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../lib/trpc";

/**
 * Factory para criar routers stub padronizados.
 * Mantém contrato fixo: listByClientId + CRUD básico.
 * Você só troca o "return []" / "return {}" depois pelo acesso real ao banco.
 */
export function makeClientCrudRouter(entityName: string) {
  return createTRPCRouter({
    listByClientId: protectedProcedure
      .input(z.object({ clientId: z.string().uuid() }))
      .query(async () => {
        return [];
      }),

    list: protectedProcedure
      .input(z.object({ clientId: z.string().uuid() }).optional())
      .query(async () => {
        return [];
      }),

    create: protectedProcedure
      .input(
        z.object({
          clientId: z.string().uuid(),
          payload: z.any().optional(),
        })
      )
      .mutation(async () => {
        return { ok: true, entity: entityName };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          payload: z.any().optional(),
        })
      )
      .mutation(async () => {
        return { ok: true, entity: entityName };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async () => {
        return { ok: true, entity: entityName };
      }),
  });
}
