BEGIN;

DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.usuarios'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%rol%'
      AND pg_get_constraintdef(oid) ILIKE '%administrador%'
  LOOP
    EXECUTE format('ALTER TABLE public.usuarios DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('alumno', 'docente', 'administrador', 'aspirante', 'control_escolar', 'directivo', 'tutor'));

ALTER TABLE public.aspirantes
  ADD COLUMN IF NOT EXISTS usuario_id INTEGER UNIQUE
  REFERENCES public.usuarios(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.aspirante_invitaciones (
  id           BIGSERIAL PRIMARY KEY,
  aspirante_id INTEGER NOT NULL REFERENCES public.aspirantes(id) ON DELETE CASCADE,
  token_hash   CHAR(64) NOT NULL UNIQUE,
  vence_en     TIMESTAMPTZ NOT NULL,
  usado_en     TIMESTAMPTZ,
  creado_por   INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aspirante_invitaciones_pendientes
  ON public.aspirante_invitaciones (aspirante_id, vence_en)
  WHERE usado_en IS NULL;

COMMIT;
