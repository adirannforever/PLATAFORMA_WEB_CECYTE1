-- ============================================================
-- MIGRACIÓN 002: Objetos de dominio ausentes en los SQL versionados
-- ------------------------------------------------------------
-- Cierra el diff estructural detectado contra el baseline de Neon
-- (ver snapshots/DIFF-neon-baseline-vs-versionados.md):
--   - Vista  public.v_promedios_periodo
--   - Funcion public.generar_periodos_ciclo() + trigger trigger_generar_periodos
--   - Funcion public.verificar_conflicto_horario_docente()
--            + trigger trg_verificar_horario_docente
--
-- Idempotente: se puede ejecutar varias veces sin error.
--   - Funciones/vista usan CREATE OR REPLACE.
--   - Triggers se eliminan (DROP ... IF EXISTS) y se recrean.
-- Aditiva: no altera tablas ni datos existentes.
-- Fuente: backend/src/db/snapshots/neon-baseline-2026-10-12.sql (schema-only).
-- ============================================================

BEGIN;

-- 1) Vista de promedios por parcial (evaluaciones ordinarias)
CREATE OR REPLACE VIEW public.v_promedios_periodo AS
 SELECT alumno_id,
    ciclo_id,
    parcial,
    round(avg(calificacion), 2) AS promedio_parcial
   FROM public.calificaciones c
  WHERE ((tipo_evaluacion)::text = 'ordinaria'::text)
  GROUP BY alumno_id, ciclo_id, parcial;

-- 2) Función: generar periodos escolares al crear un ciclo
CREATE OR REPLACE FUNCTION public.generar_periodos_ciclo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  year_start INTEGER;
  sem INTEGER;
  tipo_record RECORD;
  base_date DATE;
BEGIN
  year_start := EXTRACT(YEAR FROM NEW.fecha_inicio);

  -- Para cada semestre (1 y 2)
  FOR sem IN 1..2 LOOP
    -- Calcular fechas base
    IF sem = 1 THEN
      base_date := make_date(year_start, 1, 15);
    ELSE
      base_date := make_date(year_start, 8, 15);
    END IF;

    -- Insertar periodos para este semestre
    FOR tipo_record IN (
      VALUES
        ('preinscripcion', -60, -30),
        ('inscripcion_nuevo_ingreso', -30, 0),
        ('inicio_semestre', 0, 0),
        ('reinscripcion', 150, 180),
        ('fin_semestre', 180, 180),
        ('evaluaciones_parciales', 45, 75),
        ('evaluacion_recuperacion', 120, 130),
        ('evaluacion_extraordinaria', 160, 170),
        ('curso_intersemestral', 190, 210)
    ) LOOP
      INSERT INTO periodos_escolares (ciclo_id, semestre, tipo, fecha_inicio, fecha_fin, activo)
      VALUES (
        NEW.id,
        sem,
        tipo_record.column1,
        base_date + (tipo_record.column2 || ' days')::INTERVAL,
        base_date + (tipo_record.column3 || ' days')::INTERVAL,
        TRUE
      );
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 3) Función: validar conflicto de horario de docente
CREATE OR REPLACE FUNCTION public.verificar_conflicto_horario_docente() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_docente_id INTEGER;
BEGIN
  -- Obtener el docente de la materia_grupo que se está intentando programar
  SELECT docente_id INTO v_docente_id
  FROM materias_grupo
  WHERE id = NEW.materia_grupo_id;

  -- Verificar si el docente ya tiene otra clase en el mismo ciclo, día y periodo
  IF EXISTS (
    SELECT 1
    FROM horarios h
    JOIN materias_grupo mg ON mg.id = h.materia_grupo_id
    WHERE h.ciclo_id = NEW.ciclo_id
      AND h.dia_semana = NEW.dia_semana
      AND h.periodo_id = NEW.periodo_id
      AND mg.docente_id = v_docente_id
      AND h.id <> COALESCE(NEW.id, 0)
  ) THEN
    RAISE EXCEPTION 'Conflicto de horario: El docente ya se encuentra impartiendo otra clase en este mismo día y periodo.';
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Trigger: genera periodos al insertar un ciclo escolar
DROP TRIGGER IF EXISTS trigger_generar_periodos ON public.ciclos_escolares;
CREATE TRIGGER trigger_generar_periodos AFTER INSERT ON public.ciclos_escolares
  FOR EACH ROW EXECUTE FUNCTION public.generar_periodos_ciclo();

-- 5) Trigger: valida conflicto de horario docente
DROP TRIGGER IF EXISTS trg_verificar_horario_docente ON public.horarios;
CREATE TRIGGER trg_verificar_horario_docente BEFORE INSERT OR UPDATE ON public.horarios
  FOR EACH ROW EXECUTE FUNCTION public.verificar_conflicto_horario_docente();

COMMIT;
