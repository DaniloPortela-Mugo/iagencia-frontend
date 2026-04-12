-- Adiciona updated_at e trigger de atualização automática em tasks

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS updated_at timestamptz default now();

CREATE OR REPLACE FUNCTION public.set_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_tasks_updated_at();
