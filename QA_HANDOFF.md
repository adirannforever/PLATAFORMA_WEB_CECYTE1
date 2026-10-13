# HANDOFF — UX/UI Polish + QA (Round 2)

> Working note for the next window session. Read top-to-bottom, then resume from
> "NEXT STEPS" (Section 7). Written in English; UI copy stays Spanish (es-MX).

---

## 0. CRITICAL BLOCKER IN THE PREVIOUS WINDOW

The **terminal/shell tool was broken** in the prior window session. Every command
(even `pwd`, `node --version`) returned a PowerShell parser error because the
harness wrapped the payload as `["..."]}`. Consequences: could not run `npm`,
`git`, `node`, `vite build`, Playwright, Lighthouse, or axe. File tools
(read/write/search) DID work.

**First action in the new window:** verify the shell works (`git status`). It was
intermittent and worked earlier, so it likely recovers. All commands below assume
a working shell.

**Nothing from Round 2 has been committed yet.** Branch `chore/ux-polish-and-qa`
has NOT been created.

---

## 1. REPO LAYOUT & STACK (verified)

Monorepo at `c:\Users\adria\cecyte-platform`. Folders are `frontend/` and
`backend/` (NOT `frontEndPWC1`/`backEndPWC1`).

- **Frontend:** React 18 + Vite 5, **CSS Modules (no Tailwind)**, `axios`,
  `lucide-react` icons, `react-router-dom` v6. Auth is **cookie-based JWT**
  (`req.cookies.token`; base URL `/api`; axios interceptor redirects to `/login`
  on 401).
- **Backend:** Node/Express, **PostgreSQL via Neon** (live & reachable),
  permission model `modulo.accion` in `backend/src/config/permisos.js`.
  `administrador` role has `['*']` (bypasses `requirePermiso`).
- **Roles:** administrador, docente, alumno (the 3 real ones).
- **Seed admin login:** `admin@cecyte.edu.mx` / `123456`.
- **Active cycle:** `2026-2027`.
- **Seeded volume:** 8 alumnos, 6 docentes, 72 materias_catalogo, 48 grupos,
  6 comunicados, 7 aspirantes (5 pendientes), 2 incidencias abiertas,
  60 materias_grupo sin docente, 400 sin horario, calificaciones in 3 parciales
  (~8.2 avg, all passing).

### Key files
- Routing + role gating: `frontend/src/App.jsx` (`RutaProtegida` supports
  permission-based `permisos={['modulo.accion']}` AND legacy `rolesPermitidos`).
- App shell: `frontend/src/components/layout/DashboardLayout.jsx` (+ `.module.css`).
- Global tokens: `frontend/src/index.css` (`:root`).
- Shared CSS primitives: `frontend/src/styles/shared.module.css`.
- Institution identity: `frontend/src/config/institucion.js`.
- Menu/sidebar: `frontend/src/config/menuItems.jsx`.
- API layer: `frontend/src/services/api.js`.
- Design-system UI kit: `frontend/src/components/ui/` (Section 4).

<!-- APPEND-MARKER -->

---

## 2. ROUND 1 (already committed on branch `feat/admin-dashboard-redesign`)

Commits (do NOT redo):
- `77f0e77` feat(backend): aggregated admin dashboard endpoint.
- `fd5071f` feat(ui): design tokens + primitives + admin dashboard redesign.
- `c4231d9` feat(shell): collapsible icon rail + header user menu.

