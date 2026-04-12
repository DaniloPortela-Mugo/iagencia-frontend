ALTER TABLE public.library
ADD COLUMN IF NOT EXISTS provider text not null default 'gdrive';


