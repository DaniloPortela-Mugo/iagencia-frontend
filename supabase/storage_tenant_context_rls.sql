-- RLS para bucket tenant-context (Storage)
-- Garante acesso apenas ao prefixo do tenant (primeiro segmento do path)

-- Ativar RLS no storage.objects (se ainda não estiver)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Leitura: usuário pode ler arquivos do seu tenant
CREATE POLICY "tenant-context read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'tenant-context'
  AND EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = split_part(name, '/', 1)
  )
);

-- Escrita: apenas admins do tenant
CREATE POLICY "tenant-context write"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tenant-context'
  AND EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = split_part(name, '/', 1)
      AND ut.role = 'admin'
  )
);

CREATE POLICY "tenant-context update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tenant-context'
  AND EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = split_part(name, '/', 1)
      AND ut.role = 'admin'
  )
);

CREATE POLICY "tenant-context delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tenant-context'
  AND EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = split_part(name, '/', 1)
      AND ut.role = 'admin'
  )
);
