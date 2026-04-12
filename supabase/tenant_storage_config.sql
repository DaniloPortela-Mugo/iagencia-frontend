-- Configuração de storage por tenant
CREATE TABLE IF NOT EXISTS public.tenant_storage_config (
  tenant_slug text primary key,
  provider text not null default 'gdrive',
  config jsonb null,
  updated_at timestamptz default now()
);

ALTER TABLE public.tenant_storage_config ENABLE ROW LEVEL SECURITY;

-- Somente admin pode ler/escrever (ajuste IDs se necessário)
DROP POLICY IF EXISTS "tenant_storage_config admin read" ON public.tenant_storage_config;
CREATE POLICY "tenant_storage_config admin read"
ON public.tenant_storage_config FOR SELECT
USING (
  auth.uid() IN (
    '36026e4f-d53c-422a-ae79-313f25eda530',
    '48e96bd4-03b5-488e-91fb-c4e4a27d1d81',
    'a9c2011e-9d12-4289-9d27-9bf9d5096333'
  )
);

DROP POLICY IF EXISTS "tenant_storage_config admin write" ON public.tenant_storage_config;
CREATE POLICY "tenant_storage_config admin write"
ON public.tenant_storage_config FOR ALL
USING (
  auth.uid() IN (
    '36026e4f-d53c-422a-ae79-313f25eda530',
    '48e96bd4-03b5-488e-91fb-c4e4a27d1d81',
    'a9c2011e-9d12-4289-9d27-9bf9d5096333'
  )
)
WITH CHECK (
  auth.uid() IN (
    '36026e4f-d53c-422a-ae79-313f25eda530',
    '48e96bd4-03b5-488e-91fb-c4e4a27d1d81',
    'a9c2011e-9d12-4289-9d27-9bf9d5096333'
  )
);
