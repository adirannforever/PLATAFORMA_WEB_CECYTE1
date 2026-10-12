--
-- PostgreSQL database dump
--

\restrict sxyELr8a15BleeURDvsXZQfadTB7t7PDpOWTIApNHAR8xRLpIIiQEwbVpGWIUS4

-- Dumped from database version 18.6 (c021049)
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: generar_periodos_ciclo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_periodos_ciclo() RETURNS trigger
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
$$;


--
-- Name: verificar_conflicto_horario_docente(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_conflicto_horario_docente() RETURNS trigger
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alumnos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumnos (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    matricula character varying(30) NOT NULL,
    curp character varying(18),
    fecha_nacimiento date,
    genero character(1),
    direccion text,
    telefono_tutor character varying(20),
    nombre_tutor character varying(200),
    curp_tutor character varying(18),
    especialidad_id integer,
    grupo_actual_id integer,
    semestre_actual smallint,
    estatus character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    candidato_constancia boolean DEFAULT false,
    fecha_ingreso date,
    generacion character varying(10),
    CONSTRAINT alumnos_estatus_check CHECK (((estatus)::text = ANY ((ARRAY['activo'::character varying, 'baja_temporal'::character varying, 'baja_definitiva'::character varying, 'egresado'::character varying, 'irregular'::character varying])::text[]))),
    CONSTRAINT alumnos_genero_check CHECK ((genero = ANY (ARRAY['M'::bpchar, 'F'::bpchar, 'O'::bpchar]))),
    CONSTRAINT alumnos_semestre_actual_check CHECK (((semestre_actual >= 1) AND (semestre_actual <= 6)))
);


--
-- Name: alumnos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alumnos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alumnos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alumnos_id_seq OWNED BY public.alumnos.id;


--
-- Name: asistencia_clase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asistencia_clase (
    id integer NOT NULL,
    alumno_id integer NOT NULL,
    materia_grupo_id integer NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    periodo_numero smallint NOT NULL,
    estado character varying(15) DEFAULT 'ausente'::character varying NOT NULL,
    justificacion text,
    registrado_por integer NOT NULL,
    fecha_registro timestamp with time zone DEFAULT now(),
    CONSTRAINT asistencia_clase_estado_check CHECK (((estado)::text = ANY ((ARRAY['presente'::character varying, 'ausente'::character varying, 'justificado'::character varying, 'tardanza'::character varying])::text[]))),
    CONSTRAINT asistencia_clase_periodo_numero_check CHECK (((periodo_numero >= 1) AND (periodo_numero <= 7)))
);


--
-- Name: asistencia_clase_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asistencia_clase_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asistencia_clase_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asistencia_clase_id_seq OWNED BY public.asistencia_clase.id;


--
-- Name: asistencia_diaria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asistencia_diaria (
    id integer NOT NULL,
    alumno_id integer NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    llego boolean DEFAULT false NOT NULL,
    justificada boolean DEFAULT false,
    motivo_justificacion text,
    registrado_por integer NOT NULL
);


--
-- Name: asistencia_diaria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asistencia_diaria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asistencia_diaria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asistencia_diaria_id_seq OWNED BY public.asistencia_diaria.id;


--
-- Name: aspirantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aspirantes (
    id integer NOT NULL,
    folio character varying(30) NOT NULL,
    nombre character varying(100) NOT NULL,
    apellidos character varying(150) NOT NULL,
    curp character varying(18) NOT NULL,
    email character varying(255) NOT NULL,
    telefono character varying(20),
    especialidad_id integer NOT NULL,
    turno_preferido_id integer NOT NULL,
    ciclo_id integer NOT NULL,
    estatus character varying(30) DEFAULT 'registrado'::character varying NOT NULL,
    fecha_registro timestamp with time zone DEFAULT now(),
    CONSTRAINT aspirantes_estatus_check CHECK (((estatus)::text = ANY ((ARRAY['registrado'::character varying, 'documentos_pendientes'::character varying, 'ficha_pagada'::character varying, 'examen_aprobado'::character varying, 'aceptado'::character varying, 'rechazado'::character varying, 'inscrito'::character varying])::text[])))
);


--
-- Name: aspirantes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aspirantes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aspirantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aspirantes_id_seq OWNED BY public.aspirantes.id;


--
-- Name: auditoria_calificaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditoria_calificaciones (
    id integer NOT NULL,
    calificacion_id integer NOT NULL,
    valor_anterior numeric(4,1),
    valor_nuevo numeric(4,1) NOT NULL,
    modificado_por integer NOT NULL,
    fecha_cambio timestamp with time zone DEFAULT now(),
    motivo text
);


--
-- Name: auditoria_calificaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auditoria_calificaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auditoria_calificaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auditoria_calificaciones_id_seq OWNED BY public.auditoria_calificaciones.id;


--
-- Name: auditoria_inscripciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditoria_inscripciones (
    id integer NOT NULL,
    alumno_id integer NOT NULL,
    grupo_id integer NOT NULL,
    tipo character varying(30) NOT NULL,
    fecha timestamp with time zone DEFAULT now() NOT NULL,
    usuario_id integer NOT NULL,
    observaciones text,
    CONSTRAINT auditoria_inscripciones_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['inscripcion_nuevo_ingreso'::character varying, 'reinscripcion'::character varying, 'baja'::character varying])::text[])))
);


--
-- Name: auditoria_inscripciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auditoria_inscripciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auditoria_inscripciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auditoria_inscripciones_id_seq OWNED BY public.auditoria_inscripciones.id;


--
-- Name: auditoria_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditoria_logs (
    id integer NOT NULL,
    usuario_id integer,
    accion character varying(50) NOT NULL,
    tabla_afectada character varying(50),
    registro_id integer,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    ip character varying(45),
    user_agent text,
    fecha timestamp with time zone DEFAULT now(),
    metodo character varying(10),
    ruta character varying(255),
    status integer
);


--
-- Name: auditoria_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auditoria_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auditoria_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auditoria_logs_id_seq OWNED BY public.auditoria_logs.id;


--
-- Name: aulas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aulas (
    id integer NOT NULL,
    edificio_id integer NOT NULL,
    nombre character varying(40) NOT NULL,
    tipo character varying(30) NOT NULL,
    capacidad smallint,
    activa boolean DEFAULT true
);


--
-- Name: aulas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aulas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aulas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aulas_id_seq OWNED BY public.aulas.id;


--
-- Name: becas_alumnos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.becas_alumnos (
    id integer NOT NULL,
    alumno_id integer,
    ciclo_id integer NOT NULL,
    nombre_beca character varying(100) NOT NULL,
    monto numeric(8,2) DEFAULT 0.00,
    estatus character varying(30) DEFAULT 'activo'::character varying NOT NULL,
    fecha_asignacion date DEFAULT CURRENT_DATE,
    comentarios_alumno text,
    periodicidad character varying(20) DEFAULT 'semestral'::character varying,
    descripcion text,
    activo boolean DEFAULT true,
    estatus_pago character varying(20) DEFAULT 'cursando'::character varying,
    fecha_inicio date,
    fecha_fin date,
    CONSTRAINT becas_alumnos_estatus_check CHECK (((estatus)::text = ANY ((ARRAY['activo'::character varying, 'suspendido'::character varying, 'concluido'::character varying])::text[]))),
    CONSTRAINT becas_alumnos_estatus_pago_check CHECK (((estatus_pago)::text = ANY ((ARRAY['cursando'::character varying, 'proceso_deposito'::character varying, 'depositado'::character varying])::text[]))),
    CONSTRAINT becas_alumnos_periodicidad_check CHECK (((periodicidad)::text = ANY ((ARRAY['mensual'::character varying, 'trimestral'::character varying, 'semestral'::character varying, 'anual'::character varying])::text[])))
);


--
-- Name: becas_alumnos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.becas_alumnos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: becas_alumnos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.becas_alumnos_id_seq OWNED BY public.becas_alumnos.id;


--
-- Name: calificaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calificaciones (
    id integer NOT NULL,
    alumno_id integer NOT NULL,
    materia_grupo_id integer NOT NULL,
    ciclo_id integer NOT NULL,
    parcial smallint NOT NULL,
    calificacion numeric(4,1) NOT NULL,
    tipo_evaluacion character varying(20) DEFAULT 'ordinaria'::character varying NOT NULL,
    calificacion_ordinaria_previa numeric(4,1),
    fecha_registro timestamp with time zone DEFAULT now(),
    registrado_por integer NOT NULL,
    CONSTRAINT calificaciones_calificacion_check CHECK (((calificacion >= (0)::numeric) AND (calificacion <= (10)::numeric))),
    CONSTRAINT calificaciones_parcial_check CHECK (((parcial >= 1) AND (parcial <= 3))),
    CONSTRAINT calificaciones_tipo_evaluacion_check CHECK (((tipo_evaluacion)::text = ANY ((ARRAY['ordinaria'::character varying, 'extraordinario'::character varying, 'recuperacion'::character varying])::text[])))
);


