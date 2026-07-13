CREATE TABLE IF NOT EXISTS usuarios (
  id               SERIAL PRIMARY KEY,
  nombre           VARCHAR(100) NOT NULL,
  apellidos        VARCHAR(150) NOT NULL,
  email            VARCHAR(255) NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  rol              VARCHAR(20)  NOT NULL CHECK (rol IN ('alumno', 'docente', 'administrador')),
  activo           BOOLEAN DEFAULT TRUE,   
  fecha_registro   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materias (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(150) NOT NULL,
  descripcion    TEXT,
  ciclo_escolar  VARCHAR(20) NOT NULL,      -- ej: '2024-2025'
  docente_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  activa         BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inscripciones (
  id               SERIAL PRIMARY KEY,
  alumno_id        INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  materia_id       INTEGER NOT NULL REFERENCES materias(id) ON DELETE RESTRICT,
  fecha_inscripcion TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alumno_id, materia_id)
);

CREATE TABLE IF NOT EXISTS calificaciones (
  id              SERIAL PRIMARY KEY,
  inscripcion_id  INTEGER NOT NULL REFERENCES inscripciones(id) ON DELETE CASCADE,
  parcial         INTEGER NOT NULL CHECK (parcial BETWEEN 1 AND 3),
  calificacion    NUMERIC(4,1) NOT NULL CHECK (calificacion BETWEEN 0 AND 10),
  fecha_registro  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inscripcion_id, parcial)
);

CREATE TABLE IF NOT EXISTS comunicados (
  id                SERIAL PRIMARY KEY,
  titulo            VARCHAR(255) NOT NULL,
  contenido         TEXT NOT NULL,
  autor_id          INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  fecha_publicacion TIMESTAMPTZ DEFAULT NOW(),
  activo            BOOLEAN DEFAULT TRUE   -- permite "archivar" un comunicado sin borrarlo
);

CREATE INDEX IF NOT EXISTS idx_materias_docente    ON materias(docente_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_alumno ON inscripciones(alumno_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_materia ON inscripciones(materia_id);
CREATE INDEX IF NOT EXISTS idx_calificaciones_insc  ON calificaciones(inscripcion_id);
CREATE INDEX IF NOT EXISTS idx_comunicados_fecha    ON comunicados(fecha_publicacion DESC);

