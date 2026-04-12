-- RLS para bucket library (Storage)
-- Acesso baseado no tenant_slug (primeiro segmento do path)

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "library read" ON storage.objects;
CREATE POLICY "library read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'library'
  AND EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = split_part(name, '/', 1)
  )
);

DROP POLICY IF EXISTS "library write" ON storage.objects;
CREATE POLICY "library write"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'library'
  AND EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = split_part(name, '/', 1)
  )
);

DROP POLICY IF EXISTS "library update" ON storage.objects;
CREATE POLICY "library update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'library'
  AND EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = split_part(name, '/', 1)
  )
);

DROP POLICY IF EXISTS "library delete" ON storage.objects;
CREATE POLICY "library delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'library'
  AND EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = split_part(name, '/', 1)
  )
);
