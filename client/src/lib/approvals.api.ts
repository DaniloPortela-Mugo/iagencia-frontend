import { supabase } from "@/lib/supabase";

// ✅ Ajuste aqui se seus nomes forem diferentes no Supabase:
const TABLE_APPROVALS = "approvals";
const TABLE_APPROVAL_COMMENTS = "approval_comments"; // <-- se não existir, troque
const TABLE_APPROVAL_HISTORY = "approval_history";   // <-- se não existir, troque
const TABLE_CLIENTS = "clients";
const TABLE_USERS = "users";

export type ApprovalStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "rejected"
  | "revision_requested";

export type Priority = "low" | "medium" | "high" | "urgent";

export type ContentType =
  | "post"
  | "video"
  | "image"
  | "audio"
  | "document"
  | "campaign"
  | "other";

export type ListApprovalsParams = {
  status?: ApprovalStatus;
  clientId?: number;
  priority?: Priority;
};

type ApprovalRow = Record<string, any>;
type ClientRow = Record<string, any>;
type UserRow = Record<string, any>;

function mapApprovalRow(a: ApprovalRow) {
  // tenta cobrir snake_case e camelCase
  return {
    id: a.id,
    clientId: a.client_id ?? a.clientId ?? null,
    requesterId: a.requester_id ?? a.requesterId ?? a.created_by ?? a.createdBy ?? null,
    approverId: a.approver_id ?? a.approverId ?? null,

    title: a.title ?? "",
    description: a.description ?? null,

    status: (a.status ?? "pending") as ApprovalStatus,
    priority: (a.priority ?? "medium") as Priority,
    contentType: (a.content_type ?? a.contentType ?? "post") as ContentType,

    contentUrl: a.content_url ?? a.contentUrl ?? null,
    dueDate: a.due_date ?? a.dueDate ?? null,

    rejectionReason: a.rejection_reason ?? a.rejectionReason ?? null,
    approvedAt: a.approved_at ?? a.approvedAt ?? null,

    createdAt: a.created_at ?? a.createdAt ?? null,
    updatedAt: a.updated_at ?? a.updatedAt ?? null,
  };
}

