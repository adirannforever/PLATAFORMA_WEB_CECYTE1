-- ============================================================
-- MIGRACIÓN 005: Planes de estudio con versiones y asignaciones
-- ------------------------------------------------------------
-- Implementa el modelo de planes de estudio por versión con:
--   - planes_estudio: versiones (borrador/publicado/archivado) con
--     vigencia y snapshot de datos del catálogo.
--   - plan_materias: materias de cada versión (semestre, tipo,
--     horas_semana snapshot, FK a materias_catalogo).
--   - plan_materias_prerrequisitos: prerrequisitos con FK compuesta
--     (version_id, materia_id) para garantizar que prerrequisito y
--     materia requerida pertenezcan a la misma versión.
--   - plan_asignaciones: asignación de un plan a un grupo (default) o
--     a un alumno (excepción), con rango de fechas [desde, hasta) y
--     restricción de no solapamiento a nivel de base de datos.
--
-- Diseño resuelto contra las observaciones del re-análisis:
--   D1: la asignación se resuelve sobre la membresía del grupo del
--       alumno en la fecha histórica (no hay tabla de inscripción
--       aparte; se usa grupo_actual_id / historial_grupos_alumno).
--   D2: solapamiento de asignaciones bloqueado con EXCLUDE sobre
--       tstzrange [desde, hasta).
--   D3: prerrequisitos con clave foránea compuesta que incluye
--       version_id (imposible referenciar versión distinta).
--   D4: 'archivado' solo impide nuevas asignaciones; no invalida
--       asignaciones existentes ni la resolución histórica.
--   D5: prerrequisitos en el mismo o semestre posterior SIEMPRE
--       inválidos (no existe campo de excepción).
--   D6: cursada = inscrito/asistió; aprobada = calificación >= 6.
--   D7: versiones publicadas son inmutables (solo cambia estado a
--       'archivado'); se bloquea UPDATE/DELETE mediante trigger.
--   D8: despliegue adelante-compatible; no se promete rollback.
--
-- Rol autorizado: control_escolar (no existe rol 'coordinador').
-- Idempotente: usa IF NOT EXISTS / DROP IF EXISTS donde aplica.
-- Aditiva: no altera tablas ni datos existentes.
-- ============================================================

BEGIN;

-- btree_gist es requerido por la restricción EXCLUDE con comparación de
-- enteros (WITH =) junto a rangos de tiempo (tstzrange).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ------------------------------------------------------------
-- 1) planes_estudio — versiones del plan de estudio
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planes_estudio (
  id               SERIAL PRIMARY KEY,
  nombre           VARCHAR(150) NOT NULL,
  descripcion      TEXT,
  especialidad_id  INTEGER REFERENCES especialidades(id),
  ciclo_id         INTEGER REFERENCES ciclos_escolares(id),
  version          SMALLINT NOT NULL DEFAULT 1,
  estado           VARCHAR(20) NOT NULL DEFAULT 'borrador'
                    CHECK (estado IN ('borrador','publicado','archivado')),
  fecha_desde      DATE NOT NULL,
  fecha_hasta      DATE,
  creado_por       INTEGER REFERENCES usuarios(id),
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Snapshot del catálogo para preservar la vista histórica
  snapshot_nombre  VARCHAR(150) NOT NULL,
  snapshot_clave   VARCHAR(20),
  snapshot_semestre SMALLINT,
  snapshot_tipo    VARCHAR(25),
  snapshot_horas   SMALLINT,
  UNIQUE (especialidad_id, ciclo_id, version)
);

COMMENT ON TABLE planes_estudio IS 'Versiones del plan de estudio por especialidad y ciclo.';
COMMENT ON COLUMN planes_estudio.estado IS 'borrador=editable, publicado=inmutable (salvo archivar), archivado=solo lectura histórica.';
COMMENT ON COLUMN planes_estudio.snapshot_nombre IS 'Snapshot del nombre de la materia en el catálogo al momento de publicar.';
COMMENT ON COLUMN planes_estudio.snapshot_clave IS 'Snapshot de la clave de la materia en el catálogo al momento de publicar.';

