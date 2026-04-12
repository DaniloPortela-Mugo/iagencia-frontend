// server/_core/context.ts
import type { Request, Response } from "express";
import { supabaseAdmin } from "./supabaseAdmin";

export type TrpcUser = {
  id: string; // UUID do Supabase
  email?: string | null;
};

export type TrpcContext = {
  req: Request;
  res: Response;
  user: TrpcUser | null;
};

export async function createContext(opts: { req: Request; res: Response }): Promise<TrpcContext> {
  const { req, res } = opts;

  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return { req, res, user: null };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return { req, res, user: null };
  }

  return {
    req,
    res,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
    },
  };
}