--
-- Name: calificaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calificaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calificaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calificaciones_id_seq OWNED BY public.calificaciones.id;


--
-- Name: cambios_grupo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cambios_grupo (
    id integer NOT NULL,
    alumno_id integer NOT NULL,
    grupo_origen_id integer NOT NULL,
    grupo_destino_id integer NOT NULL,
    ciclo_id integer NOT NULL,
    fecha_cambio date DEFAULT CURRENT_DATE NOT NULL,
    motivo text,
    autorizado_por integer NOT NULL
);


--
-- Name: cambios_grupo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cambios_grupo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cambios_grupo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cambios_grupo_id_seq OWNED BY public.cambios_grupo.id;


--
-- Name: catalogo_documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalogo_documentos (
    id integer NOT NULL,
    clave character varying(30) NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    etapa character varying(20) NOT NULL,
    obligatorio boolean DEFAULT true,
    precio numeric(8,2) DEFAULT 0.00,
    CONSTRAINT catalogo_documentos_etapa_check CHECK (((etapa)::text = ANY ((ARRAY['preinscripcion'::character varying, 'inscripcion'::character varying, 'reinscripcion'::character varying])::text[])))
);


--
-- Name: catalogo_documentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.catalogo_documentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: catalogo_documentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.catalogo_documentos_id_seq OWNED BY public.catalogo_documentos.id;


--
-- Name: ciclos_escolares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ciclos_escolares (
    id integer NOT NULL,
    nombre character varying(30) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    activo boolean DEFAULT false
);


--
-- Name: ciclos_escolares_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ciclos_escolares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ciclos_escolares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ciclos_escolares_id_seq OWNED BY public.ciclos_escolares.id;


--
-- Name: comunicados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comunicados (
    id integer NOT NULL,
    titulo character varying(255) NOT NULL,
    contenido text NOT NULL,
    autor_id integer NOT NULL,
    fecha_publicacion timestamp with time zone DEFAULT now(),
    activo boolean DEFAULT true,
    dirigido_a_rol character varying(20),
    dirigido_a_grupo integer,
    CONSTRAINT comunicados_dirigido_a_rol_check CHECK (((dirigido_a_rol)::text = ANY ((ARRAY['alumno'::character varying, 'docente'::character varying, 'administrador'::character varying])::text[])))
);


--
-- Name: comunicados_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comunicados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comunicados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comunicados_id_seq OWNED BY public.comunicados.id;


--
-- Name: conceptos_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conceptos_pago (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    precio numeric(8,2) NOT NULL,
    activo boolean DEFAULT true
);


--
-- Name: conceptos_pago_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conceptos_pago_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conceptos_pago_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conceptos_pago_id_seq OWNED BY public.conceptos_pago.id;


--
-- Name: configuracion_horarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracion_horarios (
    id integer NOT NULL,
    duracion_bloque_minutos integer DEFAULT 50 NOT NULL,
    hora_inicio_turno time without time zone DEFAULT '07:00:00'::time without time zone NOT NULL,
    hora_fin_turno time without time zone DEFAULT '13:00:00'::time without time zone NOT NULL,
    receso_inicio time without time zone DEFAULT '09:30:00'::time without time zone NOT NULL,
    receso_fin time without time zone DEFAULT '10:00:00'::time without time zone NOT NULL,
    receso_bloqueado boolean DEFAULT false,
    dias_semana text[] DEFAULT ARRAY['Lunes'::text, 'Martes'::text, 'Miércoles'::text, 'Jueves'::text, 'Viernes'::text]
);


--
-- Name: configuracion_horarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.configuracion_horarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: configuracion_horarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.configuracion_horarios_id_seq OWNED BY public.configuracion_horarios.id;


--
-- Name: constancias_excelencia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.constancias_excelencia (
    id integer NOT NULL,
    alumno_id integer NOT NULL,
    ciclo_id integer NOT NULL,
    semestre smallint NOT NULL,
    promedio numeric(4,2) NOT NULL,
    emitida boolean DEFAULT false,
    fecha_emision date,
    generada_por integer
);


--
-- Name: constancias_excelencia_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.constancias_excelencia_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: constancias_excelencia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.constancias_excelencia_id_seq OWNED BY public.constancias_excelencia.id;


--
-- Name: edificios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edificios (
    id integer NOT NULL,
    clave character varying(10) NOT NULL,
    nombre character varying(80) NOT NULL,
    tipo character varying(30) NOT NULL
);


--
-- Name: edificios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.edificios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: edificios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.edificios_id_seq OWNED BY public.edificios.id;


--
-- Name: especialidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.especialidades (
    id integer NOT NULL,
    clave character varying(10) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text
);


--
-- Name: especialidades_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.especialidades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: especialidades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.especialidades_id_seq OWNED BY public.especialidades.id;


--
-- Name: expediente_documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expediente_documentos (
    id integer NOT NULL,
    alumno_id integer NOT NULL,
    documento_id integer NOT NULL,
    entregado boolean DEFAULT false,
    fecha_entrega date,
    recibido_por integer,
    observaciones text
);


--
-- Name: expediente_documentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expediente_documentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expediente_documentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expediente_documentos_id_seq OWNED BY public.expediente_documentos.id;


--
-- Name: grupos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grupos (
    id integer NOT NULL,
    ciclo_id integer NOT NULL,
    especialidad_id integer NOT NULL,
    turno_id integer NOT NULL,
    semestre smallint NOT NULL,
    letra character(1) NOT NULL,
    nombre character varying(60) GENERATED ALWAYS AS ((((((semestre)::text || '°'::text) || (letra)::text) || ' '::text) ||
CASE
    WHEN (turno_id = 1) THEN 'Matutino'::text
    ELSE 'Vespertino'::text
END)) STORED,
    tutor_id integer,
    activo boolean DEFAULT true,
    horario_config jsonb,
    CONSTRAINT grupos_letra_check CHECK ((letra = ANY (ARRAY['A'::bpchar, 'B'::bpchar, 'C'::bpchar, 'D'::bpchar]))),
    CONSTRAINT grupos_semestre_check CHECK (((semestre >= 1) AND (semestre <= 6)))
);


--
-- Name: grupos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grupos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grupos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grupos_id_seq OWNED BY public.grupos.id;


--
-- Name: historial_grupos_alumno; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historial_grupos_alumno (
    id integer NOT NULL,
    alumno_id integer NOT NULL,
    grupo_id integer NOT NULL,
    ciclo_id integer NOT NULL,
    semestre smallint NOT NULL,
    fecha_asignacion date DEFAULT CURRENT_DATE,
    activo boolean DEFAULT true
);


--
-- Name: historial_grupos_alumno_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.historial_grupos_alumno_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historial_grupos_alumno_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.historial_grupos_alumno_id_seq OWNED BY public.historial_grupos_alumno.id;


--
-- Name: horario_archivos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.horario_archivos (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    key character varying(500) NOT NULL,
    subido_por integer,
    fecha timestamp with time zone DEFAULT now(),
    grupo_id integer,
    tipo character varying(100),
    ciclo_id integer,
    semestre smallint,
    letra character(1),
    especialidad_id integer,
    turno_id integer,
    tipo_horario character varying(20) DEFAULT 'alumnos'::character varying NOT NULL,
    docente_id integer,
    laboratorio_id integer,
    descripcion text,
    CONSTRAINT horario_archivos_letra_check CHECK ((letra = ANY (ARRAY['A'::bpchar, 'B'::bpchar, 'C'::bpchar, 'D'::bpchar]))),
    CONSTRAINT horario_archivos_semestre_check CHECK (((semestre >= 1) AND (semestre <= 6))),
    CONSTRAINT horario_archivos_tipo_horario_check CHECK (((tipo_horario)::text = ANY ((ARRAY['grupo'::character varying, 'maestro'::character varying, 'laboratorio'::character varying])::text[])))
);


--
-- Name: horario_archivos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.horario_archivos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: horario_archivos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.horario_archivos_id_seq OWNED BY public.horario_archivos.id;


--
-- Name: horario_grupos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.horario_grupos (
    id integer NOT NULL,
    grupo_id integer NOT NULL,
    materia_grupo_id integer NOT NULL,
    dia_semana text NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    creado_por integer,
    fecha_creacion timestamp with time zone DEFAULT now(),
    CONSTRAINT horario_grupos_dia_semana_check CHECK ((dia_semana = ANY (ARRAY['Lunes'::text, 'Martes'::text, 'Miércoles'::text, 'Jueves'::text, 'Viernes'::text])))
);


