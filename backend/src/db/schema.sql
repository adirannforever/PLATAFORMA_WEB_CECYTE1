
CREATE TABLE IF NOT EXISTS turnos (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(20) NOT NULL UNIQUE,  
  hora_inicio TIME NOT NULL,           
  hora_fin    TIME NOT NULL            
);

CREATE TABLE IF NOT EXISTS especialidades (
  id          SERIAL PRIMARY KEY,
  clave       VARCHAR(10)  NOT NULL UNIQUE, 
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS ciclos_escolares (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(30) NOT NULL UNIQUE, 
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE NOT NULL,
  activo       BOOLEAN DEFAULT FALSE,       
  CONSTRAINT un_ciclo_activo UNIQUE (activo) 
);


CREATE TABLE IF NOT EXISTS edificios (
  id     SERIAL PRIMARY KEY,
  clave  VARCHAR(10)  NOT NULL UNIQUE, 
  nombre VARCHAR(80)  NOT NULL,
  tipo   VARCHAR(30)  NOT NULL         
);


CREATE TABLE IF NOT EXISTS aulas (
  id          SERIAL PRIMARY KEY,
  edificio_id INTEGER NOT NULL REFERENCES edificios(id),
  nombre      VARCHAR(40) NOT NULL,   
  tipo        VARCHAR(30) NOT NULL,   
  capacidad   SMALLINT,
  activa      BOOLEAN DEFAULT TRUE,
  UNIQUE(edificio_id, nombre)
);



CREATE TABLE IF NOT EXISTS periodos_dia (
  id          SERIAL PRIMARY KEY,
  turno_id    INTEGER NOT NULL REFERENCES turnos(id),
  numero      SMALLINT NOT NULL,   
  hora_inicio TIME NOT NULL,
  hora_fin    TIME NOT NULL,
  UNIQUE(turno_id, numero)
);



CREATE TABLE IF NOT EXISTS catalogo_documentos (
  id          SERIAL PRIMARY KEY,
  clave       VARCHAR(30)  NOT NULL UNIQUE,
  nombre      VARCHAR(150) NOT NULL,
  descripcion TEXT,
  etapa       VARCHAR(20)  NOT NULL CHECK (etapa IN ('preinscripcion','inscripcion','reinscripcion')),
  obligatorio BOOLEAN DEFAULT TRUE,
  precio      NUMERIC(8,2) DEFAULT 0.00  
);


CREATE TABLE IF NOT EXISTS conceptos_pago (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL,
  descripcion TEXT,
  precio      NUMERIC(8,2) NOT NULL,
  activo      BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS usuarios (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  apellidos       VARCHAR(150) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  rol             VARCHAR(20)  NOT NULL CHECK (rol IN ('alumno','docente','administrador')),
  telefono        VARCHAR(20),
  activo          BOOLEAN DEFAULT TRUE,
  fecha_registro  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materias_catalogo (
  id               SERIAL PRIMARY KEY,
  nombre           VARCHAR(150) NOT NULL,
  clave            VARCHAR(20)  UNIQUE,
  semestre         SMALLINT NOT NULL CHECK (semestre BETWEEN 1 AND 6),
  tipo             VARCHAR(25)  NOT NULL CHECK (tipo IN (
                     'troncal_general',   
                     'troncal_especialidad', 
                     'modulo'             
                   )),
  especialidad_id  INTEGER REFERENCES especialidades(id), 
  modulo_numero    SMALLINT CHECK (modulo_numero BETWEEN 1 AND 5),
  submodulo_numero SMALLINT CHECK (submodulo_numero BETWEEN 1 AND 2),
  horas_semana     SMALLINT DEFAULT 3,
  activa           BOOLEAN DEFAULT TRUE
);



CREATE TABLE IF NOT EXISTS grupos (
  id               SERIAL PRIMARY KEY,
  ciclo_id         INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  especialidad_id  INTEGER NOT NULL REFERENCES especialidades(id),
  turno_id         INTEGER NOT NULL REFERENCES turnos(id),
  semestre         SMALLINT NOT NULL CHECK (semestre BETWEEN 1 AND 6),
  letra            CHAR(1)  NOT NULL CHECK (letra IN ('A','B','C','D')),
  nombre           VARCHAR(60) GENERATED ALWAYS AS (
                     semestre::text || '°' || letra || ' ' ||
                     CASE WHEN turno_id = 1 THEN 'Matutino' ELSE 'Vespertino' END
                   ) STORED,
  tutor_id         INTEGER REFERENCES usuarios(id),  
  activo           BOOLEAN DEFAULT TRUE,
  UNIQUE(ciclo_id, semestre, letra, turno_id)
);

CREATE TABLE IF NOT EXISTS materias_grupo (
  id                  SERIAL PRIMARY KEY,
  grupo_id            INTEGER NOT NULL REFERENCES grupos(id),
  materia_catalogo_id INTEGER NOT NULL REFERENCES materias_catalogo(id),
  docente_id          INTEGER NOT NULL REFERENCES usuarios(id),
  ciclo_id            INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  activa              BOOLEAN DEFAULT TRUE,
  UNIQUE(grupo_id, materia_catalogo_id, ciclo_id)
);

CREATE TABLE IF NOT EXISTS alumnos (
  id                SERIAL PRIMARY KEY,
  usuario_id        INTEGER NOT NULL UNIQUE REFERENCES usuarios(id),
  matricula         VARCHAR(30) NOT NULL UNIQUE,
  curp              VARCHAR(18) UNIQUE,
  fecha_nacimiento  DATE,
  genero            CHAR(1) CHECK (genero IN ('M','F','O')),
  direccion         TEXT,
  telefono_tutor    VARCHAR(20),
  nombre_tutor      VARCHAR(200),
  curp_tutor        VARCHAR(18),
  especialidad_id   INTEGER REFERENCES especialidades(id),
  grupo_actual_id   INTEGER REFERENCES grupos(id),
  semestre_actual   SMALLINT CHECK (semestre_actual BETWEEN 1 AND 6),
  estatus           VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estatus IN (
                      'activo','baja_temporal','baja_definitiva','egresado','irregular'
                    )),
  
  candidato_constancia BOOLEAN DEFAULT FALSE,
  fecha_ingreso     DATE,
  generacion        VARCHAR(10)  
);

CREATE TABLE IF NOT EXISTS historial_grupos_alumno (
  id          SERIAL PRIMARY KEY,
  alumno_id   INTEGER NOT NULL REFERENCES alumnos(id),
  grupo_id    INTEGER NOT NULL REFERENCES grupos(id),
  ciclo_id    INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  semestre    SMALLINT NOT NULL,
  fecha_asignacion DATE DEFAULT CURRENT_DATE,
  activo      BOOLEAN DEFAULT TRUE,
  UNIQUE(alumno_id, ciclo_id, semestre)
);

CREATE TABLE IF NOT EXISTS expediente_documentos (
  id                    SERIAL PRIMARY KEY,
  alumno_id             INTEGER NOT NULL REFERENCES alumnos(id),
  documento_id          INTEGER NOT NULL REFERENCES catalogo_documentos(id),
  entregado             BOOLEAN DEFAULT FALSE,
  fecha_entrega         DATE,
  recibido_por          INTEGER REFERENCES usuarios(id), 
  observaciones         TEXT,
  UNIQUE(alumno_id, documento_id)
);

CREATE TABLE IF NOT EXISTS pagos_alumno (
  id              SERIAL PRIMARY KEY,
  alumno_id       INTEGER NOT NULL REFERENCES alumnos(id),
  concepto_id     INTEGER NOT NULL REFERENCES conceptos_pago(id),
  ciclo_id        INTEGER REFERENCES ciclos_escolares(id),
  monto           NUMERIC(8,2) NOT NULL,
  fecha_pago      DATE NOT NULL DEFAULT CURRENT_DATE,
  folio_recibo    VARCHAR(50),
  registrado_por  INTEGER NOT NULL REFERENCES usuarios(id),
  observaciones   TEXT
);

CREATE TABLE IF NOT EXISTS cambios_grupo (
  id              SERIAL PRIMARY KEY,
  alumno_id       INTEGER NOT NULL REFERENCES alumnos(id),
  grupo_origen_id INTEGER NOT NULL REFERENCES grupos(id),
  grupo_destino_id INTEGER NOT NULL REFERENCES grupos(id),
  ciclo_id        INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  fecha_cambio    DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo          TEXT,
  autorizado_por  INTEGER NOT NULL REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS calificaciones (
  id                SERIAL PRIMARY KEY,
  alumno_id         INTEGER NOT NULL REFERENCES alumnos(id),
  materia_grupo_id  INTEGER NOT NULL REFERENCES materias_grupo(id),
  ciclo_id          INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  parcial           SMALLINT NOT NULL CHECK (parcial BETWEEN 1 AND 3),
  calificacion      NUMERIC(4,1) NOT NULL CHECK (calificacion BETWEEN 0 AND 10),
  tipo_evaluacion   VARCHAR(20) NOT NULL DEFAULT 'ordinaria' CHECK (tipo_evaluacion IN (
                      'ordinaria',      
                      'extraordinario', 
                      'recuperacion'    
                    )),
  
  calificacion_ordinaria_previa NUMERIC(4,1),
  fecha_registro    TIMESTAMPTZ DEFAULT NOW(),
  registrado_por    INTEGER NOT NULL REFERENCES usuarios(id),
  UNIQUE(alumno_id, materia_grupo_id, ciclo_id, parcial)
);


CREATE TABLE IF NOT EXISTS auditoria_calificaciones (
  id                SERIAL PRIMARY KEY,
  calificacion_id   INTEGER NOT NULL REFERENCES calificaciones(id),
  valor_anterior    NUMERIC(4,1),
  valor_nuevo       NUMERIC(4,1) NOT NULL,
  modificado_por    INTEGER NOT NULL REFERENCES usuarios(id),
  fecha_cambio      TIMESTAMPTZ DEFAULT NOW(),
  motivo            TEXT
);


CREATE TABLE IF NOT EXISTS constancias_excelencia (
  id            SERIAL PRIMARY KEY,
  alumno_id     INTEGER NOT NULL REFERENCES alumnos(id),
  ciclo_id      INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  semestre      SMALLINT NOT NULL,
  promedio      NUMERIC(4,2) NOT NULL,
  emitida       BOOLEAN DEFAULT FALSE,   
  fecha_emision DATE,
  generada_por  INTEGER REFERENCES usuarios(id),
  UNIQUE(alumno_id, ciclo_id, semestre)
);

CREATE TABLE IF NOT EXISTS asistencia_diaria (
  id            SERIAL PRIMARY KEY,
  alumno_id     INTEGER NOT NULL REFERENCES alumnos(id),
  fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
  llego         BOOLEAN NOT NULL DEFAULT FALSE,
  justificada   BOOLEAN DEFAULT FALSE,
  motivo_justificacion TEXT,
  registrado_por INTEGER NOT NULL REFERENCES usuarios(id),
  UNIQUE(alumno_id, fecha)
);

CREATE TABLE IF NOT EXISTS asistencia_clase (
  id                SERIAL PRIMARY KEY,
  alumno_id         INTEGER NOT NULL REFERENCES alumnos(id),
  materia_grupo_id  INTEGER NOT NULL REFERENCES materias_grupo(id),
  fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
  periodo_numero    SMALLINT NOT NULL CHECK (periodo_numero BETWEEN 1 AND 7),
  estado            VARCHAR(15) NOT NULL DEFAULT 'ausente' CHECK (estado IN (
                      'presente',
                      'ausente',
                      'justificado',
                      'tardanza'
                    )),
  justificacion     TEXT,   
  registrado_por    INTEGER NOT NULL REFERENCES usuarios(id),
  fecha_registro    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alumno_id, materia_grupo_id, fecha, periodo_numero)
);

CREATE TABLE IF NOT EXISTS horarios (
  id                SERIAL PRIMARY KEY,
  materia_grupo_id  INTEGER NOT NULL REFERENCES materias_grupo(id),
  aula_id           INTEGER REFERENCES aulas(id),
  dia_semana        SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 5), 
  periodo_id        INTEGER NOT NULL REFERENCES periodos_dia(id),
  ciclo_id          INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  UNIQUE(aula_id, dia_semana, periodo_id, ciclo_id),          
  UNIQUE(materia_grupo_id, dia_semana, periodo_id, ciclo_id)  
);

CREATE TABLE IF NOT EXISTS tutorias (
  id           SERIAL PRIMARY KEY,
  tutor_id     INTEGER NOT NULL REFERENCES usuarios(id),
  grupo_id     INTEGER NOT NULL REFERENCES grupos(id),
  ciclo_id     INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  fecha        DATE NOT NULL,
  tema         VARCHAR(200),
  observaciones TEXT,
  fecha_registro TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS incidencias (
  id             SERIAL PRIMARY KEY,
  alumno_id      INTEGER NOT NULL REFERENCES alumnos(id),
  ciclo_id       INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  tipo           VARCHAR(30) NOT NULL CHECK (tipo IN (
                   'conducta',
                   'academica',
                   'asistencia',
                   'citatorio_tutor',
                   'felicitacion',
                   'otro'
                 )),
  descripcion    TEXT NOT NULL,
  registrado_por INTEGER NOT NULL REFERENCES usuarios(id),
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  resuelta       BOOLEAN DEFAULT FALSE,
  resolucion     TEXT
);

CREATE TABLE IF NOT EXISTS comunicados (
  id                SERIAL PRIMARY KEY,
  titulo            VARCHAR(255) NOT NULL,
  contenido         TEXT NOT NULL,
  autor_id          INTEGER NOT NULL REFERENCES usuarios(id),
  fecha_publicacion TIMESTAMPTZ DEFAULT NOW(),
  activo            BOOLEAN DEFAULT TRUE,
  
  dirigido_a_rol    VARCHAR(20) CHECK (dirigido_a_rol IN ('alumno','docente','administrador')),
  dirigido_a_grupo  INTEGER REFERENCES grupos(id)  
);

-- =========================================================================
-- 1. TABLA DE ASPIRANTES (Proceso de Admisión / Preinscripción)
-- =========================================================================
CREATE TABLE IF NOT EXISTS aspirantes (
  id                  SERIAL PRIMARY KEY,
  folio               VARCHAR(30) NOT NULL UNIQUE,
  nombre              VARCHAR(100) NOT NULL,
  apellidos           VARCHAR(150) NOT NULL,
  curp                VARCHAR(18) NOT NULL UNIQUE,
  email               VARCHAR(255) NOT NULL UNIQUE,
  telefono            VARCHAR(20),
  especialidad_id     INTEGER NOT NULL REFERENCES especialidades(id),
  turno_preferido_id  INTEGER NOT NULL REFERENCES turnos(id),
  ciclo_id            INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  estatus             VARCHAR(30) NOT NULL DEFAULT 'registrado' CHECK (estatus IN (
                        'registrado', 
                        'documentos_pendientes', 
                        'ficha_pagada', 
                        'examen_aprobado', 
                        'aceptado', 
                        'rechazado', 
                        'inscrito'
                      )),
  fecha_registro      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aspirantes_curp ON aspirantes(curp);
CREATE INDEX IF NOT EXISTS idx_aspirantes_ciclo ON aspirantes(ciclo_id);


-- =========================================================================
-- 2. VALIDACIÓN DE CRUCE DE HORARIOS PARA DOCENTES (Trigger)
-- =========================================================================
-- Evita que un profesor sea asignado a dos clases diferentes en el mismo día y periodo.
CREATE OR REPLACE FUNCTION verificar_conflicto_horario_docente()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verificar_horario_docente ON horarios;
CREATE TRIGGER trg_verificar_horario_docente
BEFORE INSERT OR UPDATE ON horarios
FOR EACH ROW
EXECUTE FUNCTION verificar_conflicto_horario_docente();


-- =========================================================================
-- 3. VISTA DE PROMEDIOS POR ALUMNO Y CICLO (Para Boletas y Constancias)
-- =========================================================================
CREATE OR REPLACE VIEW v_promedios_periodo AS
SELECT 
  c.alumno_id,
  c.ciclo_id,
  c.parcial,
  ROUND(AVG(c.calificacion), 2) AS promedio_parcial
FROM calificaciones c
WHERE c.tipo_evaluacion = 'ordinaria'
GROUP BY c.alumno_id, c.ciclo_id, c.parcial;

CREATE TABLE IF NOT EXISTS servicio_social_practicas (
    id SERIAL PRIMARY KEY,
    alumno_id INTEGER NOT NULL REFERENCES alumnos(id),
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('servicio_social', 'practicas_profesionales')),
    institucion_empresa VARCHAR(150) NOT NULL,
    asesor_externo VARCHAR(150),
    horas_acumuladas SMALLINT DEFAULT 0 CHECK (horas_acumuladas >= 0),
    estatus VARCHAR(30) NOT NULL DEFAULT 'en_proceso' CHECK (estatus IN ('en_proceso', 'liberado', 'reprobado')),
    fecha_inicio DATE,
    fecha_fin DATE,
    observaciones TEXT,
    registrado_por INTEGER REFERENCES usuarios(id),
    fecha_registro TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(alumno_id, tipo)
);

CREATE TABLE IF NOT EXISTS becas_alumnos (
    id SERIAL PRIMARY KEY,
    alumno_id INTEGER NOT NULL REFERENCES alumnos(id),
    ciclo_id INTEGER NOT NULL REFERENCES ciclos_escolares(id),
    nombre_beca VARCHAR(100) NOT NULL,
    monto NUMERIC(8,2) DEFAULT 0.00,
    estatus VARCHAR(30) NOT NULL DEFAULT 'activo' CHECK (estatus IN ('activo', 'suspendido', 'concluido')),
    fecha_asignacion DATE DEFAULT CURRENT_DATE,
    observaciones TEXT,
    UNIQUE(alumno_id, ciclo_id, nombre_beca)
);

CREATE TABLE IF NOT EXISTS titulacion (
    id SERIAL PRIMARY KEY,
    alumno_id INTEGER NOT NULL UNIQUE REFERENCES alumnos(id),
    opcion_titulacion VARCHAR(100) NOT NULL,
    estatus VARCHAR(30) NOT NULL DEFAULT 'en_proceso' CHECK (estatus IN ('en_proceso', 'tramite', 'titulado')),
    fecha_examen DATE,
    numero_titulo VARCHAR(50) UNIQUE,
    cedula_profesional VARCHAR(50) UNIQUE,
    observaciones TEXT,
    autorizado_por INTEGER REFERENCES usuarios(id),
    fecha_registro TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS periodos_evaluacion (
  id SERIAL PRIMARY KEY,
  ciclo_id INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  parcial INTEGER NOT NULL CHECK (parcial IN (1,2,3)),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  UNIQUE(ciclo_id, parcial)
);

-- Tabla de períodos escolares
CREATE TABLE IF NOT EXISTS periodos_escolares (
  id SERIAL PRIMARY KEY,
  ciclo_id INTEGER NOT NULL REFERENCES ciclos_escolares(id) ON DELETE CASCADE,
  semestre SMALLINT CHECK (semestre BETWEEN 1 AND 6),
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN (
    'preinscripcion',
    'inscripcion_nuevo_ingreso',
    'reinscripcion',
    'inicio_semestre',
    'fin_semestre',
    'evaluaciones_parciales',
    'evaluacion_recuperacion',
    'evaluacion_extraordinaria',
    'curso_intersemestral'
  )),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  UNIQUE(ciclo_id, semestre, tipo)
);

-- Función para generar períodos automáticamente al crear un ciclo
CREATE OR REPLACE FUNCTION generar_periodos_ciclo()
RETURNS TRIGGER AS $$
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
    
    -- Insertar períodos para este semestre
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
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS auditoria_inscripciones (
  id SERIAL PRIMARY KEY,
  alumno_id INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('inscripcion_nuevo_ingreso', 'reinscripcion', 'baja')),
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  observaciones TEXT
);

-- Configuración global del sistema de horarios
CREATE TABLE configuracion_horarios (
  id SERIAL PRIMARY KEY,
  duracion_bloque_minutos INTEGER NOT NULL DEFAULT 50, -- 50 min por defecto
  hora_inicio_turno TIME NOT NULL DEFAULT '07:00',
  hora_fin_turno TIME NOT NULL DEFAULT '13:00',
  receso_inicio TIME NOT NULL DEFAULT '09:30',
  receso_fin TIME NOT NULL DEFAULT '10:00',
  receso_bloqueado BOOLEAN DEFAULT FALSE,
  dias_semana TEXT[] DEFAULT ARRAY['Lunes','Martes','Miércoles','Jueves','Viernes']
);

-- Grupos (ya existe, pero agregamos campos para horario)
ALTER TABLE grupos ADD COLUMN horario_config JSONB; -- Configuración específica del grupo (opcional)

-- Asignación de asignaturas a grupos (ya existe: materias_grupo)
-- Pero necesitamos que cada materia_grupo tenga un maestro y horas_semanales
-- Ya tienes docente_id en materias_grupo, y materias_catalogo tiene horas_semana

-- Horario de grupos (bloques)
CREATE TABLE horario_grupos (
  id SERIAL PRIMARY KEY,
  grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  materia_grupo_id INTEGER NOT NULL REFERENCES materias_grupo(id) ON DELETE CASCADE,
  dia_semana TEXT NOT NULL CHECK (dia_semana IN ('Lunes','Martes','Miércoles','Jueves','Viernes')),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  -- Campos de control
  creado_por INTEGER REFERENCES usuarios(id),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

-- Horario de maestros (se genera automáticamente, pero se guarda para evitar recalcular siempre)
CREATE TABLE horario_maestros (
  id SERIAL PRIMARY KEY,
  docente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  materia_grupo_id INTEGER NOT NULL REFERENCES materias_grupo(id) ON DELETE CASCADE,
  dia_semana TEXT NOT NULL CHECK (dia_semana IN ('Lunes','Martes','Miércoles','Jueves','Viernes')),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  es_automatico BOOLEAN DEFAULT TRUE, -- TRUE si viene de grupos, FALSE si se editó manualmente
  creado_por INTEGER REFERENCES usuarios(id),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

-- Horario de laboratorios (similar a maestros)
CREATE TABLE horario_laboratorios (
  id SERIAL PRIMARY KEY,
  laboratorio_id INTEGER NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
  materia_grupo_id INTEGER NOT NULL REFERENCES materias_grupo(id) ON DELETE CASCADE,
  dia_semana TEXT NOT NULL CHECK (dia_semana IN ('Lunes','Martes','Miércoles','Jueves','Viernes')),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  es_automatico BOOLEAN DEFAULT TRUE,
  creado_por INTEGER REFERENCES usuarios(id),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MIGRACIÓN PARA BECAS (CORREGIDA - SIN ON CONFLICT PROBLEMÁTICO)
-- ============================================================

-- 1. Eliminar la restricción NOT NULL de alumno_id (permitir NULL para definiciones de becas)
ALTER TABLE becas_alumnos ALTER COLUMN alumno_id DROP NOT NULL;

-- 2. Agregar nuevas columnas (si no existen)
ALTER TABLE becas_alumnos 
ADD COLUMN IF NOT EXISTS descripcion TEXT,
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS estatus_pago VARCHAR(20) DEFAULT 'cursando' 
  CHECK (estatus_pago IN ('cursando', 'proceso_deposito', 'depositado'));

-- 3. Renombrar observaciones a comentarios_alumno (si existe y no se ha renombrado)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='becas_alumnos' AND column_name='observaciones') THEN
    ALTER TABLE becas_alumnos RENAME COLUMN observaciones TO comentarios_alumno;
  END IF;
END $$;

-- 4. Agregar periodicidad si no existe
ALTER TABLE becas_alumnos 
ADD COLUMN IF NOT EXISTS periodicidad VARCHAR(20) DEFAULT 'semestral' 
CHECK (periodicidad IN ('mensual', 'trimestral', 'semestral', 'anual'));

-- 5. Actualizar registros existentes con estatus_pago (para asignaciones que ya tienen alumno_id)
UPDATE becas_alumnos SET estatus_pago = 'cursando' 
WHERE alumno_id IS NOT NULL AND estatus_pago IS NULL;

-- 6. Insertar una beca de prueba (sin alumno) solo si no existe
-- Usamos un enfoque con subconsulta para evitar el ON CONFLICT problemático
INSERT INTO becas_alumnos (nombre_beca, descripcion, monto, periodicidad, ciclo_id, activo)
SELECT 'Beca de Excelencia', 'Beca para alumnos con promedio sobresaliente', 500.00, 'semestral', id, TRUE
FROM ciclos_escolares 
WHERE activo = TRUE 
  AND NOT EXISTS (
    SELECT 1 FROM becas_alumnos 
    WHERE nombre_beca = 'Beca de Excelencia' 
      AND ciclo_id = ciclos_escolares.id 
      AND alumno_id IS NULL
  );


-- ============================================================
-- MIGRACIÓN PARA BECAS (CORREGIDA - SIN ON CONFLICT)
-- ============================================================

-- 1. Eliminar la restricción NOT NULL de alumno_id (permitir NULL para definiciones de becas)
ALTER TABLE becas_alumnos ALTER COLUMN alumno_id DROP NOT NULL;

-- 2. Agregar nuevas columnas (si no existen)
ALTER TABLE becas_alumnos 
ADD COLUMN IF NOT EXISTS descripcion TEXT,
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS estatus_pago VARCHAR(20) DEFAULT 'cursando' 
  CHECK (estatus_pago IN ('cursando', 'proceso_deposito', 'depositado'));

-- 3. Renombrar observaciones a comentarios_alumno (si existe y no se ha renombrado)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='becas_alumnos' AND column_name='observaciones') THEN
    ALTER TABLE becas_alumnos RENAME COLUMN observaciones TO comentarios_alumno;
  END IF;
END $$;

-- 4. Agregar periodicidad si no existe
ALTER TABLE becas_alumnos 
ADD COLUMN IF NOT EXISTS periodicidad VARCHAR(20) DEFAULT 'semestral' 
CHECK (periodicidad IN ('mensual', 'trimestral', 'semestral', 'anual'));

-- 5. Actualizar registros existentes con estatus_pago (para asignaciones que ya tienen alumno_id)
UPDATE becas_alumnos SET estatus_pago = 'cursando' 
WHERE alumno_id IS NOT NULL AND estatus_pago IS NULL;

-- 6. Insertar una beca de prueba (sin alumno) solo si no existe
INSERT INTO becas_alumnos (nombre_beca, descripcion, monto, periodicidad, ciclo_id, activo)
SELECT 'Beca de Excelencia', 'Beca para alumnos con promedio sobresaliente', 500.00, 'semestral', id, TRUE
FROM ciclos_escolares 
WHERE activo = TRUE 
  AND NOT EXISTS (
    SELECT 1 FROM becas_alumnos 
    WHERE nombre_beca = 'Beca de Excelencia' 
      AND ciclo_id = ciclos_escolares.id 
      AND alumno_id IS NULL
  );

CREATE TABLE IF NOT EXISTS auditoria_logs (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  accion VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
  tabla_afectada VARCHAR(50),
  registro_id INTEGER,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  ip VARCHAR(45),
  user_agent TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW()
);

--alteraciones

-- ============================================================
-- MIGRACIÓN PARA BECAS
-- ============================================================

-- 1. Agregar nuevas columnas
ALTER TABLE becas_alumnos 
ADD COLUMN IF NOT EXISTS descripcion TEXT,
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS estatus_pago VARCHAR(20) DEFAULT 'cursando' 
  CHECK (estatus_pago IN ('cursando', 'proceso_deposito', 'depositado'));

-- 2. Renombrar observaciones a comentarios_alumno (si existe)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='becas_alumnos' AND column_name='observaciones') THEN
    ALTER TABLE becas_alumnos RENAME COLUMN observaciones TO comentarios_alumno;
  END IF;
END $$;

-- 3. Actualizar registros existentes con estatus_pago
UPDATE becas_alumnos SET estatus_pago = 'cursando' 
WHERE alumno_id IS NOT NULL AND estatus_pago IS NULL;

-- 4. Crear una beca de prueba (sin alumno)
INSERT INTO becas_alumnos (nombre_beca, descripcion, monto, periodicidad, activo, ciclo_id)
SELECT 'Beca de Excelencia', 'Beca para alumnos con promedio sobresaliente', 500.00, 'semestral', TRUE, id
FROM ciclos_escolares WHERE activo = TRUE
ON CONFLICT DO NOTHING;

-- Agregar columnas de fechas para el período de la beca
ALTER TABLE becas_alumnos 
ADD COLUMN IF NOT EXISTS fecha_inicio DATE,
ADD COLUMN IF NOT EXISTS fecha_fin DATE;

-- Opcional: Actualizar registros existentes con valores por defecto
-- (puedes establecer la fecha de inicio como la fecha de asignación, y la fecha fin como un año después)
UPDATE becas_alumnos 
SET fecha_inicio = fecha_asignacion,
    fecha_fin = fecha_asignacion + INTERVAL '1 year'
WHERE fecha_inicio IS NULL AND alumno_id IS NOT NULL;
--fin de alteraciones

--alter becas

-- Agregar columnas de fechas para el período de la beca
ALTER TABLE becas_alumnos 
ADD COLUMN IF NOT EXISTS fecha_inicio DATE,
ADD COLUMN IF NOT EXISTS fecha_fin DATE;

-- Opcional: Actualizar registros existentes con valores por defecto
-- (puedes establecer la fecha de inicio como la fecha de asignación, y la fecha fin como un año después)
UPDATE becas_alumnos 
SET fecha_inicio = fecha_asignacion,
    fecha_fin = fecha_asignacion + INTERVAL '1 year'
WHERE fecha_inicio IS NULL AND alumno_id IS NOT NULL;

--
-- Tabla para reportes de servicio social / prácticas
CREATE TABLE IF NOT EXISTS servicio_social_reportes (
  id SERIAL PRIMARY KEY,
  servicio_social_id INTEGER NOT NULL REFERENCES servicio_social_practicas(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL CHECK (numero BETWEEN 1 AND 4),
  fecha_limite DATE,
  fecha_entrega DATE,
  entregado BOOLEAN DEFAULT FALSE,
  observaciones TEXT,
  UNIQUE(servicio_social_id, numero)
);

--
CREATE TABLE IF NOT EXISTS horario_archivos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  key VARCHAR(500) NOT NULL,
  subido_por INTEGER REFERENCES usuarios(id),
  fecha TIMESTAMPTZ DEFAULT NOW()
);


ALTER TABLE horario_archivos 
ADD COLUMN IF NOT EXISTS ciclo_id INTEGER REFERENCES ciclos_escolares(id),
ADD COLUMN IF NOT EXISTS semestre SMALLINT CHECK (semestre BETWEEN 1 AND 6),
ADD COLUMN IF NOT EXISTS letra CHAR(1) CHECK (letra IN ('A','B','C','D')),
ADD COLUMN IF NOT EXISTS especialidad_id INTEGER REFERENCES especialidades(id),
ADD COLUMN IF NOT EXISTS turno_id INTEGER REFERENCES turnos(id),
ADD COLUMN IF NOT EXISTS tipo_horario VARCHAR(20) NOT NULL DEFAULT 'alumnos' CHECK (tipo_horario IN ('alumnos', 'maestros', 'laboratorios')),
ADD COLUMN IF NOT EXISTS docente_id INTEGER REFERENCES usuarios(id),
ADD COLUMN IF NOT EXISTS laboratorio_id INTEGER REFERENCES aulas(id);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_horario_archivos_ciclo ON horario_archivos(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_horario_archivos_semestre ON horario_archivos(semestre);
CREATE INDEX IF NOT EXISTS idx_horario_archivos_tipo ON horario_archivos(tipo_horario);

ALTER TABLE horario_archivos 
ADD COLUMN IF NOT EXISTS tipo VARCHAR(100);

-- Agregar columnas faltantes
ALTER TABLE horario_archivos 
ADD COLUMN IF NOT EXISTS semestre SMALLINT,
ADD COLUMN IF NOT EXISTS ciclo_id INTEGER REFERENCES ciclos_escolares(id),
ADD COLUMN IF NOT EXISTS especialidad_id INTEGER REFERENCES especialidades(id),
ADD COLUMN IF NOT EXISTS turno_id INTEGER REFERENCES turnos(id),
ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'grupo' CHECK (tipo IN ('grupo', 'maestro', 'laboratorio')),
ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- Asegurar que grupo_id existe
ALTER TABLE horario_archivos 
ADD COLUMN IF NOT EXISTS grupo_id INTEGER REFERENCES grupos(id);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_horario_archivos_ciclo ON horario_archivos(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_horario_archivos_semestre ON horario_archivos(semestre);
CREATE INDEX IF NOT EXISTS idx_horario_archivos_grupo ON horario_archivos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_horario_archivos_tipo ON horario_archivos(tipo);
-- Actualizar registros existentes con un valor por defecto
UPDATE horario_archivos SET tipo = 'application/pdf' WHERE tipo IS NULL;
--
--
-- Eliminar la restricción existente si existe
ALTER TABLE horario_archivos DROP CONSTRAINT IF EXISTS horario_archivos_tipo_horario_check;

-- Asegurar que la columna existe
ALTER TABLE horario_archivos ADD COLUMN IF NOT EXISTS tipo_horario VARCHAR(20) DEFAULT 'grupo';

-- Agregar la restricción correcta
ALTER TABLE horario_archivos ADD CONSTRAINT horario_archivos_tipo_horario_check 
CHECK (tipo_horario IN ('grupo', 'maestro', 'laboratorio'));

-- Verificar que la columna 'tipo' (MIME) no esté causando conflicto
-- Si la columna 'tipo' existe y es VARCHAR, asegurar que no tenga CHECK restrictivo
-- Eliminar cualquier CHECK en la columna 'tipo' que pueda interferir
ALTER TABLE horario_archivos DROP CONSTRAINT IF EXISTS horario_archivos_tipo_check;

-- Actualizar registros existentes (si hay) para que tengan un valor válido
UPDATE horario_archivos SET tipo_horario = 'grupo' WHERE tipo_horario IS NULL;
--

--

--

INSERT INTO servicio_social_reportes (servicio_social_id, numero, fecha_limite)
SELECT 
  ss.id,
  num,
  NULL
FROM servicio_social_practicas ss
CROSS JOIN generate_series(1, CASE WHEN ss.tipo = 'servicio_social' THEN 3 ELSE 2 END) AS num
WHERE NOT EXISTS (
  SELECT 1 FROM servicio_social_reportes r WHERE r.servicio_social_id = ss.id
);

-- Agregar campos para cumplir con el reglamento
ALTER TABLE servicio_social_practicas 
ADD COLUMN IF NOT EXISTS tipo_institucion VARCHAR(30) CHECK (tipo_institucion IN ('gubernamental', 'publica', 'privada_convenio')),
ADD COLUMN IF NOT EXISTS tiene_convenio BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS autorizacion_tutor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS semestre_requerido SMALLINT CHECK (semestre_requerido BETWEEN 1 AND 6);

CREATE INDEX idx_ss_reportes_ss_id ON servicio_social_reportes(servicio_social_id);

--
-- Agregar columna periodicidad a becas_alumnos
ALTER TABLE becas_alumnos 
ADD COLUMN IF NOT EXISTS periodicidad VARCHAR(20) DEFAULT 'semestral' 
CHECK (periodicidad IN ('mensual', 'trimestral', 'semestral', 'anual'));

ALTER TABLE periodos_evaluacion 
ADD COLUMN tipo VARCHAR(20) DEFAULT 'parcial' 
CHECK (tipo IN ('parcial', 'recuperacion', 'extraordinario'));

-- Actualizar registros existentes (ya tienen tipo 'parcial' por defecto)
UPDATE periodos_evaluacion SET tipo = 'parcial' WHERE tipo IS NULL;

CREATE INDEX IF NOT EXISTS idx_auditoria_alumno ON auditoria_inscripciones(alumno_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria_inscripciones(fecha DESC);

-- Trigger que ejecuta la función después de insertar un ciclo
DROP TRIGGER IF EXISTS trigger_generar_periodos ON ciclos_escolares;
CREATE TRIGGER trigger_generar_periodos
AFTER INSERT ON ciclos_escolares
FOR EACH ROW
EXECUTE FUNCTION generar_periodos_ciclo();

ALTER TABLE incidencias 
ADD COLUMN subtipo VARCHAR(50);

-- Opcional: actualizar registros existentes
UPDATE incidencias SET subtipo = 'general' WHERE subtipo IS NULL;

-- Índice para búsquedas
CREATE INDEX idx_incidencias_subtipo ON incidencias(subtipo);

ALTER TABLE becas_alumnos 
ADD COLUMN IF NOT EXISTS fecha_inicio DATE,
ADD COLUMN IF NOT EXISTS fecha_fin DATE;

--
ALTER TABLE materias_grupo ALTER COLUMN docente_id DROP NOT NULL;
--

-- (Opcional) Si ya tienes ciclos existentes y quieres generar períodos para ellos, ejecuta:
-- SELECT generar_periodos_ciclo() FOR EACH ciclo; (necesitarías una función que itere)
CREATE INDEX IF NOT EXISTS idx_servicio_social_alumno ON servicio_social_practicas(alumno_id);
CREATE INDEX IF NOT EXISTS idx_becas_alumno ON becas_alumnos(alumno_id);
CREATE INDEX IF NOT EXISTS idx_becas_ciclo ON becas_alumnos(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_titulacion_alumno ON titulacion(alumno_id);

CREATE INDEX IF NOT EXISTS idx_alumnos_usuario      ON alumnos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_grupo        ON alumnos(grupo_actual_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_especialidad ON alumnos(especialidad_id);
CREATE INDEX IF NOT EXISTS idx_grupos_ciclo         ON grupos(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_grupos_tutor         ON grupos(tutor_id);
CREATE INDEX IF NOT EXISTS idx_mat_grupo_docente    ON materias_grupo(docente_id);
CREATE INDEX IF NOT EXISTS idx_mat_grupo_grupo      ON materias_grupo(grupo_id);
CREATE INDEX IF NOT EXISTS idx_mat_grupo_ciclo      ON materias_grupo(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_califs_alumno        ON calificaciones(alumno_id);
CREATE INDEX IF NOT EXISTS idx_califs_materia       ON calificaciones(materia_grupo_id);
CREATE INDEX IF NOT EXISTS idx_califs_ciclo         ON calificaciones(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_asist_diaria_alumno  ON asistencia_diaria(alumno_id);
CREATE INDEX IF NOT EXISTS idx_asist_diaria_fecha   ON asistencia_diaria(fecha);
CREATE INDEX IF NOT EXISTS idx_asist_clase_alumno   ON asistencia_clase(alumno_id);
CREATE INDEX IF NOT EXISTS idx_asist_clase_materia  ON asistencia_clase(materia_grupo_id);
CREATE INDEX IF NOT EXISTS idx_asist_clase_fecha    ON asistencia_clase(fecha);
CREATE INDEX IF NOT EXISTS idx_horarios_materia     ON horarios(materia_grupo_id);
CREATE INDEX IF NOT EXISTS idx_horarios_ciclo       ON horarios(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_expediente_alumno    ON expediente_documentos(alumno_id);
CREATE INDEX IF NOT EXISTS idx_pagos_alumno         ON pagos_alumno(alumno_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_alumno   ON incidencias(alumno_id);
CREATE INDEX IF NOT EXISTS idx_comunicados_fecha    ON comunicados(fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS idx_historial_alumno     ON historial_grupos_alumno(alumno_id);
CREATE INDEX IF NOT EXISTS idx_constancias_alumno   ON constancias_excelencia(alumno_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_calif      ON auditoria_calificaciones(calificacion_id);
CREATE INDEX idx_auditoria_usuario 		    ON auditoria_logs(usuario_id);
CREATE INDEX idx_auditoria_fecha 		    ON auditoria_logs(fecha DESC);
CREATE INDEX idx_auditoria_tabla 		    ON auditoria_logs(tabla_afectada);

INSERT INTO turnos (nombre, hora_inicio, hora_fin) VALUES
  ('Matutino',   '07:00', '14:10'),
  ('Vespertino', '12:00', '19:10')
ON CONFLICT DO NOTHING;

INSERT INTO especialidades (clave, nombre) VALUES
  ('DGD',  'Técnico en Diseño Gráfico Digital'),
  ('ELEC', 'Técnico en Electrónica'),
  ('PIA',  'Técnico en Producción Industrial de Alimentos')
ON CONFLICT DO NOTHING;

INSERT INTO edificios (clave, nombre, tipo) VALUES
  ('A',      'Edificio A',              'aulas'),
  ('B',      'Edificio B',              'aulas'),
  ('C',      'Edificio C',              'aulas'),
  ('INGLES', 'Salón de Inglés',         'especial'),
  ('LABS',   'Edificio de Laboratorios','laboratorios')
ON CONFLICT DO NOTHING;

INSERT INTO periodos_dia (turno_id, numero, hora_inicio, hora_fin) VALUES
  (1, 1, '07:00', '07:50'),
  (1, 2, '07:50', '08:40'),
  (1, 3, '08:40', '09:30'),
  (1, 4, '09:30', '10:20'),
  (1, 5, '10:20', '11:10'),
  (1, 6, '11:10', '12:00'),
  (1, 7, '12:00', '12:50'),

  (2, 1, '12:00', '12:50'),
  (2, 2, '12:50', '13:40'),
  (2, 3, '13:40', '14:30'),
  (2, 4, '14:30', '15:20'),
  (2, 5, '15:20', '16:10'),
  (2, 6, '16:10', '17:00'),
  (2, 7, '17:00', '17:50')
ON CONFLICT DO NOTHING;

INSERT INTO catalogo_documentos (clave, nombre, etapa, obligatorio, precio) VALUES
  
  ('ACTA_NACI_COPIA',   'Copia del acta de nacimiento',                       'preinscripcion', TRUE,  0.00),
  ('CURP_ASPIRANTE',    'CURP actualizada del aspirante',                      'preinscripcion', TRUE,  0.00),
  ('BOLETAS_SEC',       'Constancia de estudios / boletas de secundaria 1°-3°','preinscripcion', TRUE,  0.00),
  ('FOTOS_INF_PRE',     'Fotografías tamaño infantil (2)',                     'preinscripcion', TRUE,  0.00),
  ('COMPROBANTE_PAGO_FICHA','Comprobante de pago derecho a examen',            'preinscripcion', TRUE,  0.00),
  
  ('CERT_SEC_ORIG',     'Certificado de secundaria original',                  'inscripcion', TRUE,  0.00),
  ('ACTA_NACI_ORIG',    'Acta de nacimiento original y copia',                 'inscripcion', TRUE,  0.00),
  ('CURP_IMPRESA',      'CURP impresa reciente',                               'inscripcion', TRUE,  0.00),
  ('CARTA_BUENA_COND',  'Carta de buena conducta (secundaria)',                'inscripcion', TRUE,  0.00),
  ('FOTOS_INF_INS',     'Fotografías tamaño infantil fondo blanco',            'inscripcion', TRUE,  0.00),
  ('CERT_MEDICO',       'Certificado médico reciente',                         'inscripcion', TRUE,  0.00),
  ('FORMATO_INSCRIPCION','Formato de inscripción firmado',                     'inscripcion', TRUE,  0.00),
  
  ('FICHA_REINS',       'Ficha de reinscripción firmada por alumno y tutor',   'reinscripcion', TRUE,  0.00),
  ('COMPROBANTE_APORTACION','Comprobante de aportación institucional (banco)', 'reinscripcion', TRUE,  0.00),
  ('BOLETA_SEMESTRE_ANT','Copia de boleta del semestre anterior',              'reinscripcion', TRUE,  0.00),
  ('CARNET_IMSS',       'Carnet del IMSS / vigencia de derechos',              'reinscripcion', TRUE,  0.00),
  ('CURP_TUTOR_REINS',  'CURP del alumno y tutor (actualización)',             'reinscripcion', FALSE, 0.00)
ON CONFLICT DO NOTHING;

INSERT INTO conceptos_pago (nombre, precio) VALUES
  ('Derecho a examen de admisión',  150.00),
  ('Aportación institucional semestral', 200.00),
  ('Historial académico',            50.00),
  ('Constancia de estudios',         40.00),
  ('Certificado de terminación',    300.00),
  ('Credencial escolar',             30.00),
  ('Seguro facultativo estudiantil', 60.00)
ON CONFLICT DO NOTHING;

/*
por si algo falla (espero que no) empezamos desde 0....
DROP TABLE IF EXISTS
  auditoria_calificaciones, constancias_excelencia, calificaciones,
  asistencia_clase, asistencia_diaria,
  incidencias, tutorias,
  horarios, periodos_dia,
  pagos_alumno, expediente_documentos, cambios_grupo,
  historial_grupos_alumno, alumnos,
  materias_grupo, grupos, materias_catalogo,
  comunicados, conceptos_pago, catalogo_documentos,
  aulas, edificios, ciclos_escolares, especialidades, turnos,
  usuarios
CASCADE;
*/
