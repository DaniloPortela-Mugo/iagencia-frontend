-- Metadata opcional para relacionar approvals com jobs criados

ALTER TABLE public.approvals
ADD COLUMN IF NOT EXISTS metadata jsonb;