--
-- Name: horario_grupos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.horario_grupos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: horario_grupos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.horario_grupos_id_seq OWNED BY public.horario_grupos.id;


--
-- Name: horario_laboratorios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.horario_laboratorios (
    id integer NOT NULL,
    laboratorio_id integer NOT NULL,
    materia_grupo_id integer NOT NULL,
    dia_semana text NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    es_automatico boolean DEFAULT true,
    creado_por integer,
    fecha_creacion timestamp with time zone DEFAULT now(),
    CONSTRAINT horario_laboratorios_dia_semana_check CHECK ((dia_semana = ANY (ARRAY['Lunes'::text, 'Martes'::text, 'Miércoles'::text, 'Jueves'::text, 'Viernes'::text])))
);


--
-- Name: horario_laboratorios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.horario_laboratorios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: horario_laboratorios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.horario_laboratorios_id_seq OWNED BY public.horario_laboratorios.id;


--
-- Name: horario_maestros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.horario_maestros (
    id integer NOT NULL,
    docente_id integer NOT NULL,
    materia_grupo_id integer NOT NULL,
    dia_semana text NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    es_automatico boolean DEFAULT true,
    creado_por integer,
    fecha_creacion timestamp with time zone DEFAULT now(),
    CONSTRAINT horario_maestros_dia_semana_check CHECK ((dia_semana = ANY (ARRAY['Lunes'::text, 'Martes'::text, 'Miércoles'::text, 'Jueves'::text, 'Viernes'::text])))
);


--
-- Name: horario_maestros_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.horario_maestros_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: horario_maestros_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.horario_maestros_id_seq OWNED BY public.horario_maestros.id;


--
-- Name: horarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.horarios (
    id integer NOT NULL,
    materia_grupo_id integer NOT NULL,
    aula_id integer,
    dia_semana smallint NOT NULL,
    periodo_id integer NOT NULL,
    ciclo_id integer NOT NULL,
    CONSTRAINT horarios_dia_semana_check CHECK (((dia_semana >= 1) AND (dia_semana <= 5)))
);


--
-- Name: horarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.horarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: horarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.horarios_id_seq OWNED BY public.horarios.id;


--
-- Name: incidencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incidencias (
    id integer NOT NULL,
    alumno_id integer NOT NULL,
    ciclo_id integer NOT NULL,
    tipo character varying(30) NOT NULL,
    descripcion text NOT NULL,
    registrado_por integer NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    resuelta boolean DEFAULT false,
    resolucion text,
    subtipo character varying(50),
    CONSTRAINT incidencias_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['conducta'::character varying, 'academica'::character varying, 'asistencia'::character varying, 'citatorio_tutor'::character varying, 'felicitacion'::character varying, 'otro'::character varying])::text[])))
);


--
-- Name: incidencias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.incidencias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: incidencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.incidencias_id_seq OWNED BY public.incidencias.id;


--
-- Name: materias_catalogo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materias_catalogo (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    clave character varying(20),
    semestre smallint NOT NULL,
    tipo character varying(25) NOT NULL,
    especialidad_id integer,
    modulo_numero smallint,
    submodulo_numero smallint,
    horas_semana smallint DEFAULT 3,
    activa boolean DEFAULT true,
    CONSTRAINT materias_catalogo_modulo_numero_check CHECK (((modulo_numero >= 1) AND (modulo_numero <= 5))),
    CONSTRAINT materias_catalogo_semestre_check CHECK (((semestre >= 1) AND (semestre <= 6))),
    CONSTRAINT materias_catalogo_submodulo_numero_check CHECK (((submodulo_numero >= 1) AND (submodulo_numero <= 2))),
    CONSTRAINT materias_catalogo_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['troncal_general'::character varying, 'troncal_especialidad'::character varying, 'modulo'::character varying])::text[])))
);


--
-- Name: materias_catalogo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.materias_catalogo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: materias_catalogo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.materias_catalogo_id_seq OWNED BY public.materias_catalogo.id;


--
-- Name: materias_grupo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materias_grupo (
    id integer NOT NULL,
    grupo_id integer NOT NULL,
    materia_catalogo_id integer NOT NULL,
    docente_id integer,
    ciclo_id integer NOT NULL,
    activa boolean DEFAULT true
);


--
-- Name: materias_grupo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.materias_grupo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: materias_grupo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.materias_grupo_id_seq OWNED BY public.materias_grupo.id;


--
-- Name: pagos_alumno; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagos_alumno (
    id integer NOT NULL,
    alumno_id integer NOT NULL,
    concepto_id integer NOT NULL,
    ciclo_id integer,
    monto numeric(8,2) NOT NULL,
    fecha_pago date DEFAULT CURRENT_DATE NOT NULL,
    folio_recibo character varying(50),
    registrado_por integer NOT NULL,
    observaciones text
);


--
-- Name: pagos_alumno_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pagos_alumno_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagos_alumno_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pagos_alumno_id_seq OWNED BY public.pagos_alumno.id;


--
-- Name: periodos_dia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.periodos_dia (
    id integer NOT NULL,
    turno_id integer NOT NULL,
    numero smallint NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL
);


--
-- Name: periodos_dia_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.periodos_dia_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: periodos_dia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.periodos_dia_id_seq OWNED BY public.periodos_dia.id;


--
-- Name: periodos_escolares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.periodos_escolares (
    id integer NOT NULL,
    ciclo_id integer NOT NULL,
    semestre smallint,
    tipo character varying(30) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    activo boolean DEFAULT true,
    CONSTRAINT periodos_escolares_semestre_check CHECK (((semestre >= 1) AND (semestre <= 6))),
    CONSTRAINT periodos_escolares_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['preinscripcion'::character varying, 'inscripcion_nuevo_ingreso'::character varying, 'reinscripcion'::character varying, 'inicio_semestre'::character varying, 'fin_semestre'::character varying, 'evaluaciones_parciales'::character varying, 'evaluacion_recuperacion'::character varying, 'evaluacion_extraordinaria'::character varying, 'curso_intersemestral'::character varying])::text[])))
);


--
-- Name: periodos_escolares_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.periodos_escolares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: periodos_escolares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.periodos_escolares_id_seq OWNED BY public.periodos_escolares.id;


--
-- Name: periodos_evaluacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.periodos_evaluacion (
    id integer NOT NULL,
    ciclo_id integer NOT NULL,
    parcial integer NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    activo boolean DEFAULT true,
    tipo character varying(20) DEFAULT 'parcial'::character varying,
    CONSTRAINT periodos_evaluacion_parcial_check CHECK ((parcial = ANY (ARRAY[1, 2, 3]))),
    CONSTRAINT periodos_evaluacion_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['parcial'::character varying, 'recuperacion'::character varying, 'extraordinario'::character varying])::text[])))
);


--
-- Name: periodos_evaluacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.periodos_evaluacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: periodos_evaluacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.periodos_evaluacion_id_seq OWNED BY public.periodos_evaluacion.id;


--
-- Name: permisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permisos (
    id integer NOT NULL,
    codigo character varying(60) NOT NULL,
    modulo character varying(40) NOT NULL,
    accion character varying(40) NOT NULL
);


--
-- Name: permisos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permisos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permisos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permisos_id_seq OWNED BY public.permisos.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nombre character varying(40) NOT NULL,
    descripcion text,
    hereda_de character varying(40),
    es_sistema boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: roles_permisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles_permisos (
    rol_id integer NOT NULL,
    permiso_id integer NOT NULL
);


--
-- Name: servicio_social_practicas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.servicio_social_practicas (
    id integer NOT NULL,
    alumno_id integer NOT NULL,
    tipo character varying(30) NOT NULL,
    institucion_empresa character varying(150) NOT NULL,
    asesor_externo character varying(150),
    horas_acumuladas smallint DEFAULT 0,
    estatus character varying(30) DEFAULT 'en_proceso'::character varying NOT NULL,
    fecha_inicio date,
    fecha_fin date,
    observaciones text,
    registrado_por integer,
    fecha_registro timestamp with time zone DEFAULT now(),
    tipo_institucion character varying(30),
    tiene_convenio boolean DEFAULT false,
    autorizacion_tutor boolean DEFAULT false,
    semestre_requerido smallint,
    CONSTRAINT servicio_social_practicas_estatus_check CHECK (((estatus)::text = ANY ((ARRAY['en_proceso'::character varying, 'liberado'::character varying, 'reprobado'::character varying])::text[]))),
    CONSTRAINT servicio_social_practicas_horas_acumuladas_check CHECK ((horas_acumuladas >= 0)),
    CONSTRAINT servicio_social_practicas_semestre_requerido_check CHECK (((semestre_requerido >= 1) AND (semestre_requerido <= 6))),
    CONSTRAINT servicio_social_practicas_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['servicio_social'::character varying, 'practicas_profesionales'::character varying])::text[]))),
    CONSTRAINT servicio_social_practicas_tipo_institucion_check CHECK (((tipo_institucion)::text = ANY ((ARRAY['gubernamental'::character varying, 'publica'::character varying, 'privada_convenio'::character varying])::text[])))
);


