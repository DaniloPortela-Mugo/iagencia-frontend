-- RLS para library
-- Permite acesso apenas aos usuários que possuem o tenant_slug na tabela user_tenants

ALTER TABLE public.library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "library read" ON public.library;
CREATE POLICY "library read"
ON public.library
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = library.tenant_slug
  )
);

DROP POLICY IF EXISTS "library insert" ON public.library;
CREATE POLICY "library insert"
ON public.library
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = library.tenant_slug
  )
);

DROP POLICY IF EXISTS "library update" ON public.library;
CREATE POLICY "library update"
ON public.library
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = library.tenant_slug
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = library.tenant_slug
  )
);

DROP POLICY IF EXISTS "library delete" ON public.library;
CREATE POLICY "library delete"
ON public.library
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = library.tenant_slug
  )
);
