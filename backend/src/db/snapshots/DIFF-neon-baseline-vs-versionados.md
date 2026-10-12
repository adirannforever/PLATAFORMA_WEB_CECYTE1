# Diff estructural — baseline Neon vs SQL versionados

**Fecha de reconciliación:** 12 de octubre de 2026
**Baseline:** `neon-baseline-2026-10-12.sql` (schema-only, sin filas)
**Restaure aislada:** `scripts/restore-baseline.mjs` sobre PostgreSQL 16 local desechable

## 1. Inventario restaurado vs inventario documentado de Neon

El baseline se restauró en una base local desechable (`cecyte_baseline_check`, creada y
eliminada por el script). El catálogo restaurado coincide con el inventario de Neon:

| Objeto | Neon (documentado) | Restaurado local | ¿Coincide? |
|---|---|---|---|
| Tablas | 43 | 43 | ✅ |
| Secuencias | 42 | 42 | ✅ |
| Columnas | 356 | 356 | ✅ |
| Vistas | 1 (`v_promedios_periodo`) | 1 | ✅ |
| Triggers | 2 | 2 | ✅ |
| Funciones | 2 | 2 | ✅ |
| Índices | 124 | 124 (81 no-PK + 43 PK) | ✅ |
| Constraints | 419 | 419 (211 objetos + 208 NOT NULL) | ✅ |

Nota de conteo: el número "419 constraints" del plan suma los **objetos** de `pg_constraint`
(211: 41 check + 91 FK + 43 PK + 36 unique) más los **atributos NOT NULL** de columna (208),
que `pg_dump` representa como atributos de columna y no como filas de `pg_constraint`.

## 2. Tablas: versionados vs baseline

- `backend/src/db/schema.sql` define **40** tablas.
- `backend/src/db/migrations/001_rbac_roles_permisos.sql` agrega **3**: `roles`, `permisos`,
  `roles_permisos` (más la columna `usuarios.rol_id`).
- 40 + 3 = **43** = las 43 tablas vivas de Neon. **No faltan ni sobran tablas por nombre.**

Verificación reproducible: `node scripts/reconcile-schema.mjs`
(reporte en `scripts/reports/reconcile-stage1.json`).

## 3. Objetos ausentes en los SQL versionados (diff real)

Estos objetos existen en el baseline de Neon pero **no** están en `schema.sql` ni en la
migración 001. No son de auditoría; son de dominio:

1. **Vista** `v_promedios_periodo`.
2. **Función + trigger** `trigger_generar_periodos` → `generar_periodos_ciclo()`:
   crea periodos escolares al insertar un ciclo escolar.
3. **Función + trigger** `trg_verificar_horario_docente` → `verificar_conflicto_horario_docente()`:
   valida conflictos de horario docente.

Implicación: una base creada **solo** con `schema.sql` + migración 001 no tiene estos objetos,
por lo que difiere del baseline vivo. Deben versionarse en una migración nueva (inmutable)
antes de usar los SQL versionados como fuente de verdad.

## 4. Cómo reproducir

```bash
# Reconciliación de nombres (sin tocar la base)
node scripts/reconcile-schema.mjs

# Restaurar el baseline en una base desechable y comparar catálogo
LOCAL_BASELINE_URL=postgres://usuario@localhost:5432/postgres node scripts/restore-baseline.mjs
LOCAL_BASELINE_URL=postgres://usuario@localhost:5432/postgres node scripts/restore-baseline.mjs --keep
```

Seguridad: `restore-baseline.mjs` rechaza hosts no locales, usa una base dedicada
(`cecyte_baseline_check`), y nunca toca `DATABASE_URL` ni Neon. Limpia meta-comandos psql
(`\restrict`/`\unrestrict`), el GUC `transaction_timeout` (solo PG18) y hace idempotente
`CREATE SCHEMA public`. Requiere que `LOCAL_BASELINE_URL` esté definido fuera del script;
no se incluye una credencial predeterminada en el repositorio.

## 5. Conclusión del paso

- El baseline de Neon es **reproducible** en PostgreSQL local sin ajustes de datos.
- Los SQL versionados cubren las **43 tablas por nombre**, pero **no** la vista ni los dos
  triggers/funciones de dominio.
- Siguiente: versionar esos 3 objetos en una migración nueva y definir el ledger de
  migraciones antes de tratarlos como fuente de verdad.