--
-- Name: servicio_social_practicas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.servicio_social_practicas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: servicio_social_practicas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.servicio_social_practicas_id_seq OWNED BY public.servicio_social_practicas.id;


--
-- Name: servicio_social_reportes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.servicio_social_reportes (
    id integer NOT NULL,
    servicio_social_id integer NOT NULL,
    numero integer NOT NULL,
    fecha_limite date,
    fecha_entrega date,
    entregado boolean DEFAULT false,
    observaciones text,
    CONSTRAINT servicio_social_reportes_numero_check CHECK (((numero >= 1) AND (numero <= 4)))
);


--
-- Name: servicio_social_reportes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.servicio_social_reportes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: servicio_social_reportes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.servicio_social_reportes_id_seq OWNED BY public.servicio_social_reportes.id;


--
-- Name: titulacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.titulacion (
    id integer NOT NULL,
    alumno_id integer NOT NULL,
    opcion_titulacion character varying(100) NOT NULL,
    estatus character varying(30) DEFAULT 'en_proceso'::character varying NOT NULL,
    fecha_examen date,
    numero_titulo character varying(50),
    cedula_profesional character varying(50),
    observaciones text,
    autorizado_por integer,
    fecha_registro timestamp with time zone DEFAULT now(),
    CONSTRAINT titulacion_estatus_check CHECK (((estatus)::text = ANY ((ARRAY['en_proceso'::character varying, 'tramite'::character varying, 'titulado'::character varying])::text[])))
);


--
-- Name: titulacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.titulacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: titulacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.titulacion_id_seq OWNED BY public.titulacion.id;


--
-- Name: turnos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.turnos (
    id integer NOT NULL,
    nombre character varying(20) NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL
);


--
-- Name: turnos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.turnos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: turnos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.turnos_id_seq OWNED BY public.turnos.id;


--
-- Name: tutorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tutorias (
    id integer NOT NULL,
    tutor_id integer NOT NULL,
    grupo_id integer NOT NULL,
    ciclo_id integer NOT NULL,
    fecha date NOT NULL,
    tema character varying(200),
    observaciones text,
    fecha_registro timestamp with time zone DEFAULT now()
);


--
-- Name: tutorias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tutorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tutorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tutorias_id_seq OWNED BY public.tutorias.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    apellidos character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol character varying(20) NOT NULL,
    telefono character varying(20),
    activo boolean DEFAULT true,
    fecha_registro timestamp with time zone DEFAULT now(),
    rol_id integer,
    CONSTRAINT usuarios_rol_check CHECK (((rol)::text = ANY ((ARRAY['alumno'::character varying, 'docente'::character varying, 'administrador'::character varying])::text[])))
);


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: v_promedios_periodo; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_promedios_periodo AS
 SELECT alumno_id,
    ciclo_id,
    parcial,
    round(avg(calificacion), 2) AS promedio_parcial
   FROM public.calificaciones c
  WHERE ((tipo_evaluacion)::text = 'ordinaria'::text)
  GROUP BY alumno_id, ciclo_id, parcial;


--
-- Name: alumnos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumnos ALTER COLUMN id SET DEFAULT nextval('public.alumnos_id_seq'::regclass);


--
-- Name: asistencia_clase id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencia_clase ALTER COLUMN id SET DEFAULT nextval('public.asistencia_clase_id_seq'::regclass);


--
-- Name: asistencia_diaria id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencia_diaria ALTER COLUMN id SET DEFAULT nextval('public.asistencia_diaria_id_seq'::regclass);


--
-- Name: aspirantes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aspirantes ALTER COLUMN id SET DEFAULT nextval('public.aspirantes_id_seq'::regclass);


--
-- Name: auditoria_calificaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_calificaciones ALTER COLUMN id SET DEFAULT nextval('public.auditoria_calificaciones_id_seq'::regclass);


--
-- Name: auditoria_inscripciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_inscripciones ALTER COLUMN id SET DEFAULT nextval('public.auditoria_inscripciones_id_seq'::regclass);


--
-- Name: auditoria_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_logs ALTER COLUMN id SET DEFAULT nextval('public.auditoria_logs_id_seq'::regclass);


--
-- Name: aulas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aulas ALTER COLUMN id SET DEFAULT nextval('public.aulas_id_seq'::regclass);


--
-- Name: becas_alumnos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.becas_alumnos ALTER COLUMN id SET DEFAULT nextval('public.becas_alumnos_id_seq'::regclass);


--
-- Name: calificaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones ALTER COLUMN id SET DEFAULT nextval('public.calificaciones_id_seq'::regclass);


--
-- Name: cambios_grupo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cambios_grupo ALTER COLUMN id SET DEFAULT nextval('public.cambios_grupo_id_seq'::regclass);


--
-- Name: catalogo_documentos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogo_documentos ALTER COLUMN id SET DEFAULT nextval('public.catalogo_documentos_id_seq'::regclass);


--
-- Name: ciclos_escolares id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ciclos_escolares ALTER COLUMN id SET DEFAULT nextval('public.ciclos_escolares_id_seq'::regclass);


--
-- Name: comunicados id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicados ALTER COLUMN id SET DEFAULT nextval('public.comunicados_id_seq'::regclass);


--
-- Name: conceptos_pago id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conceptos_pago ALTER COLUMN id SET DEFAULT nextval('public.conceptos_pago_id_seq'::regclass);


--
-- Name: configuracion_horarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_horarios ALTER COLUMN id SET DEFAULT nextval('public.configuracion_horarios_id_seq'::regclass);


--
-- Name: constancias_excelencia id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constancias_excelencia ALTER COLUMN id SET DEFAULT nextval('public.constancias_excelencia_id_seq'::regclass);


--
-- Name: edificios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edificios ALTER COLUMN id SET DEFAULT nextval('public.edificios_id_seq'::regclass);


--
-- Name: especialidades id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.especialidades ALTER COLUMN id SET DEFAULT nextval('public.especialidades_id_seq'::regclass);


--
-- Name: expediente_documentos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expediente_documentos ALTER COLUMN id SET DEFAULT nextval('public.expediente_documentos_id_seq'::regclass);


--
-- Name: grupos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos ALTER COLUMN id SET DEFAULT nextval('public.grupos_id_seq'::regclass);


--
-- Name: historial_grupos_alumno id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_grupos_alumno ALTER COLUMN id SET DEFAULT nextval('public.historial_grupos_alumno_id_seq'::regclass);


--
-- Name: horario_archivos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_archivos ALTER COLUMN id SET DEFAULT nextval('public.horario_archivos_id_seq'::regclass);


--
-- Name: horario_grupos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_grupos ALTER COLUMN id SET DEFAULT nextval('public.horario_grupos_id_seq'::regclass);


--
-- Name: horario_laboratorios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_laboratorios ALTER COLUMN id SET DEFAULT nextval('public.horario_laboratorios_id_seq'::regclass);


--
-- Name: horario_maestros id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_maestros ALTER COLUMN id SET DEFAULT nextval('public.horario_maestros_id_seq'::regclass);


--
-- Name: horarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios ALTER COLUMN id SET DEFAULT nextval('public.horarios_id_seq'::regclass);


--
-- Name: incidencias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidencias ALTER COLUMN id SET DEFAULT nextval('public.incidencias_id_seq'::regclass);


--
-- Name: materias_catalogo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materias_catalogo ALTER COLUMN id SET DEFAULT nextval('public.materias_catalogo_id_seq'::regclass);


--
-- Name: materias_grupo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materias_grupo ALTER COLUMN id SET DEFAULT nextval('public.materias_grupo_id_seq'::regclass);


--
-- Name: pagos_alumno id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_alumno ALTER COLUMN id SET DEFAULT nextval('public.pagos_alumno_id_seq'::regclass);


--
-- Name: periodos_dia id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_dia ALTER COLUMN id SET DEFAULT nextval('public.periodos_dia_id_seq'::regclass);


--
-- Name: periodos_escolares id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_escolares ALTER COLUMN id SET DEFAULT nextval('public.periodos_escolares_id_seq'::regclass);


