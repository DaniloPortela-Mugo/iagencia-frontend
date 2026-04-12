-- Tokens OAuth do Google Drive por tenant
CREATE TABLE IF NOT EXISTS public.tenant_drive_tokens (
  tenant_slug text primary key,
  access_token text,
  refresh_token text,
  expires_at bigint,
  drive_folder_id text,
  updated_at timestamptz default now()
);

ALTER TABLE public.tenant_drive_tokens ENABLE ROW LEVEL SECURITY;

-- Sem policies: acesso bloqueado via RLS (backend usa service role)
