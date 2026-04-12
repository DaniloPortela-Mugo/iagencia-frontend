-- RLS para approvals
-- Permite acesso apenas aos usuários que possuem o tenant_slug na tabela user_tenants

ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approvals read" ON public.approvals;
CREATE POLICY "approvals read"
ON public.approvals
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = approvals.tenant_slug
  )
);

DROP POLICY IF EXISTS "approvals insert" ON public.approvals;
CREATE POLICY "approvals insert"
ON public.approvals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = approvals.tenant_slug
  )
);

DROP POLICY IF EXISTS "approvals update" ON public.approvals;
CREATE POLICY "approvals update"
ON public.approvals
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = approvals.tenant_slug
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = approvals.tenant_slug
  )
);

DROP POLICY IF EXISTS "approvals delete" ON public.approvals;
CREATE POLICY "approvals delete"
ON public.approvals
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = approvals.tenant_slug
  )
);
