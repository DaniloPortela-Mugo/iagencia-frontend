-- RLS para art_drafts
-- Permite acesso apenas aos usuários que possuem o tenant_slug na tabela user_tenants

ALTER TABLE public.art_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "art_drafts read" ON public.art_drafts;
CREATE POLICY "art_drafts read"
ON public.art_drafts
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = art_drafts.tenant_slug
  )
);

DROP POLICY IF EXISTS "art_drafts insert" ON public.art_drafts;
CREATE POLICY "art_drafts insert"
ON public.art_drafts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = art_drafts.tenant_slug
  )
);

DROP POLICY IF EXISTS "art_drafts update" ON public.art_drafts;
CREATE POLICY "art_drafts update"
ON public.art_drafts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = art_drafts.tenant_slug
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = art_drafts.tenant_slug
  )
);

DROP POLICY IF EXISTS "art_drafts delete" ON public.art_drafts;
CREATE POLICY "art_drafts delete"
ON public.art_drafts
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = art_drafts.tenant_slug
  )
);
