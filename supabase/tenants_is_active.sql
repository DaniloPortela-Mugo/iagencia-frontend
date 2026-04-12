ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS tenants_is_active_idx
  ON public.tenants (is_active);