--
-- Name: periodos_evaluacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_evaluacion ALTER COLUMN id SET DEFAULT nextval('public.periodos_evaluacion_id_seq'::regclass);


--
-- Name: permisos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos ALTER COLUMN id SET DEFAULT nextval('public.permisos_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: servicio_social_practicas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicio_social_practicas ALTER COLUMN id SET DEFAULT nextval('public.servicio_social_practicas_id_seq'::regclass);


--
-- Name: servicio_social_reportes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicio_social_reportes ALTER COLUMN id SET DEFAULT nextval('public.servicio_social_reportes_id_seq'::regclass);


--
-- Name: titulacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titulacion ALTER COLUMN id SET DEFAULT nextval('public.titulacion_id_seq'::regclass);


--
-- Name: turnos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos ALTER COLUMN id SET DEFAULT nextval('public.turnos_id_seq'::regclass);


--
-- Name: tutorias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutorias ALTER COLUMN id SET DEFAULT nextval('public.tutorias_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: alumnos alumnos_curp_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumnos
    ADD CONSTRAINT alumnos_curp_key UNIQUE (curp);


--
-- Name: alumnos alumnos_matricula_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumnos
    ADD CONSTRAINT alumnos_matricula_key UNIQUE (matricula);


--
-- Name: alumnos alumnos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumnos
    ADD CONSTRAINT alumnos_pkey PRIMARY KEY (id);


--
-- Name: alumnos alumnos_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumnos
    ADD CONSTRAINT alumnos_usuario_id_key UNIQUE (usuario_id);


--
-- Name: asistencia_clase asistencia_clase_alumno_id_materia_grupo_id_fecha_periodo_n_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencia_clase
    ADD CONSTRAINT asistencia_clase_alumno_id_materia_grupo_id_fecha_periodo_n_key UNIQUE (alumno_id, materia_grupo_id, fecha, periodo_numero);


--
-- Name: asistencia_clase asistencia_clase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencia_clase
    ADD CONSTRAINT asistencia_clase_pkey PRIMARY KEY (id);


--
-- Name: asistencia_diaria asistencia_diaria_alumno_id_fecha_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencia_diaria
    ADD CONSTRAINT asistencia_diaria_alumno_id_fecha_key UNIQUE (alumno_id, fecha);


--
-- Name: asistencia_diaria asistencia_diaria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencia_diaria
    ADD CONSTRAINT asistencia_diaria_pkey PRIMARY KEY (id);


--
-- Name: aspirantes aspirantes_curp_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aspirantes
    ADD CONSTRAINT aspirantes_curp_key UNIQUE (curp);


--
-- Name: aspirantes aspirantes_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aspirantes
    ADD CONSTRAINT aspirantes_email_key UNIQUE (email);


--
-- Name: aspirantes aspirantes_folio_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aspirantes
    ADD CONSTRAINT aspirantes_folio_key UNIQUE (folio);


--
-- Name: aspirantes aspirantes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aspirantes
    ADD CONSTRAINT aspirantes_pkey PRIMARY KEY (id);


--
-- Name: auditoria_calificaciones auditoria_calificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_calificaciones
    ADD CONSTRAINT auditoria_calificaciones_pkey PRIMARY KEY (id);


--
-- Name: auditoria_inscripciones auditoria_inscripciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_inscripciones
    ADD CONSTRAINT auditoria_inscripciones_pkey PRIMARY KEY (id);


--
-- Name: auditoria_logs auditoria_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_logs
    ADD CONSTRAINT auditoria_logs_pkey PRIMARY KEY (id);


--
-- Name: aulas aulas_edificio_id_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aulas
    ADD CONSTRAINT aulas_edificio_id_nombre_key UNIQUE (edificio_id, nombre);


--
-- Name: aulas aulas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aulas
    ADD CONSTRAINT aulas_pkey PRIMARY KEY (id);


--
-- Name: becas_alumnos becas_alumnos_alumno_id_ciclo_id_nombre_beca_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.becas_alumnos
    ADD CONSTRAINT becas_alumnos_alumno_id_ciclo_id_nombre_beca_key UNIQUE (alumno_id, ciclo_id, nombre_beca);


--
-- Name: becas_alumnos becas_alumnos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.becas_alumnos
    ADD CONSTRAINT becas_alumnos_pkey PRIMARY KEY (id);


--
-- Name: calificaciones calificaciones_alumno_id_materia_grupo_id_ciclo_id_parcial_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_alumno_id_materia_grupo_id_ciclo_id_parcial_key UNIQUE (alumno_id, materia_grupo_id, ciclo_id, parcial);


--
-- Name: calificaciones calificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_pkey PRIMARY KEY (id);


--
-- Name: cambios_grupo cambios_grupo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cambios_grupo
    ADD CONSTRAINT cambios_grupo_pkey PRIMARY KEY (id);


--
-- Name: catalogo_documentos catalogo_documentos_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogo_documentos
    ADD CONSTRAINT catalogo_documentos_clave_key UNIQUE (clave);


--
-- Name: catalogo_documentos catalogo_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogo_documentos
    ADD CONSTRAINT catalogo_documentos_pkey PRIMARY KEY (id);


--
-- Name: ciclos_escolares ciclos_escolares_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ciclos_escolares
    ADD CONSTRAINT ciclos_escolares_nombre_key UNIQUE (nombre);


--
-- Name: ciclos_escolares ciclos_escolares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ciclos_escolares
    ADD CONSTRAINT ciclos_escolares_pkey PRIMARY KEY (id);


--
-- Name: comunicados comunicados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicados
    ADD CONSTRAINT comunicados_pkey PRIMARY KEY (id);


--
-- Name: conceptos_pago conceptos_pago_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conceptos_pago
    ADD CONSTRAINT conceptos_pago_nombre_unique UNIQUE (nombre);


--
-- Name: conceptos_pago conceptos_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conceptos_pago
    ADD CONSTRAINT conceptos_pago_pkey PRIMARY KEY (id);


--
-- Name: configuracion_horarios configuracion_horarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_horarios
    ADD CONSTRAINT configuracion_horarios_pkey PRIMARY KEY (id);


--
-- Name: constancias_excelencia constancias_excelencia_alumno_id_ciclo_id_semestre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constancias_excelencia
    ADD CONSTRAINT constancias_excelencia_alumno_id_ciclo_id_semestre_key UNIQUE (alumno_id, ciclo_id, semestre);


--
-- Name: constancias_excelencia constancias_excelencia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constancias_excelencia
    ADD CONSTRAINT constancias_excelencia_pkey PRIMARY KEY (id);


--
-- Name: edificios edificios_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edificios
    ADD CONSTRAINT edificios_clave_key UNIQUE (clave);


--
-- Name: edificios edificios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edificios
    ADD CONSTRAINT edificios_pkey PRIMARY KEY (id);


--
-- Name: especialidades especialidades_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.especialidades
    ADD CONSTRAINT especialidades_clave_key UNIQUE (clave);


--
-- Name: especialidades especialidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.especialidades
    ADD CONSTRAINT especialidades_pkey PRIMARY KEY (id);


--
-- Name: expediente_documentos expediente_documentos_alumno_id_documento_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expediente_documentos
    ADD CONSTRAINT expediente_documentos_alumno_id_documento_id_key UNIQUE (alumno_id, documento_id);


--
-- Name: expediente_documentos expediente_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expediente_documentos
    ADD CONSTRAINT expediente_documentos_pkey PRIMARY KEY (id);


--
-- Name: grupos grupos_ciclo_id_semestre_letra_turno_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_ciclo_id_semestre_letra_turno_id_key UNIQUE (ciclo_id, semestre, letra, turno_id);


--
-- Name: grupos grupos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_pkey PRIMARY KEY (id);


--
-- Name: historial_grupos_alumno historial_grupos_alumno_alumno_id_ciclo_id_semestre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_grupos_alumno
    ADD CONSTRAINT historial_grupos_alumno_alumno_id_ciclo_id_semestre_key UNIQUE (alumno_id, ciclo_id, semestre);


--
-- Name: historial_grupos_alumno historial_grupos_alumno_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_grupos_alumno
    ADD CONSTRAINT historial_grupos_alumno_pkey PRIMARY KEY (id);


--
-- Name: horario_archivos horario_archivos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_archivos
    ADD CONSTRAINT horario_archivos_pkey PRIMARY KEY (id);


--
-- Name: horario_grupos horario_grupos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_grupos
    ADD CONSTRAINT horario_grupos_pkey PRIMARY KEY (id);


--
-- Name: horario_laboratorios horario_laboratorios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_laboratorios
    ADD CONSTRAINT horario_laboratorios_pkey PRIMARY KEY (id);


--
-- Name: horario_maestros horario_maestros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_maestros
    ADD CONSTRAINT horario_maestros_pkey PRIMARY KEY (id);


--
-- Name: horarios horarios_aula_id_dia_semana_periodo_id_ciclo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_aula_id_dia_semana_periodo_id_ciclo_id_key UNIQUE (aula_id, dia_semana, periodo_id, ciclo_id);


--
-- Name: horarios horarios_materia_grupo_id_dia_semana_periodo_id_ciclo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_materia_grupo_id_dia_semana_periodo_id_ciclo_id_key UNIQUE (materia_grupo_id, dia_semana, periodo_id, ciclo_id);


--
-- Name: horarios horarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_pkey PRIMARY KEY (id);


--
-- Name: incidencias incidencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidencias
    ADD CONSTRAINT incidencias_pkey PRIMARY KEY (id);


--
-- Name: materias_catalogo materias_catalogo_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materias_catalogo
    ADD CONSTRAINT materias_catalogo_clave_key UNIQUE (clave);


--
-- Name: materias_catalogo materias_catalogo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materias_catalogo
    ADD CONSTRAINT materias_catalogo_pkey PRIMARY KEY (id);


--
-- Name: materias_grupo materias_grupo_grupo_id_materia_catalogo_id_ciclo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materias_grupo
    ADD CONSTRAINT materias_grupo_grupo_id_materia_catalogo_id_ciclo_id_key UNIQUE (grupo_id, materia_catalogo_id, ciclo_id);


--
-- Name: materias_grupo materias_grupo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materias_grupo
    ADD CONSTRAINT materias_grupo_pkey PRIMARY KEY (id);


--
-- Name: pagos_alumno pagos_alumno_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_alumno
    ADD CONSTRAINT pagos_alumno_pkey PRIMARY KEY (id);


--
-- Name: periodos_dia periodos_dia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_dia
    ADD CONSTRAINT periodos_dia_pkey PRIMARY KEY (id);


--
-- Name: periodos_dia periodos_dia_turno_id_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_dia
    ADD CONSTRAINT periodos_dia_turno_id_numero_key UNIQUE (turno_id, numero);


--
-- Name: periodos_escolares periodos_escolares_ciclo_id_semestre_tipo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_escolares
    ADD CONSTRAINT periodos_escolares_ciclo_id_semestre_tipo_key UNIQUE (ciclo_id, semestre, tipo);


--
-- Name: periodos_escolares periodos_escolares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_escolares
    ADD CONSTRAINT periodos_escolares_pkey PRIMARY KEY (id);


--
-- Name: periodos_evaluacion periodos_evaluacion_ciclo_id_parcial_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_evaluacion
    ADD CONSTRAINT periodos_evaluacion_ciclo_id_parcial_key UNIQUE (ciclo_id, parcial);


--
-- Name: periodos_evaluacion periodos_evaluacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_evaluacion
    ADD CONSTRAINT periodos_evaluacion_pkey PRIMARY KEY (id);


--
-- Name: permisos permisos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_codigo_key UNIQUE (codigo);


--
-- Name: permisos permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (id);


--
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- Name: roles_permisos roles_permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_permisos
    ADD CONSTRAINT roles_permisos_pkey PRIMARY KEY (rol_id, permiso_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: servicio_social_practicas servicio_social_practicas_alumno_id_tipo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicio_social_practicas
    ADD CONSTRAINT servicio_social_practicas_alumno_id_tipo_key UNIQUE (alumno_id, tipo);


--
-- Name: servicio_social_practicas servicio_social_practicas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicio_social_practicas
    ADD CONSTRAINT servicio_social_practicas_pkey PRIMARY KEY (id);


--
-- Name: servicio_social_reportes servicio_social_reportes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicio_social_reportes
    ADD CONSTRAINT servicio_social_reportes_pkey PRIMARY KEY (id);


--
-- Name: servicio_social_reportes servicio_social_reportes_servicio_social_id_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicio_social_reportes
    ADD CONSTRAINT servicio_social_reportes_servicio_social_id_numero_key UNIQUE (servicio_social_id, numero);


--
-- Name: titulacion titulacion_alumno_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titulacion
    ADD CONSTRAINT titulacion_alumno_id_key UNIQUE (alumno_id);


--
-- Name: titulacion titulacion_cedula_profesional_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titulacion
    ADD CONSTRAINT titulacion_cedula_profesional_key UNIQUE (cedula_profesional);


--
-- Name: titulacion titulacion_numero_titulo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titulacion
    ADD CONSTRAINT titulacion_numero_titulo_key UNIQUE (numero_titulo);


--
-- Name: titulacion titulacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titulacion
    ADD CONSTRAINT titulacion_pkey PRIMARY KEY (id);


--
-- Name: turnos turnos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos
    ADD CONSTRAINT turnos_nombre_key UNIQUE (nombre);


--
-- Name: turnos turnos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos
    ADD CONSTRAINT turnos_pkey PRIMARY KEY (id);


--
-- Name: tutorias tutorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutorias
    ADD CONSTRAINT tutorias_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_alumnos_especialidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alumnos_especialidad ON public.alumnos USING btree (especialidad_id);


--
-- Name: idx_alumnos_grupo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alumnos_grupo ON public.alumnos USING btree (grupo_actual_id);


--
-- Name: idx_alumnos_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alumnos_usuario ON public.alumnos USING btree (usuario_id);


--
-- Name: idx_asist_clase_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asist_clase_alumno ON public.asistencia_clase USING btree (alumno_id);


--
-- Name: idx_asist_clase_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asist_clase_fecha ON public.asistencia_clase USING btree (fecha);


--
-- Name: idx_asist_clase_materia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asist_clase_materia ON public.asistencia_clase USING btree (materia_grupo_id);


--
-- Name: idx_asist_diaria_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asist_diaria_alumno ON public.asistencia_diaria USING btree (alumno_id);


--
-- Name: idx_asist_diaria_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asist_diaria_fecha ON public.asistencia_diaria USING btree (fecha);


--
-- Name: idx_aspirantes_ciclo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aspirantes_ciclo ON public.aspirantes USING btree (ciclo_id);


--
-- Name: idx_aspirantes_curp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aspirantes_curp ON public.aspirantes USING btree (curp);


--
-- Name: idx_auditoria_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_alumno ON public.auditoria_inscripciones USING btree (alumno_id);


--
-- Name: idx_auditoria_calif; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_calif ON public.auditoria_calificaciones USING btree (calificacion_id);


--
-- Name: idx_auditoria_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_fecha ON public.auditoria_inscripciones USING btree (fecha DESC);


--
-- Name: idx_auditoria_tabla; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_tabla ON public.auditoria_logs USING btree (tabla_afectada);


--
-- Name: idx_auditoria_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_usuario ON public.auditoria_logs USING btree (usuario_id);


--
-- Name: idx_becas_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_becas_alumno ON public.becas_alumnos USING btree (alumno_id);


--
-- Name: idx_becas_ciclo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_becas_ciclo ON public.becas_alumnos USING btree (ciclo_id);


--
-- Name: idx_califs_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_califs_alumno ON public.calificaciones USING btree (alumno_id);


--
-- Name: idx_califs_ciclo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_califs_ciclo ON public.calificaciones USING btree (ciclo_id);


--
-- Name: idx_califs_materia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_califs_materia ON public.calificaciones USING btree (materia_grupo_id);


--
-- Name: idx_comunicados_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comunicados_fecha ON public.comunicados USING btree (fecha_publicacion DESC);


--
-- Name: idx_constancias_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_constancias_alumno ON public.constancias_excelencia USING btree (alumno_id);


--
-- Name: idx_expediente_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expediente_alumno ON public.expediente_documentos USING btree (alumno_id);


--
-- Name: idx_grupos_ciclo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grupos_ciclo ON public.grupos USING btree (ciclo_id);


--
-- Name: idx_grupos_tutor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grupos_tutor ON public.grupos USING btree (tutor_id);


--
-- Name: idx_historial_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historial_alumno ON public.historial_grupos_alumno USING btree (alumno_id);


--
-- Name: idx_horario_archivos_ciclo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_horario_archivos_ciclo ON public.horario_archivos USING btree (ciclo_id);


--
-- Name: idx_horario_archivos_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_horario_archivos_fecha ON public.horario_archivos USING btree (fecha DESC);


--
-- Name: idx_horario_archivos_grupo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_horario_archivos_grupo ON public.horario_archivos USING btree (grupo_id);


--
-- Name: idx_horario_archivos_semestre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_horario_archivos_semestre ON public.horario_archivos USING btree (semestre);


--
-- Name: idx_horario_archivos_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_horario_archivos_tipo ON public.horario_archivos USING btree (tipo_horario);


--
-- Name: idx_horarios_ciclo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_horarios_ciclo ON public.horarios USING btree (ciclo_id);


--
-- Name: idx_horarios_materia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_horarios_materia ON public.horarios USING btree (materia_grupo_id);


--
-- Name: idx_incidencias_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidencias_alumno ON public.incidencias USING btree (alumno_id);


--
-- Name: idx_mat_grupo_ciclo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mat_grupo_ciclo ON public.materias_grupo USING btree (ciclo_id);


--
-- Name: idx_mat_grupo_docente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mat_grupo_docente ON public.materias_grupo USING btree (docente_id);


--
-- Name: idx_mat_grupo_grupo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mat_grupo_grupo ON public.materias_grupo USING btree (grupo_id);


--
-- Name: idx_pagos_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagos_alumno ON public.pagos_alumno USING btree (alumno_id);


--
-- Name: idx_periodos_ciclo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_periodos_ciclo ON public.periodos_evaluacion USING btree (ciclo_id);


--
-- Name: idx_periodos_fechas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_periodos_fechas ON public.periodos_evaluacion USING btree (fecha_inicio, fecha_fin);


--
-- Name: idx_periodos_parcial; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_periodos_parcial ON public.periodos_evaluacion USING btree (parcial);


--
-- Name: idx_servicio_social_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_servicio_social_alumno ON public.servicio_social_practicas USING btree (alumno_id);


--
-- Name: idx_ss_reportes_ss_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ss_reportes_ss_id ON public.servicio_social_reportes USING btree (servicio_social_id);


--
-- Name: idx_titulacion_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_titulacion_alumno ON public.titulacion USING btree (alumno_id);


--
-- Name: un_ciclo_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX un_ciclo_activo ON public.ciclos_escolares USING btree (activo) WHERE (activo = true);


--
-- Name: horarios trg_verificar_horario_docente; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_verificar_horario_docente BEFORE INSERT OR UPDATE ON public.horarios FOR EACH ROW EXECUTE FUNCTION public.verificar_conflicto_horario_docente();


--
-- Name: ciclos_escolares trigger_generar_periodos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generar_periodos AFTER INSERT ON public.ciclos_escolares FOR EACH ROW EXECUTE FUNCTION public.generar_periodos_ciclo();


--
-- Name: alumnos alumnos_especialidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumnos
    ADD CONSTRAINT alumnos_especialidad_id_fkey FOREIGN KEY (especialidad_id) REFERENCES public.especialidades(id);


--
-- Name: alumnos alumnos_grupo_actual_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumnos
    ADD CONSTRAINT alumnos_grupo_actual_id_fkey FOREIGN KEY (grupo_actual_id) REFERENCES public.grupos(id);


--
-- Name: alumnos alumnos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumnos
    ADD CONSTRAINT alumnos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: asistencia_clase asistencia_clase_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencia_clase
    ADD CONSTRAINT asistencia_clase_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id);


--
-- Name: asistencia_clase asistencia_clase_materia_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencia_clase
    ADD CONSTRAINT asistencia_clase_materia_grupo_id_fkey FOREIGN KEY (materia_grupo_id) REFERENCES public.materias_grupo(id);


--
-- Name: asistencia_clase asistencia_clase_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencia_clase
    ADD CONSTRAINT asistencia_clase_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);


--
-- Name: asistencia_diaria asistencia_diaria_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencia_diaria
    ADD CONSTRAINT asistencia_diaria_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id);