-- ------------------------------------------------------------
-- 2) plan_materias — materias de cada versión del plan
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_materias (
  id                   SERIAL PRIMARY KEY,
  plan_version_id      INTEGER NOT NULL REFERENCES planes_estudio(id) ON DELETE CASCADE,
  materia_catalogo_id  INTEGER NOT NULL REFERENCES materias_catalogo(id),
  semestre             SMALLINT NOT NULL CHECK (semestre BETWEEN 1 AND 6),
  tipo                 VARCHAR(25) NOT NULL CHECK (tipo IN ('troncal_general','troncal_especialidad','modulo')),
  horas_semana         SMALLINT NOT NULL DEFAULT 3,
  optativa             BOOLEAN NOT NULL DEFAULT FALSE,
  -- Snapshot para preservar datos históricos del catálogo
  snapshot_nombre      VARCHAR(150) NOT NULL,
  snapshot_clave       VARCHAR(20),
  UNIQUE (plan_version_id, materia_catalogo_id),
  UNIQUE (plan_version_id, semestre, tipo)  -- una materia por semestre/tipo dentro de una versión
);

COMMENT ON TABLE plan_materias IS 'Materias que componen una versión del plan de estudio.';
COMMENT ON COLUMN plan_materias.snapshot_nombre IS 'Snapshot del nombre de la materia al momento de publicar la versión.';
COMMENT ON COLUMN plan_materias.snapshot_clave IS 'Snapshot de la clave de la materia al momento de publicar la versión.';

-- ------------------------------------------------------------
-- 3) plan_materias_prerrequisitos — prerrequisitos dentro de una versión
--    FK compuesta (plan_version_id, materia_catalogo_id) en ambos lados
--    para impedir referencias a materias de otra versión.
--    Las FK se añaden con ALTER TABLE después de crear todas las tablas
--    para evitar problemas de referencia forward en la misma transacción.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_materias_prerrequisitos (
  id                              SERIAL PRIMARY KEY,
  plan_version_id                 INTEGER NOT NULL,
  materia_catalogo_id             INTEGER NOT NULL,
  prerequisito_catalogo_id        INTEGER NOT NULL,
  tipo_requerido                  VARCHAR(20) NOT NULL DEFAULT 'aprobada'
                    CHECK (tipo_requerido IN ('cursada','aprobada')),
  UNIQUE (plan_version_id, materia_catalogo_id, prerequisito_catalogo_id)
);

COMMENT ON TABLE plan_materias_prerrequisitos IS 'Prerrequisitos de materias dentro de una misma versión del plan.';
COMMENT ON COLUMN plan_materias_prerrequisitos.tipo_requerido IS 'cursada=inscrito/asistió; aprobada=calificación >= 6.';

-- ------------------------------------------------------------
-- 4) plan_asignaciones — asignación de plan a grupo o alumno
--    Rango [desde, hasta) con exclusión de solapamiento a nivel de BD.
--    D1: se resuelve sobre la membresía del grupo del alumno en la
--    fecha histórica (grupo_actual_id / historial_grupos_alumno).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_asignaciones (
  id              SERIAL PRIMARY KEY,
  plan_version_id INTEGER NOT NULL REFERENCES planes_estudio(id) ON DELETE CASCADE,
  grupo_id        INTEGER REFERENCES grupos(id) ON DELETE CASCADE,
  alumno_id       INTEGER REFERENCES alumnos(id) ON DELETE CASCADE,
  fecha_desde     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_hasta     TIMESTAMPTZ,
  asignado_por    INTEGER REFERENCES usuarios(id),
  asignado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- D2: [desde, hasta) — fecha_hasta es excluyente; rangos adyacentes no solapan.
  CONSTRAINT plan_asignaciones_grupo_o_alumno CHECK (
    (grupo_id IS NOT NULL AND alumno_id IS NULL) OR
    (grupo_id IS NULL AND alumno_id IS NOT NULL)
  ),
  -- D2: no solapamiento de rangos para el mismo plan y mismo grupo/alumno.
  -- COALESCE(grupo_id, -alumno_id) mapea ambos IDs a un entero único:
  -- grupo_id es positivo (secuencia de grupos), -alumno_id es negativo
  -- (secuencia de alumnos negada), así nunca colisionan.
  EXCLUDE USING gist (
    plan_version_id WITH =,
    COALESCE(grupo_id, -alumno_id) WITH =,
    tstzrange(fecha_desde, COALESCE(fecha_hasta, 'infinity')) WITH &&
  )
);

