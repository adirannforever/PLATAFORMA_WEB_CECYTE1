# Sistema de Roles y Permisos (RBAC)

Fuente de verdad del control de acceso del backend. Centraliza **qué roles
existen**, **cómo se heredan** y **qué permisos (`modulo.accion`)** concede cada
uno, además de los helpers para evaluarlos.

## Archivos clave

| Archivo | Rol |
|---|---|
| `backend/src/config/permisos.js` | **Fuente de verdad** (catálogo + resolver). |
| `backend/src/middlewares/auth.js` | `requirePermiso(...codigos)` — gate de rutas. `requireRole` se conserva como backstop. |
| `backend/src/controllers/auth.controller.js` | `login`/`me` emiten `usuario.permisos[]` para el frontend. |
| `backend/scripts/generarPermisos.js` | Siembra las tablas RBAC desde el catálogo (idempotente). |
| `backend/src/db/migrations/001_rbac_roles_permisos.sql` | Migración aditiva de las tablas. |
| `frontend/src/hooks/usePermissions.js` | Hook del front: `tiene(permiso)`, `tieneAlguno`, `isAdmin`… |
| `frontend/src/components/Puede.jsx` | Guard declarativo: `<Puede permiso="x.crear">`. |
| `frontend/src/config/menuItems.jsx` | Visibilidad del menú por `permiso`. |
| `frontend/src/App.jsx` | `RutaProtegida` acepta `permisos={[...]}`. |

## Roles

| Rol | Hereda de | Resumen |
|---|---|---|
| `administrador` | — | Acceso total (bypass explícito en `requirePermiso`). |
| `control_escolar` | — | Admisión, inscripciones, grupos, expedientes, titulación. No configura el sistema. |
| `directivo` | — | Lectura amplia + reportes + aprobaciones. |
| `docente` | — | Calificaciones/asistencia/incidencias de sus materias y alumnos. |
| `tutor` | `docente` | + capacidades sobre **su grupo** (tutorías, citatorios, reinscripción). |
| `alumno` | — | Su información académica, pagos, reinscripción, servicios. |
| `aspirante` | — | Estatus de su solicitud de admisión. |

> **Herencia:** `tutor` hereda todos los permisos de `docente` vía `hereDaDe`.
> El resolver (`permisosDeRol`) recorre la cadena con protección de ciclos.

## Cómo funciona

### Backend
```js
import { requirePermiso } from '../middlewares/auth.js';
router.post('/', requirePermiso('calificaciones.crear'), registrarCalificacion);
```
- `requirePermiso` acepta varios códigos; basta **uno** (OR).
- El administrador pasa siempre (bypass intencional).
- El resto se evalúa contra el catálogo con `tienePermiso(rol, codigo)`.

### Frontend
```jsx
import { usePermissions } from './hooks/usePermissions';
const { tiene } = usePermissions();
{tiene('usuarios.crear') && <BotonCrear />}

// o declarativo:
<Puede permiso="usuarios.crear"><BotonCrear /></Puede>
```

## Modelo de alcance (scope)

Algunos permisos son de **alcance**, no solo de existencia:
- `calificaciones.ver_mis_materias` (docente) vs `calificaciones.ver_todas` (admin).
- `incidencias.ver_mis_alumnos` vs `incidencias.ver_todas`.

El permiso habilita la *intención*; el **ownership concreto** (¿esta materia es
suya?) se valida en el controller (p. ej. `docenteOwnsMateriaGrupo`). Esto ya
existía y se mantiene.

## Reglas para cambiarlo

1. **Para agregar un permiso:** edita `MODULOS` y la `MATRIZ` en
   `config/permisos.js`. Es la única fuente.
2. **Para agregar un rol:** agrégalo a `ROLES` (con `hereDaDe` si hereda) y a
   `MATRIZ`. **No** requiere tocar cada ruta si reutilizas permisos existentes.
3. **Para activar gestión dinámica en BD:** corre la migración
   `001_rbac_roles_permisos.sql` y luego `node scripts/generarPermisos.js`.
   Las tablas `roles/permisos/roles_permisos` + `usuarios.rol_id` quedan listas.
   Mientras tanto, la app usa el catálogo en código (no depende de la BD).

## Compatibilidad

- Los 3 roles históricos (`administrador`, `docente`, `alumno`) conservan
  **exactamente** el acceso que tenían con `requireRole` (verificado por test).
- `usuarios.rol` (VARCHAR) sigue siendo la fuente en caliente; `usuarios.rol_id`
  es una columna nueva y opcional (nullable) para el saldo futuro.
- `requireRole` sigue exportado por si alguna ruta aún lo usa.
