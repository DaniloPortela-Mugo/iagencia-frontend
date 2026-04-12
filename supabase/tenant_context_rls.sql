-- RLS para tenant_context
-- Acesso por tenant_slug (mesma regra dos demais)

ALTER TABLE public.tenant_context ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_context read" ON public.tenant_context;
CREATE POLICY "tenant_context read"
ON public.tenant_context
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = tenant_context.tenant_slug
  )
);

DROP POLICY IF EXISTS "tenant_context insert" ON public.tenant_context;
CREATE POLICY "tenant_context insert"
ON public.tenant_context
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = tenant_context.tenant_slug
  )
);

DROP POLICY IF EXISTS "tenant_context update" ON public.tenant_context;
CREATE POLICY "tenant_context update"
ON public.tenant_context
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = tenant_context.tenant_slug
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = tenant_context.tenant_slug
  )
);

DROP POLICY IF EXISTS "tenant_context delete" ON public.tenant_context;
CREATE POLICY "tenant_context delete"
ON public.tenant_context
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = tenant_context.tenant_slug
  )
);
