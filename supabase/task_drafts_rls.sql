-- RLS para task_drafts
-- Permite acesso apenas aos usuários que possuem o tenant_slug na tabela user_tenants

ALTER TABLE public.task_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_drafts read" ON public.task_drafts;
CREATE POLICY "task_drafts read"
ON public.task_drafts
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = task_drafts.tenant_slug
  )
);

DROP POLICY IF EXISTS "task_drafts insert" ON public.task_drafts;
CREATE POLICY "task_drafts insert"
ON public.task_drafts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = task_drafts.tenant_slug
  )
);

DROP POLICY IF EXISTS "task_drafts update" ON public.task_drafts;
CREATE POLICY "task_drafts update"
ON public.task_drafts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = task_drafts.tenant_slug
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = task_drafts.tenant_slug
  )
);

DROP POLICY IF EXISTS "task_drafts delete" ON public.task_drafts;
CREATE POLICY "task_drafts delete"
ON public.task_drafts
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = task_drafts.tenant_slug
  )
);