export async function listClients() {
  const { data, error } = await supabase.from(TABLE_CLIENTS).select("*").order("id", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listApprovals(params: ListApprovalsParams) {
  let q = supabase.from(TABLE_APPROVALS).select("*").order("id", { ascending: false });

  if (params.status) q = q.eq("status", params.status);
  if (params.clientId) q = q.eq("client_id", params.clientId);
  if (params.priority) q = q.eq("priority", params.priority);

  const { data, error } = await q;
  if (error) throw error;

  const approvals = (data ?? []).map(mapApprovalRow);

  // batch load clients + users
  const clientIds = Array.from(new Set(approvals.map((a) => a.clientId).filter(Boolean)));
  const userIds = Array.from(
    new Set(approvals.flatMap((a) => [a.requesterId, a.approverId]).filter(Boolean))
  );

  const [clients, users] = await Promise.all([getClientsByIds(clientIds), getUsersByIds(userIds)]);

  const clientsById = new Map<number, ClientRow>(clients.map((c: any) => [c.id, c]));
  const usersById = new Map<number, UserRow>(users.map((u: any) => [u.id, u]));

  // formato igual seu UI já espera:
  return approvals.map((a) => ({
    approval: a,
    client: a.clientId ? clientsById.get(a.clientId) ?? null : null,
    requester: a.requesterId ? usersById.get(a.requesterId) ?? null : null,
    approver: a.approverId ? usersById.get(a.approverId) ?? null : null,
  }));
}

async function getClientsByIds(ids: number[]) {
  if (!ids.length) return [];
  const { data, error } = await supabase.from(TABLE_CLIENTS).select("*").in("id", ids);
  if (error) throw error;
  return data ?? [];
}

async function getUsersByIds(ids: number[]) {
  if (!ids.length) return [];
  const { data, error } = await supabase.from(TABLE_USERS).select("*").in("id", ids);
  if (error) throw error;
  return data ?? [];
}

export async function getApprovalById(id: number) {
  const { data, error } = await supabase.from(TABLE_APPROVALS).select("*").eq("id", id).maybeSingle();
  if (error) throw error;

  if (!data) return null;

  const approval = mapApprovalRow(data);

  const [client, requester, approver] = await Promise.all([
    approval.clientId ? supabase.from(TABLE_CLIENTS).select("*").eq("id", approval.clientId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    approval.requesterId ? supabase.from(TABLE_USERS).select("*").eq("id", approval.requesterId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    approval.approverId ? supabase.from(TABLE_USERS).select("*").eq("id", approval.approverId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);

  if (client.error) throw client.error;
  if (requester.error) throw requester.error;
  if (approver.error) throw approver.error;

  return {
    approval,
    client: client.data ?? null,
    requester: requester.data ?? null,
    approver: approver.data ?? null,
  };
}

export async function createApproval(payload: {
  clientId: number;
  title: string;
  description?: string;
  contentType: ContentType;
  contentUrl?: string;
  priority: Priority;
  dueDate?: Date;
  requesterId?: number;
}) {
  const insertRow: any = {
    client_id: payload.clientId,
    title: payload.title,
    description: payload.description ?? null,
    content_type: payload.contentType,
    content_url: payload.contentUrl ?? null,
    priority: payload.priority,
    status: "pending",
    due_date: payload.dueDate ? payload.dueDate.toISOString() : null,
  };

  // se existir coluna de solicitante, tenta preencher
  if (payload.requesterId) insertRow.requester_id = payload.requesterId;

  const { error } = await supabase.from(TABLE_APPROVALS).insert(insertRow);
  if (error) throw error;
}

export async function updateApprovalStatus(payload: {
  id: number;
  status: ApprovalStatus;
  notes?: string;
  rejectionReason?: string;
  approverId?: number;
}) {
  const patch: any = {
    status: payload.status,
    rejection_reason: payload.rejectionReason ?? null,
  };

  if (payload.approverId) patch.approver_id = payload.approverId;

  // se aprovado, tenta setar approved_at
  if (payload.status === "approved") patch.approved_at = new Date().toISOString();

  const { error } = await supabase.from(TABLE_APPROVALS).update(patch).eq("id", payload.id);
  if (error) throw error;

  // histórico (se tabela existir)
  try {
    await supabase.from(TABLE_APPROVAL_HISTORY).insert({
      approval_id: payload.id,
      new_status: payload.status,
      notes: payload.notes ?? null,
      created_by: payload.approverId ?? null,
      created_at: new Date().toISOString(),
    });
  } catch {
    // se a tabela não existir, não quebra o app
  }
}

export async function listApprovalComments(approvalId: number) {
  const { data, error } = await supabase
    .from(TABLE_APPROVAL_COMMENTS)
    .select("*")
    .eq("approval_id", approvalId)
    .order("id", { ascending: true });

  if (error) throw error;

  const rows = data ?? [];
  const userIds = Array.from(new Set(rows.map((r: any) => r.user_id ?? r.created_by).filter(Boolean)));
  const users = await getUsersByIds(userIds);
  const usersById = new Map<number, any>(users.map((u: any) => [u.id, u]));

  return rows.map((r: any) => ({
    comment: {
      id: r.id,
      approvalId: r.approval_id ?? approvalId,
      comment: r.comment ?? r.message ?? "",
      createdAt: r.created_at ?? r.createdAt ?? null,
    },
    user: usersById.get(r.user_id ?? r.created_by) ?? null,
  }));
}

export async function createApprovalComment(payload: { approvalId: number; comment: string; userId?: number }) {
  const row: any = {
    approval_id: payload.approvalId,
    comment: payload.comment,
    created_at: new Date().toISOString(),
  };
  if (payload.userId) row.user_id = payload.userId;

  const { error } = await supabase.from(TABLE_APPROVAL_COMMENTS).insert(row);
  if (error) throw error;
}

export async function listApprovalHistory(approvalId: number) {
  const { data, error } = await supabase
    .from(TABLE_APPROVAL_HISTORY)
    .select("*")
    .eq("approval_id", approvalId)
    .order("id", { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  const userIds = Array.from(new Set(rows.map((r: any) => r.created_by ?? r.user_id).filter(Boolean)));
  const users = await getUsersByIds(userIds);
  const usersById = new Map<number, any>(users.map((u: any) => [u.id, u]));

  return rows.map((r: any) => ({
    history: {
      id: r.id,
      approvalId: r.approval_id ?? approvalId,
      newStatus: r.new_status ?? r.status ?? "pending",
      notes: r.notes ?? null,
      createdAt: r.created_at ?? r.createdAt ?? null,
    },
    user: usersById.get(r.created_by ?? r.user_id) ?? null,
  }));
}
