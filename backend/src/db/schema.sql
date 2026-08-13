-- Script SQL nuevo, fue ejecutado en NEON para poner en marchaa
-- el sistema...

CREATE TABLE turnos (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(20) NOT NULL UNIQUE,
  hora_inicio TIME NOT NULL,
  hora_fin    TIME NOT NULL
);


CREATE TABLE especialidades (
  id          SERIAL PRIMARY KEY,
  clave       VARCHAR(10)  NOT NULL UNIQUE,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT
);


CREATE TABLE ciclos_escolares (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(30) NOT NULL UNIQUE,
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE NOT NULL,
  activo       BOOLEAN DEFAULT FALSE,
  CONSTRAINT un_ciclo_activo UNIQUE (activo)
);


CREATE TABLE catalogo_documentos (
  id          SERIAL PRIMARY KEY,
  clave       VARCHAR(30)  NOT NULL UNIQUE,
  nombre      VARCHAR(150) NOT NULL,
  descripcion TEXT,
  etapa       VARCHAR(20)  NOT NULL CHECK (etapa IN ('preinscripcion','inscripcion','reinscripcion')),
  obligatorio BOOLEAN DEFAULT TRUE,
  precio      NUMERIC(8,2) DEFAULT 0.00
);


CREATE TABLE conceptos_pago (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL,
  descripcion TEXT,
  precio      NUMERIC(8,2) NOT NULL,
  activo      BOOLEAN DEFAULT TRUE
);