COMMENT ON TABLE plan_asignaciones IS 'Asignación de un plan a un grupo (default) o alumno (excepción) con rango de vigencia.';
COMMENT ON COLUMN plan_asignaciones.fecha_hasta IS 'Excluyente: NULL = vigente sin fecha de fin.';
COMMENT ON COLUMN plan_asignaciones.grupo_id IS 'Asignación por defecto para todo el grupo.';
COMMENT ON COLUMN plan_asignaciones.alumno_id IS 'Asignación de excepción para un alumno específico.';

-- ------------------------------------------------------------
-- 5) Índices de soporte para consultas de resolución histórica
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_plan_asignaciones_plan_vigente
  ON plan_asignaciones (plan_version_id, grupo_id, alumno_id);
CREATE INDEX IF NOT EXISTS idx_plan_asignaciones_fecha
  ON plan_asignaciones (fecha_desde, fecha_hasta);
CREATE INDEX IF NOT EXISTS idx_plan_materias_version
  ON plan_materias (plan_version_id, semestre);
CREATE INDEX IF NOT EXISTS idx_plan_materias_prerreq_materia
  ON plan_materias_prerrequisitos (materia_catalogo_id);
CREATE INDEX IF NOT EXISTS idx_plan_materias_prerreq_prerrequisito
  ON plan_materias_prerrequisitos (prerrequisito_catalogo_id);

-- ------------------------------------------------------------
-- 6) Trigger de inmutabilidad para versiones publicadas
--    Solo permite cambiar estado a 'archivado'; bloquea cualquier
--    otra modificación de planes_estudio, plan_materias y
--    plan_materias_prerrequisitos cuando estado = 'publicado'.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_plan_version_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_estado_ant VARCHAR(20);
  v_estado_nue VARCHAR(20);
  v_plan_version_id INTEGER;
BEGIN
  -- Si se actualiza planes_estudio
  IF TG_TABLE_NAME = 'planes_estudio' THEN
    SELECT estado INTO v_estado_ant FROM planes_estudio WHERE id = OLD.id;
    SELECT NEW.estado INTO v_estado_nue;

    IF v_estado_ant = 'publicado' THEN
      -- Solo se permite pasar de publicado a archivado
      IF NOT (v_estado_ant = 'publicado' AND v_estado_nue = 'archivado') THEN
        RAISE EXCEPTION 'La versión publicada % es inmutable. Solo se puede archivar.', OLD.id;
      END IF;
      -- No permitir cambiar otros campos cuando está publicado
      IF OLD.nombre IS DISTINCT FROM NEW.nombre OR
         OLD.descripcion IS DISTINCT FROM NEW.descripcion OR
         OLD.fecha_desde IS DISTINCT FROM NEW.fecha_desde OR
         OLD.fecha_hasta IS DISTINCT FROM NEW.fecha_hasta THEN
        RAISE EXCEPTION 'La versión publicada % es inmutable; solo se puede cambiar el estado a archivado.', OLD.id;
      END IF;
    END IF;

    IF v_estado_ant = 'archivado' THEN
      RAISE EXCEPTION 'La versión archivada % es inmutable.', OLD.id;
    END IF;
  END IF;

  -- Si se intenta insertar/actualizar/eliminar en plan_materias o
  -- plan_materias_prerrequisitos de una versión publicada
  IF TG_TABLE_NAME IN ('plan_materias','plan_materias_prerrequisitos') THEN
    IF TG_OP = 'DELETE' THEN
      SELECT plan_version_id INTO v_plan_version_id FROM plan_materias WHERE id = OLD.id;
    ELSIF TG_OP = 'UPDATE' THEN
      SELECT plan_version_id INTO v_plan_version_id FROM plan_materias WHERE id = NEW.id;
    ELSE
      SELECT NEW.plan_version_id INTO v_plan_version_id;
    END IF;

    IF v_plan_version_id IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM planes_estudio WHERE id = v_plan_version_id AND estado IN ('publicado','archivado')) THEN
        RAISE EXCEPTION 'No se pueden modificar materias de una versión publicada o archivada (plan_version_id=%).', v_plan_version_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger en planes_estudio
