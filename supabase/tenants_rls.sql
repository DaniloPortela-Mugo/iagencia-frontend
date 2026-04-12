-- RLS para tenants
-- Permite gerenciamento apenas para admins internos

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants read internal" ON public.tenants;
CREATE POLICY "tenants read internal"
ON public.tenants
FOR SELECT
USING (
  auth.uid() IN (
    '36026e4f-d53c-422a-ae79-313f25eda530', -- Danilo
    '48e96bd4-03b5-488e-91fb-c4e4a27d1d81', -- Julia
    'a9c2011e-9d12-4289-9d27-9bf9d5096333'  -- Kleber
  )
);

DROP POLICY IF EXISTS "tenants write internal" ON public.tenants;
CREATE POLICY "tenants write internal"
ON public.tenants
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    '36026e4f-d53c-422a-ae79-313f25eda530',
    '48e96bd4-03b5-488e-91fb-c4e4a27d1d81',
    'a9c2011e-9d12-4289-9d27-9bf9d5096333'
  )
);

DROP POLICY IF EXISTS "tenants update internal" ON public.tenants;
CREATE POLICY "tenants update internal"
ON public.tenants
FOR UPDATE
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

DROP POLICY IF EXISTS "tenants delete internal" ON public.tenants;
CREATE POLICY "tenants delete internal"
ON public.tenants
FOR DELETE
USING (
  auth.uid() IN (
    '36026e4f-d53c-422a-ae79-313f25eda530',
    '48e96bd4-03b5-488e-91fb-c4e4a27d1d81',
    'a9c2011e-9d12-4289-9d27-9bf9d5096333'
  )
);