--
-- Name: asistencia_diaria asistencia_diaria_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencia_diaria
    ADD CONSTRAINT asistencia_diaria_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);


--
-- Name: aspirantes aspirantes_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aspirantes
    ADD CONSTRAINT aspirantes_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_escolares(id);


--
-- Name: aspirantes aspirantes_especialidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aspirantes
    ADD CONSTRAINT aspirantes_especialidad_id_fkey FOREIGN KEY (especialidad_id) REFERENCES public.especialidades(id);


--
-- Name: aspirantes aspirantes_turno_preferido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aspirantes
    ADD CONSTRAINT aspirantes_turno_preferido_id_fkey FOREIGN KEY (turno_preferido_id) REFERENCES public.turnos(id);


--
-- Name: auditoria_calificaciones auditoria_calificaciones_calificacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_calificaciones
    ADD CONSTRAINT auditoria_calificaciones_calificacion_id_fkey FOREIGN KEY (calificacion_id) REFERENCES public.calificaciones(id);


--
-- Name: auditoria_calificaciones auditoria_calificaciones_modificado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_calificaciones
    ADD CONSTRAINT auditoria_calificaciones_modificado_por_fkey FOREIGN KEY (modificado_por) REFERENCES public.usuarios(id);


--
-- Name: auditoria_inscripciones auditoria_inscripciones_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_inscripciones
    ADD CONSTRAINT auditoria_inscripciones_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id) ON DELETE CASCADE;