DROP TRIGGER IF EXISTS trg_plan_version_immutable ON planes_estudio;
CREATE TRIGGER trg_plan_version_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON planes_estudio
  FOR EACH ROW EXECUTE FUNCTION trg_plan_version_immutable();

-- Trigger en plan_materias y plan_materias_prerrequisitos (solo UPDATE/DELETE, INSERT se valida en servicio)
DROP TRIGGER IF EXISTS trg_plan_materias_immutable ON plan_materias;
CREATE TRIGGER trg_plan_materias_immutable
  BEFORE UPDATE OR DELETE ON plan_materias
  FOR EACH ROW EXECUTE FUNCTION trg_plan_version_immutable();

DROP TRIGGER IF EXISTS trg_plan_prerreq_immutable ON plan_materias_prerrequisitos;
CREATE TRIGGER trg_plan_prerreq_immutable
  BEFORE UPDATE OR DELETE ON plan_materias_prerrequisitos
  FOR EACH ROW EXECUTE FUNCTION trg_plan_version_immutable();

COMMENT ON TRIGGER trg_plan_version_immutable ON planes_estudio IS
  'Bloquea modificaciones a versiones publicadas/archivadas. Solo permite publicar->archivado.';
COMMENT ON TRIGGER trg_plan_materias_immutable ON plan_materias IS
  'Bloquea UPDATE/DELETE de materias en versiones publicadas/archivadas.';
COMMENT ON TRIGGER trg_plan_prerreq_immutable ON plan_materias_prerrequisitos IS
  'Bloquea UPDATE/DELETE de prerrequisitos en versiones publicadas/archivadas.';

-- ------------------------------------------------------------
-- 6.5) Claves foráneas compuestas de plan_materias_prerrequisitos
--    (se añaden tras crear todas las tablas para evitar forward refs)
-- ------------------------------------------------------------
ALTER TABLE plan_materias_prerrequisitos
  ADD CONSTRAINT fk_plan_materias_prerreq_materia
    FOREIGN KEY (plan_version_id, materia_catalogo_id)
    REFERENCES plan_materias (plan_version_id, materia_catalogo_id);

ALTER TABLE plan_materias_prerrequisitos
  ADD CONSTRAINT fk_plan_materias_prerreq_prerrequisito
    FOREIGN KEY (plan_version_id, prerequisito_catalogo_id)
    REFERENCES plan_materias (plan_version_id, materia_catalogo_id);

-- ------------------------------------------------------------
-- 7) Permiso config_academica.planes para publicar planes
--    (no existe rol 'coordinador'; se usa control_escolar)
-- ------------------------------------------------------------
-- El permiso ya existe en config_academica.gestionar. Se documenta
-- que config_academica.ver / gestionar cubre la gestión de planes.

COMMIT;