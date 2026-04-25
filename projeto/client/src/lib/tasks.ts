import { supabase } from "./supabase";

export async function updateTaskStatus(
  taskId: number,
  status: string,
  updatedBy?: string | null
) {
  const payload: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (updatedBy) payload.updated_by = updatedBy;

  try {
    const { data } = await supabase
      .from("tasks")
      .select("id,parent_task_id")
      .eq("id", taskId)
      .maybeSingle();
    const parentId = data?.parent_task_id;

    if (parentId) {
      const res = await supabase
        .from("tasks")
        .update(payload)
        .or(`id.eq.${taskId},parent_task_id.eq.${parentId}`)
        .select("id");
      if (res.error || !res.data?.length) {
        return supabase.from("tasks").update(payload).eq("id", taskId);
      }
      return res;
    }

    const res = await supabase
      .from("tasks")
      .update(payload)
      .or(`id.eq.${taskId},parent_task_id.eq.${taskId}`)
      .select("id");
    if (res.error || !res.data?.length) {
      return supabase.from("tasks").update(payload).eq("id", taskId);
    }
    return res;
  } catch {
    return supabase.from("tasks").update(payload).eq("id", taskId);
  }
}