--
-- Name: auditoria_inscripciones auditoria_inscripciones_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_inscripciones
    ADD CONSTRAINT auditoria_inscripciones_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE CASCADE;


--
-- Name: auditoria_inscripciones auditoria_inscripciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_inscripciones
    ADD CONSTRAINT auditoria_inscripciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: auditoria_logs auditoria_logs_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_logs
    ADD CONSTRAINT auditoria_logs_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: aulas aulas_edificio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aulas
    ADD CONSTRAINT aulas_edificio_id_fkey FOREIGN KEY (edificio_id) REFERENCES public.edificios(id);


--
-- Name: becas_alumnos becas_alumnos_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.becas_alumnos
    ADD CONSTRAINT becas_alumnos_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id);


--
-- Name: becas_alumnos becas_alumnos_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.becas_alumnos
    ADD CONSTRAINT becas_alumnos_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_escolares(id);


--
-- Name: calificaciones calificaciones_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id);


--
-- Name: calificaciones calificaciones_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_escolares(id);


--
-- Name: calificaciones calificaciones_materia_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_materia_grupo_id_fkey FOREIGN KEY (materia_grupo_id) REFERENCES public.materias_grupo(id);


--
-- Name: calificaciones calificaciones_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);


--
-- Name: cambios_grupo cambios_grupo_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cambios_grupo
    ADD CONSTRAINT cambios_grupo_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id);


--
-- Name: cambios_grupo cambios_grupo_autorizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cambios_grupo
    ADD CONSTRAINT cambios_grupo_autorizado_por_fkey FOREIGN KEY (autorizado_por) REFERENCES public.usuarios(id);


--
-- Name: cambios_grupo cambios_grupo_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cambios_grupo
    ADD CONSTRAINT cambios_grupo_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_escolares(id);


--
-- Name: cambios_grupo cambios_grupo_grupo_destino_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cambios_grupo
    ADD CONSTRAINT cambios_grupo_grupo_destino_id_fkey FOREIGN KEY (grupo_destino_id) REFERENCES public.grupos(id);


--
-- Name: cambios_grupo cambios_grupo_grupo_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cambios_grupo
    ADD CONSTRAINT cambios_grupo_grupo_origen_id_fkey FOREIGN KEY (grupo_origen_id) REFERENCES public.grupos(id);


--
-- Name: comunicados comunicados_autor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicados
    ADD CONSTRAINT comunicados_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES public.usuarios(id);


--
-- Name: comunicados comunicados_dirigido_a_grupo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicados
    ADD CONSTRAINT comunicados_dirigido_a_grupo_fkey FOREIGN KEY (dirigido_a_grupo) REFERENCES public.grupos(id);


--
-- Name: constancias_excelencia constancias_excelencia_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constancias_excelencia
    ADD CONSTRAINT constancias_excelencia_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id);


--
-- Name: constancias_excelencia constancias_excelencia_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constancias_excelencia
    ADD CONSTRAINT constancias_excelencia_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_escolares(id);


--
-- Name: constancias_excelencia constancias_excelencia_generada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constancias_excelencia
    ADD CONSTRAINT constancias_excelencia_generada_por_fkey FOREIGN KEY (generada_por) REFERENCES public.usuarios(id);


--
-- Name: expediente_documentos expediente_documentos_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expediente_documentos
    ADD CONSTRAINT expediente_documentos_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id);


--
-- Name: expediente_documentos expediente_documentos_documento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expediente_documentos
    ADD CONSTRAINT expediente_documentos_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES public.catalogo_documentos(id);


--
-- Name: expediente_documentos expediente_documentos_recibido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expediente_documentos
    ADD CONSTRAINT expediente_documentos_recibido_por_fkey FOREIGN KEY (recibido_por) REFERENCES public.usuarios(id);


