-- ============================================================
-- MIGRACIÓN: Sistema de Roles y Permisos (RBAC)
-- ------------------------------------------------------------
-- Añade el modelo granular roles/permisos/roles_permisos SIN romper
-- el sistema actual. Es REVERSIBLE y ADITIVO:
--   - NO se elimina ni altera la columna usuarios.rol (sigue siendo
--     la fuente usada por requireRole en caliente).
--   - Se agregan las tablas y usuarios.rol_id (nullable) para habilitar
--     la gestión dinámica de permisos cuando se decida.
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- Sincronizado con: backend/src/config/permisos.js (fuente de verdad)
-- ============================================================

BEGIN;

-- 1) Tabla de roles
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(40)  NOT NULL UNIQUE,
  descripcion TEXT,
  hereDa_de   VARCHAR(40)  REFERENCES roles(nombre),
  es_sistema  BOOLEAN      NOT NULL DEFAULT FALSE,
  activo      BOOLEAN      NOT NULL DEFAULT TRUE
);

-- 2) Catálogo de permisos (modulo.accion)
CREATE TABLE IF NOT EXISTS permisos (
  id       SERIAL PRIMARY KEY,
  codigo   VARCHAR(60) NOT NULL UNIQUE,   -- ej. 'calificaciones.crear'
  modulo   VARCHAR(40) NOT NULL,
  accion   VARCHAR(40) NOT NULL
);

-- 3) Matriz rol ↔ permiso
CREATE TABLE IF NOT EXISTS roles_permisos (
  rol_id     INTEGER NOT NULL REFERENCES roles(id)     ON DELETE CASCADE,
  permiso_id INTEGER NOT NULL REFERENCES permisos(id)  ON DELETE CASCADE,
  PRIMARY KEY (rol_id, permiso_id)
);

-- 4) Columna opcional en usuarios (en paralelo a rol; NO reemplaza todavía)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS rol_id INTEGER REFERENCES roles(id);

COMMENT ON COLUMN usuarios.rol_id IS
  'FK opcional al modelo RBAC. NULL = usar usuarios.rol (legacy). No obligatoria aún.';

COMMIT;
