import { supabase } from "@/lib/supabase";

/**
 * Pega o workspace do usuário logado.
 * Evita 406 usando maybeSingle() e tratando "sem membership".
 */
export async function getMyWorkspaceId(): Promise<string> {
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;

  const userId = auth.user?.id;
  if (!userId) throw new Error("Usuário não autenticado.");

  // IMPORTANTE:
  // na sua base, workspace_members usa "profile_id" (UUID).
  // pelo que você mostrou, profile_id está recebendo o UUID do auth.user.id.
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("profile_id", userId)
    .limit(1)
    .maybeSingle();

  // maybeSingle não explode com 406, mas pode retornar null
  if (error) throw error;

  if (!data?.workspace_id) {
    throw new Error(
      "Seu usuário ainda não tem workspace_members. Rode o SQL de criação de workspace/membership no Supabase."
    );
  }

  return data.workspace_id as string;
}