--
-- Name: grupos grupos_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_escolares(id);


--
-- Name: grupos grupos_especialidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_especialidad_id_fkey FOREIGN KEY (especialidad_id) REFERENCES public.especialidades(id);


--
-- Name: grupos grupos_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos(id);


--
-- Name: grupos grupos_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.usuarios(id);


--
-- Name: historial_grupos_alumno historial_grupos_alumno_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_grupos_alumno
    ADD CONSTRAINT historial_grupos_alumno_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id);


--
-- Name: historial_grupos_alumno historial_grupos_alumno_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_grupos_alumno
    ADD CONSTRAINT historial_grupos_alumno_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_escolares(id);


--
-- Name: historial_grupos_alumno historial_grupos_alumno_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_grupos_alumno
    ADD CONSTRAINT historial_grupos_alumno_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id);


--
-- Name: horario_archivos horario_archivos_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_archivos
    ADD CONSTRAINT horario_archivos_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_escolares(id);


--
-- Name: horario_archivos horario_archivos_docente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_archivos
    ADD CONSTRAINT horario_archivos_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES public.usuarios(id);


--
-- Name: horario_archivos horario_archivos_especialidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_archivos
    ADD CONSTRAINT horario_archivos_especialidad_id_fkey FOREIGN KEY (especialidad_id) REFERENCES public.especialidades(id);


--
-- Name: horario_archivos horario_archivos_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_archivos
    ADD CONSTRAINT horario_archivos_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE SET NULL;


--
-- Name: horario_archivos horario_archivos_laboratorio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_archivos
    ADD CONSTRAINT horario_archivos_laboratorio_id_fkey FOREIGN KEY (laboratorio_id) REFERENCES public.aulas(id);


--
-- Name: horario_archivos horario_archivos_subido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_archivos
    ADD CONSTRAINT horario_archivos_subido_por_fkey FOREIGN KEY (subido_por) REFERENCES public.usuarios(id);


--
-- Name: horario_archivos horario_archivos_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_archivos
    ADD CONSTRAINT horario_archivos_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos(id);


--
-- Name: horario_grupos horario_grupos_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_grupos
    ADD CONSTRAINT horario_grupos_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: horario_grupos horario_grupos_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_grupos
    ADD CONSTRAINT horario_grupos_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE CASCADE;


--
-- Name: horario_grupos horario_grupos_materia_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_grupos
    ADD CONSTRAINT horario_grupos_materia_grupo_id_fkey FOREIGN KEY (materia_grupo_id) REFERENCES public.materias_grupo(id) ON DELETE CASCADE;


--
-- Name: horario_laboratorios horario_laboratorios_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_laboratorios
    ADD CONSTRAINT horario_laboratorios_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: horario_laboratorios horario_laboratorios_laboratorio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_laboratorios
    ADD CONSTRAINT horario_laboratorios_laboratorio_id_fkey FOREIGN KEY (laboratorio_id) REFERENCES public.aulas(id) ON DELETE CASCADE;


--
-- Name: horario_laboratorios horario_laboratorios_materia_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_laboratorios
    ADD CONSTRAINT horario_laboratorios_materia_grupo_id_fkey FOREIGN KEY (materia_grupo_id) REFERENCES public.materias_grupo(id) ON DELETE CASCADE;


--
-- Name: horario_maestros horario_maestros_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_maestros
    ADD CONSTRAINT horario_maestros_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: horario_maestros horario_maestros_docente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_maestros
    ADD CONSTRAINT horario_maestros_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: horario_maestros horario_maestros_materia_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horario_maestros
    ADD CONSTRAINT horario_maestros_materia_grupo_id_fkey FOREIGN KEY (materia_grupo_id) REFERENCES public.materias_grupo(id) ON DELETE CASCADE;


--
-- Name: horarios horarios_aula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_aula_id_fkey FOREIGN KEY (aula_id) REFERENCES public.aulas(id);


--
-- Name: horarios horarios_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_escolares(id);


--
-- Name: horarios horarios_materia_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_materia_grupo_id_fkey FOREIGN KEY (materia_grupo_id) REFERENCES public.materias_grupo(id);


--
-- Name: horarios horarios_periodo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_periodo_id_fkey FOREIGN KEY (periodo_id) REFERENCES public.periodos_dia(id);


--
-- Name: incidencias incidencias_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidencias
    ADD CONSTRAINT incidencias_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id);


--
-- Name: incidencias incidencias_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidencias
    ADD CONSTRAINT incidencias_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_escolares(id);


--
-- Name: incidencias incidencias_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidencias
    ADD CONSTRAINT incidencias_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);


--
-- Name: materias_catalogo materias_catalogo_especialidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materias_catalogo
    ADD CONSTRAINT materias_catalogo_especialidad_id_fkey FOREIGN KEY (especialidad_id) REFERENCES public.especialidades(id);


--
-- Name: materias_grupo materias_grupo_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materias_grupo
    ADD CONSTRAINT materias_grupo_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_escolares(id);


--
-- Name: materias_grupo materias_grupo_docente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materias_grupo
    ADD CONSTRAINT materias_grupo_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES public.usuarios(id);


--
-- Name: materias_grupo materias_grupo_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materias_grupo
    ADD CONSTRAINT materias_grupo_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id);


--
-- Name: materias_grupo materias_grupo_materia_catalogo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materias_grupo
    ADD CONSTRAINT materias_grupo_materia_catalogo_id_fkey FOREIGN KEY (materia_catalogo_id) REFERENCES public.materias_catalogo(id);


--
-- Name: pagos_alumno pagos_alumno_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_alumno
    ADD CONSTRAINT pagos_alumno_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id);


--
-- Name: pagos_alumno pagos_alumno_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_alumno
    ADD CONSTRAINT pagos_alumno_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_escolares(id);


--
-- Name: pagos_alumno pagos_alumno_concepto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_alumno
    ADD CONSTRAINT pagos_alumno_concepto_id_fkey FOREIGN KEY (concepto_id) REFERENCES public.conceptos_pago(id);


--
-- Name: pagos_alumno pagos_alumno_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_alumno
    ADD CONSTRAINT pagos_alumno_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);


--
-- Name: periodos_dia periodos_dia_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_dia
    ADD CONSTRAINT periodos_dia_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos(id);


--
-- Name: periodos_escolares periodos_escolares_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_escolares
    ADD CONSTRAINT periodos_escolares_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_escolares(id) ON DELETE CASCADE;


--
-- Name: periodos_evaluacion periodos_evaluacion_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_evaluacion
    ADD CONSTRAINT periodos_evaluacion_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_escolares(id) ON DELETE CASCADE;


--
-- Name: roles roles_hereda_de_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_hereda_de_fkey FOREIGN KEY (hereda_de) REFERENCES public.roles(nombre);


--
-- Name: roles_permisos roles_permisos_permiso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_permisos
    ADD CONSTRAINT roles_permisos_permiso_id_fkey FOREIGN KEY (permiso_id) REFERENCES public.permisos(id) ON DELETE CASCADE;


--
-- Name: roles_permisos roles_permisos_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_permisos
    ADD CONSTRAINT roles_permisos_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: servicio_social_practicas servicio_social_practicas_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicio_social_practicas
    ADD CONSTRAINT servicio_social_practicas_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id);


--
-- Name: servicio_social_practicas servicio_social_practicas_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicio_social_practicas
    ADD CONSTRAINT servicio_social_practicas_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);


--
-- Name: servicio_social_reportes servicio_social_reportes_servicio_social_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicio_social_reportes
    ADD CONSTRAINT servicio_social_reportes_servicio_social_id_fkey FOREIGN KEY (servicio_social_id) REFERENCES public.servicio_social_practicas(id) ON DELETE CASCADE;


--
-- Name: titulacion titulacion_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titulacion
    ADD CONSTRAINT titulacion_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id);


--
-- Name: titulacion titulacion_autorizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titulacion
    ADD CONSTRAINT titulacion_autorizado_por_fkey FOREIGN KEY (autorizado_por) REFERENCES public.usuarios(id);


--
-- Name: tutorias tutorias_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutorias
    ADD CONSTRAINT tutorias_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_escolares(id);


--
-- Name: tutorias tutorias_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutorias
    ADD CONSTRAINT tutorias_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id);


--
-- Name: tutorias tutorias_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutorias
    ADD CONSTRAINT tutorias_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.usuarios(id);


--
-- Name: usuarios usuarios_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

\unrestrict sxyELr8a15BleeURDvsXZQfadTB7t7PDpOWTIApNHAR8xRLpIIiQEwbVpGWIUS4