### Backend endpoint added
`GET /api/dashboard/admin` — `verifyToken` + `requirePermiso('dashboard.ver')`.
One stable JSON payload:
```
{ success, data: {
  generado_en, ciclo:{id,nombre,fecha_inicio,fecha_fin}|null,
  kpis:{ alumnos:{valor,delta_mes}, docentes:{valor,delta_mes}, materias:{valor},
    grupos:{valor}, comunicados:{valor}, aspirantes_pendientes:{valor,delta_mes},
    incidencias_abiertas:{valor}, asistencia_semana:{valor:number|null,presentes,total},
    promedio_general:number|null },
  alertas:[{id,titulo,descripcion,cantidad,ruta,severidad}],
  graficas:{ alumnos_por_semestre:[{etiqueta,valor}],
    alumnos_por_especialidad:[{etiqueta,valor}],
    asistencia_semanal:[{semana,presentes,ausentes}],
    calificaciones_parcial:[{parcial,promedio,aprobados,reprobados}] },
  comunicados_recientes:[{id,titulo,contenido,autor,fecha_publicacion,dirigido_a_rol}],
  actividad_reciente:[{tipo,titulo,descripcion,fecha}] }}
```
Files: `backend/src/controllers/dashboard.controller.js`,
`backend/src/routes/dashboard.routes.js`, wired in `backend/src/index.js`.
Empty tables → zeros/empty arrays (never errors).

### Verification done in Round 1 (evidence)
- Frontend `npm run build` PASSED (1947 modules; only pre-existing >500kB chunk warning).
- Backend E2E over real HTTP: server boots, login 200 w/ cookie,
  `/api/dashboard/admin` 200 correct shape, no-auth → 401.

---

## 3. DESIGN TOKENS (`frontend/src/index.css :root`) — DO NOT change palette

Brand: primary `#1a6b35`; primary-dark `#135228`; primary-darker `#0d421a`;
primary-light `#2d8a4e`; primary-muted `#e8f5ed`; accent-orange `#f37238`
(orange-dark `#d95c2a`); accent(gold) `#c8992a` (accent-light `#f5e9c8`).
Neutrals: page `#f5f7f6`, subtle `#f0f4f2`, surface `#ffffff`, border `#dce6e0`,
border-subtle `#e9edf2`, text `#1e293b`, muted `#64748b`, subtle `#94a3b8`.
Semantic: success `#1a6b35`, error `#b91c1c`, warning `#c8992a`, info `#1a5276`.

Fonts: `--font-display:'Merriweather',Georgia,serif` (headings);
`--font-sans:'Roboto',system-ui` (body). Sizes `xs..3xl`. Spacing `--space-1..8`
(4px base). Radii `sm .5 / md .75 / lg 1 / xl 1.25 / full`. Shadows sm/md/lg.

Derived (Round 1): `--green-50..800`, `--orange-50..700`,
`--status-{success,warning,danger,info}` + `-bg`, `--chart-1..6`,
`--radius-card:.875rem`, `--shadow-card`, `--shadow-card-hover`, `--shadow-popover`,
`--transition-fast:150ms`, `--transition-base:180ms`, `--z-*` scale, `--focus-ring`.

---

## 4. UI KIT (Round 1) — `frontend/src/components/ui/` (+ barrel `index.js`)

Token-only, each with hover/focus-visible/disabled/loading states:
`Button` (primary/secondary/ghost/danger/accent; `to`/`href` → Link/a),
`Badge` (tone success/warning/danger/info/neutral), `Card`, `StatCard`
(icon/value/label/caption/delta/`to`, tone), `DataTable` (sticky header, hover,
sortable, pagination, skeleton, empty), `Field` (input/select/textarea + error),
`Modal` (focus trap, Esc, outside-click, scroll lock), `Toast` (`ToastProvider` +
`useToast()`), `EmptyState`, `PageHeader`, `Breadcrumb`, `Tabs`.
`Charts.jsx`: `BarChart`, `GroupedBarChart`, `DonutChart` (dependency-free SVG,
`role="img"` + `aria-label` + `<title>`). `ErrorBoundary.jsx` (per-widget).
`utils/format.js`: `relativeDate`, `longDate`, `weekLabel`.
`PageHeader` already adopted on Comunicados/Usuarios/Aspirantes.

<!-- APPEND-MARKER -->

note