CREATE TABLE usuarios (
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


CREATE TABLE materias_catalogo (
  id               SERIAL PRIMARY KEY,
  nombre           VARCHAR(150) NOT NULL,
  clave            VARCHAR(20)  UNIQUE,
  semestre         SMALLINT NOT NULL CHECK (semestre BETWEEN 1 AND 6),
  tipo             VARCHAR(25)  NOT NULL CHECK (tipo IN ('troncal_general','troncal_especialidad','modulo')),
  especialidad_id  INTEGER REFERENCES especialidades(id),
  modulo_numero    SMALLINT CHECK (modulo_numero BETWEEN 1 AND 5),
  submodulo_numero SMALLINT CHECK (submodulo_numero BETWEEN 1 AND 2),
  horas_semana     SMALLINT DEFAULT 3,
  activa           BOOLEAN DEFAULT TRUE
);


CREATE TABLE grupos (
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


CREATE TABLE materias_grupo (
  id                  SERIAL PRIMARY KEY,
  grupo_id            INTEGER NOT NULL REFERENCES grupos(id),
  materia_catalogo_id INTEGER NOT NULL REFERENCES materias_catalogo(id),
  docente_id          INTEGER REFERENCES usuarios(id),
  ciclo_id            INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  activa              BOOLEAN DEFAULT TRUE,
  UNIQUE(grupo_id, materia_catalogo_id, ciclo_id)
);


CREATE TABLE alumnos (
  id                   SERIAL PRIMARY KEY,
  usuario_id           INTEGER NOT NULL UNIQUE REFERENCES usuarios(id),
  matricula            VARCHAR(30) NOT NULL UNIQUE,
  curp                 VARCHAR(18) UNIQUE,
  fecha_nacimiento     DATE,
  genero               CHAR(1) CHECK (genero IN ('M','F','O')),
  direccion            TEXT,
  telefono_tutor       VARCHAR(20),
  nombre_tutor         VARCHAR(200),
  curp_tutor           VARCHAR(18),
  especialidad_id      INTEGER REFERENCES especialidades(id),
  grupo_actual_id      INTEGER REFERENCES grupos(id),
  semestre_actual      SMALLINT CHECK (semestre_actual BETWEEN 1 AND 6),
  estatus              VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estatus IN ('activo','baja_temporal','baja_definitiva','egresado','irregular')),
  candidato_constancia BOOLEAN DEFAULT FALSE,
  fecha_ingreso        DATE,
  generacion           VARCHAR(10)
);


CREATE TABLE historial_grupos_alumno (
  id                SERIAL PRIMARY KEY,
  alumno_id         INTEGER NOT NULL REFERENCES alumnos(id),
  grupo_id          INTEGER NOT NULL REFERENCES grupos(id),
  ciclo_id          INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  semestre          SMALLINT NOT NULL,
  fecha_asignacion  DATE DEFAULT CURRENT_DATE,
  activo            BOOLEAN DEFAULT TRUE,
  UNIQUE(alumno_id, ciclo_id, semestre)
);


CREATE TABLE cambios_grupo (
  id                SERIAL PRIMARY KEY,
  alumno_id         INTEGER NOT NULL REFERENCES alumnos(id),
  grupo_origen_id   INTEGER NOT NULL REFERENCES grupos(id),
  grupo_destino_id  INTEGER NOT NULL REFERENCES grupos(id),
  ciclo_id          INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  fecha_cambio      DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo            TEXT,
  autorizado_por    INTEGER NOT NULL REFERENCES usuarios(id)
);


CREATE TABLE calificaciones (
  id                       SERIAL PRIMARY KEY,
  alumno_id                INTEGER NOT NULL REFERENCES alumnos(id),
  materia_grupo_id         INTEGER NOT NULL REFERENCES materias_grupo(id),
  ciclo_id                 INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  parcial                  SMALLINT NOT NULL CHECK (parcial BETWEEN 1 AND 3),
  calificacion             NUMERIC(4,1) NOT NULL CHECK (calificacion BETWEEN 0 AND 10),
  tipo_evaluacion          VARCHAR(20) NOT NULL DEFAULT 'ordinaria' CHECK (tipo_evaluacion IN ('ordinaria','extraordinario','recuperacion')),
  calificacion_ordinaria_previa NUMERIC(4,1),
  fecha_registro           TIMESTAMPTZ DEFAULT NOW(),
  registrado_por           INTEGER NOT NULL REFERENCES usuarios(id),
  UNIQUE(alumno_id, materia_grupo_id, ciclo_id, parcial)
);


CREATE TABLE auditoria_calificaciones (
  id               SERIAL PRIMARY KEY,
  calificacion_id  INTEGER NOT NULL REFERENCES calificaciones(id),
  valor_anterior   NUMERIC(4,1),
  valor_nuevo      NUMERIC(4,1) NOT NULL,
  modificado_por   INTEGER NOT NULL REFERENCES usuarios(id),
  fecha_cambio     TIMESTAMPTZ DEFAULT NOW(),
  motivo           TEXT
);


CREATE TABLE constancias_excelencia (
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


CREATE TABLE periodos_evaluacion (
  id          SERIAL PRIMARY KEY,
  ciclo_id    INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  parcial     INTEGER NOT NULL CHECK (parcial IN (1,2,3)),
  tipo        VARCHAR(20) DEFAULT 'parcial' CHECK (tipo IN ('parcial','recuperacion','extraordinario')),
  fecha_inicio DATE NOT NULL,
  fecha_fin   DATE NOT NULL,
  activo      BOOLEAN DEFAULT TRUE,
  UNIQUE(ciclo_id, parcial)
);


CREATE TABLE asistencia_diaria (
  id                  SERIAL PRIMARY KEY,
  alumno_id           INTEGER NOT NULL REFERENCES alumnos(id),
  fecha               DATE NOT NULL DEFAULT CURRENT_DATE,
  llego               BOOLEAN NOT NULL DEFAULT FALSE,
  justificada         BOOLEAN DEFAULT FALSE,
  motivo_justificacion TEXT,
  registrado_por      INTEGER NOT NULL REFERENCES usuarios(id),
  UNIQUE(alumno_id, fecha)
);


CREATE TABLE asistencia_clase (
  id                  SERIAL PRIMARY KEY,
  alumno_id           INTEGER NOT NULL REFERENCES alumnos(id),
  materia_grupo_id    INTEGER NOT NULL REFERENCES materias_grupo(id),
  fecha               DATE NOT NULL DEFAULT CURRENT_DATE,
  periodo_numero      SMALLINT NOT NULL CHECK (periodo_numero BETWEEN 1 AND 7),
  estado              VARCHAR(15) NOT NULL DEFAULT 'ausente' CHECK (estado IN ('presente','ausente','justificado','tardanza')),
  justificacion       TEXT,
  registrado_por      INTEGER NOT NULL REFERENCES usuarios(id),
  fecha_registro      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alumno_id, materia_grupo_id, fecha, periodo_numero)
);


CREATE TABLE horario_archivos (
  id               SERIAL PRIMARY KEY,
  nombre           VARCHAR(255) NOT NULL,
  key              VARCHAR(500) NOT NULL,
  subido_por       INTEGER REFERENCES usuarios(id),
  fecha            TIMESTAMPTZ DEFAULT NOW(),
  ciclo_id         INTEGER REFERENCES ciclos_escolares(id),
  semestre         SMALLINT CHECK (semestre BETWEEN 1 AND 6),
  letra            CHAR(1) CHECK (letra IN ('A','B','C','D')),
  especialidad_id  INTEGER REFERENCES especialidades(id),
  turno_id         INTEGER REFERENCES turnos(id),
  tipo_horario     VARCHAR(20) NOT NULL DEFAULT 'grupo' CHECK (tipo_horario IN ('grupo','maestro','laboratorio')),
  docente_id       INTEGER REFERENCES usuarios(id),
  tipo             VARCHAR(100),
  descripcion      TEXT,
  grupo_id         INTEGER REFERENCES grupos(id)
);


CREATE TABLE tutorias (
  id             SERIAL PRIMARY KEY,
  tutor_id       INTEGER NOT NULL REFERENCES usuarios(id),
  grupo_id       INTEGER NOT NULL REFERENCES grupos(id),
  ciclo_id       INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  fecha          DATE NOT NULL,
  tema           VARCHAR(200),
  observaciones  TEXT,
  fecha_registro TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE incidencias (
  id             SERIAL PRIMARY KEY,
  alumno_id      INTEGER NOT NULL REFERENCES alumnos(id),
  ciclo_id       INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  tipo           VARCHAR(30) NOT NULL CHECK (tipo IN ('conducta','academica','asistencia','citatorio_tutor','felicitacion','otro')),
  subtipo        VARCHAR(50),
  descripcion    TEXT NOT NULL,
  registrado_por INTEGER NOT NULL REFERENCES usuarios(id),
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  resuelta       BOOLEAN DEFAULT FALSE,
  resolucion     TEXT
);


CREATE TABLE comunicados (
  id                 SERIAL PRIMARY KEY,
  titulo             VARCHAR(255) NOT NULL,
  contenido          TEXT NOT NULL,
  autor_id           INTEGER NOT NULL REFERENCES usuarios(id),
  fecha_publicacion  TIMESTAMPTZ DEFAULT NOW(),
  activo             BOOLEAN DEFAULT TRUE,
  dirigido_a_rol     VARCHAR(20) CHECK (dirigido_a_rol IN ('alumno','docente','administrador')),
  dirigido_a_grupo   INTEGER REFERENCES grupos(id)
);


CREATE TABLE pagos_alumno (
  id             SERIAL PRIMARY KEY,
  alumno_id      INTEGER NOT NULL REFERENCES alumnos(id),
  concepto_id    INTEGER NOT NULL REFERENCES conceptos_pago(id),
  ciclo_id       INTEGER REFERENCES ciclos_escolares(id),
  monto          NUMERIC(8,2) NOT NULL,
  fecha_pago     DATE NOT NULL DEFAULT CURRENT_DATE,
  folio_recibo   VARCHAR(50),
  registrado_por INTEGER NOT NULL REFERENCES usuarios(id),
  observaciones  TEXT
);


CREATE TABLE expediente_documentos (
  id             SERIAL PRIMARY KEY,
  alumno_id      INTEGER NOT NULL REFERENCES alumnos(id),
  documento_id   INTEGER NOT NULL REFERENCES catalogo_documentos(id),
  entregado      BOOLEAN DEFAULT FALSE,
  fecha_entrega  DATE,
  recibido_por   INTEGER REFERENCES usuarios(id),
  observaciones  TEXT,
  UNIQUE(alumno_id, documento_id)
);


CREATE TABLE aspirantes (
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
  estatus             VARCHAR(30) NOT NULL DEFAULT 'registrado' CHECK (estatus IN ('registrado','documentos_pendientes','ficha_pagada','examen_aprobado','aceptado','rechazado','inscrito')),
  fecha_registro      TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE servicio_social_practicas (
  id                  SERIAL PRIMARY KEY,
  alumno_id           INTEGER NOT NULL REFERENCES alumnos(id),
  tipo                VARCHAR(30) NOT NULL CHECK (tipo IN ('servicio_social','practicas_profesionales')),
  institucion_empresa VARCHAR(150) NOT NULL,
  asesor_externo      VARCHAR(150),
  horas_acumuladas    SMALLINT DEFAULT 0 CHECK (horas_acumuladas >= 0),
  estatus             VARCHAR(30) NOT NULL DEFAULT 'en_proceso' CHECK (estatus IN ('en_proceso','liberado','reprobado')),
  fecha_inicio        DATE,
  fecha_fin           DATE,
  observaciones       TEXT,
  registrado_por      INTEGER REFERENCES usuarios(id),
  fecha_registro      TIMESTAMPTZ DEFAULT NOW(),
  tipo_institucion    VARCHAR(30) CHECK (tipo_institucion IN ('gubernamental','publica','privada_convenio')),
  tiene_convenio      BOOLEAN DEFAULT FALSE,
  autorizacion_tutor  BOOLEAN DEFAULT FALSE,
  semestre_requerido  SMALLINT CHECK (semestre_requerido BETWEEN 1 AND 6),
  UNIQUE(alumno_id, tipo)
);


CREATE TABLE servicio_social_reportes (
  id                  SERIAL PRIMARY KEY,
  servicio_social_id  INTEGER NOT NULL REFERENCES servicio_social_practicas(id) ON DELETE CASCADE,
  numero              INTEGER NOT NULL CHECK (numero BETWEEN 1 AND 4),
  fecha_limite        DATE,
  fecha_entrega       DATE,
  entregado           BOOLEAN DEFAULT FALSE,
  observaciones       TEXT,
  UNIQUE(servicio_social_id, numero)
);


CREATE TABLE titulacion (
  id                  SERIAL PRIMARY KEY,
  alumno_id           INTEGER NOT NULL UNIQUE REFERENCES alumnos(id),
  opcion_titulacion   VARCHAR(100) NOT NULL,
  estatus             VARCHAR(30) NOT NULL DEFAULT 'en_proceso' CHECK (estatus IN ('en_proceso','tramite','titulado')),
  fecha_examen        DATE,
  numero_titulo       VARCHAR(50) UNIQUE,
  cedula_profesional  VARCHAR(50) UNIQUE,
  observaciones       TEXT,
  autorizado_por      INTEGER REFERENCES usuarios(id),
  fecha_registro      TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE becas_alumnos (
  id                  SERIAL PRIMARY KEY,
  alumno_id           INTEGER REFERENCES alumnos(id),
  ciclo_id            INTEGER NOT NULL REFERENCES ciclos_escolares(id),
  nombre_beca         VARCHAR(100) NOT NULL,
  monto               NUMERIC(8,2) DEFAULT 0.00,
  estatus             VARCHAR(30) NOT NULL DEFAULT 'activo' CHECK (estatus IN ('activo','suspendido','concluido')),
  fecha_asignacion    DATE DEFAULT CURRENT_DATE,
  comentarios_alumno  TEXT,
  descripcion         TEXT,
  activo              BOOLEAN DEFAULT TRUE,
  estatus_pago        VARCHAR(20) DEFAULT 'cursando' CHECK (estatus_pago IN ('cursando','proceso_deposito','depositado')),
  periodicidad        VARCHAR(20) DEFAULT 'semestral' CHECK (periodicidad IN ('mensual','trimestral','semestral','anual')),
  fecha_inicio        DATE,
  fecha_fin           DATE,
  UNIQUE(alumno_id, ciclo_id, nombre_beca)
);


CREATE TABLE periodos_escolares (
  id          SERIAL PRIMARY KEY,
  ciclo_id    INTEGER NOT NULL REFERENCES ciclos_escolares(id) ON DELETE CASCADE,
  semestre    SMALLINT CHECK (semestre BETWEEN 1 AND 6),
  tipo        VARCHAR(30) NOT NULL CHECK (tipo IN ('preinscripcion','inscripcion_nuevo_ingreso','reinscripcion','inicio_semestre','fin_semestre','evaluaciones_parciales','evaluacion_recuperacion','evaluacion_extraordinaria','curso_intersemestral')),
  fecha_inicio DATE NOT NULL,
  fecha_fin   DATE NOT NULL,
  activo      BOOLEAN DEFAULT TRUE,
  UNIQUE(ciclo_id, semestre, tipo)
);


CREATE TABLE auditoria_inscripciones (
  id            SERIAL PRIMARY KEY,
  alumno_id     INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  grupo_id      INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  tipo          VARCHAR(30) NOT NULL CHECK (tipo IN ('inscripcion_nuevo_ingreso','reinscripcion','baja')),
  fecha         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id    INTEGER NOT NULL REFERENCES usuarios(id),
  observaciones TEXT
);


CREATE TABLE auditoria_logs (
  id               SERIAL PRIMARY KEY,
  usuario_id       INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  accion           VARCHAR(50) NOT NULL,
  tabla_afectada   VARCHAR(50),
  registro_id      INTEGER,
  datos_anteriores JSONB,
  datos_nuevos     JSONB,
  ip               VARCHAR(45),
  user_agent       TEXT,
  fecha            TIMESTAMPTZ DEFAULT NOW()
);





CREATE INDEX idx_aspirantes_curp ON aspirantes(curp);
CREATE INDEX idx_aspirantes_ciclo ON aspirantes(ciclo_id);
CREATE INDEX idx_horario_archivos_ciclo ON horario_archivos(ciclo_id);
CREATE INDEX idx_horario_archivos_semestre ON horario_archivos(semestre);
CREATE INDEX idx_horario_archivos_grupo ON horario_archivos(grupo_id);
CREATE INDEX idx_horario_archivos_tipo ON horario_archivos(tipo_horario);
CREATE INDEX idx_servicio_social_alumno ON servicio_social_practicas(alumno_id);
CREATE INDEX idx_becas_alumno ON becas_alumnos(alumno_id);
CREATE INDEX idx_becas_ciclo ON becas_alumnos(ciclo_id);
CREATE INDEX idx_titulacion_alumno ON titulacion(alumno_id);
CREATE INDEX idx_ss_reportes_ss_id ON servicio_social_reportes(servicio_social_id);
CREATE INDEX idx_incidencias_subtipo ON incidencias(subtipo);
CREATE INDEX idx_auditoria_alumno ON auditoria_inscripciones(alumno_id);
CREATE INDEX idx_auditoria_fecha ON auditoria_inscripciones(fecha DESC);
CREATE INDEX idx_alumnos_usuario ON alumnos(usuario_id);
CREATE INDEX idx_alumnos_grupo ON alumnos(grupo_actual_id);
CREATE INDEX idx_alumnos_especialidad ON alumnos(especialidad_id);
CREATE INDEX idx_grupos_ciclo ON grupos(ciclo_id);
CREATE INDEX idx_grupos_tutor ON grupos(tutor_id);
CREATE INDEX idx_mat_grupo_docente ON materias_grupo(docente_id);
CREATE INDEX idx_mat_grupo_grupo ON materias_grupo(grupo_id);
CREATE INDEX idx_mat_grupo_ciclo ON materias_grupo(ciclo_id);
CREATE INDEX idx_califs_alumno ON calificaciones(alumno_id);
CREATE INDEX idx_califs_materia ON calificaciones(materia_grupo_id);
CREATE INDEX idx_califs_ciclo ON calificaciones(ciclo_id);
CREATE INDEX idx_asist_diaria_alumno ON asistencia_diaria(alumno_id);
CREATE INDEX idx_asist_diaria_fecha ON asistencia_diaria(fecha);
CREATE INDEX idx_asist_clase_alumno ON asistencia_clase(alumno_id);
CREATE INDEX idx_asist_clase_materia ON asistencia_clase(materia_grupo_id);
CREATE INDEX idx_asist_clase_fecha ON asistencia_clase(fecha);
CREATE INDEX idx_expediente_alumno ON expediente_documentos(alumno_id);
CREATE INDEX idx_pagos_alumno ON pagos_alumno(alumno_id);
CREATE INDEX idx_incidencias_alumno ON incidencias(alumno_id);
CREATE INDEX idx_comunicados_fecha ON comunicados(fecha_publicacion DESC);
CREATE INDEX idx_historial_alumno ON historial_grupos_alumno(alumno_id);
CREATE INDEX idx_constancias_alumno ON constancias_excelencia(alumno_id);
CREATE INDEX idx_auditoria_calif ON auditoria_calificaciones(calificacion_id);
CREATE INDEX idx_auditoria_usuario ON auditoria_logs(usuario_id);
CREATE INDEX idx_auditoria_fecha_log ON auditoria_logs(fecha DESC);
CREATE INDEX idx_auditoria_tabla ON auditoria_logs(tabla_afectada);

