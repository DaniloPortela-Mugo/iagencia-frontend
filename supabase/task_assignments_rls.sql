-- RLS para task_assignments
-- Acesso por tenant_slug (mesma regra dos demais departamentos)

ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_assignments read" ON public.task_assignments;
CREATE POLICY "task_assignments read"
ON public.task_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = task_assignments.tenant_slug
  )
);

DROP POLICY IF EXISTS "task_assignments insert" ON public.task_assignments;
CREATE POLICY "task_assignments insert"
ON public.task_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = task_assignments.tenant_slug
  )
);

DROP POLICY IF EXISTS "task_assignments update" ON public.task_assignments;
CREATE POLICY "task_assignments update"
ON public.task_assignments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = task_assignments.tenant_slug
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = task_assignments.tenant_slug
  )
);

DROP POLICY IF EXISTS "task_assignments delete" ON public.task_assignments;
CREATE POLICY "task_assignments delete"
ON public.task_assignments
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_slug = task_assignments.tenant_slug
  )
);
