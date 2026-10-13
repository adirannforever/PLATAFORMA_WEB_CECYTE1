BEGIN;

ALTER TABLE public.comunicados
  ADD COLUMN IF NOT EXISTS archivos JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comunicados_archivos_array_check'
      AND conrelid = 'public.comunicados'::regclass
  ) THEN
    ALTER TABLE public.comunicados
      ADD CONSTRAINT comunicados_archivos_array_check
      CHECK (jsonb_typeof(archivos) = 'array');
  END IF;
END;
$$;

COMMIT;
