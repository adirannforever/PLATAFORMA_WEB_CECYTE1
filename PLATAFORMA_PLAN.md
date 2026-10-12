# Plataforma CECyTE Plantel 1 — Plan de ejecución (revisión 2026)

**Tipo:** documentación de plan persistente  
**Estado:** en ejecución, enfoque *breadth* (aprender tecnologías)  
**Derivado de:** post-mortem CECyTE v3.0.0 y lecciones aprendidas (sec. 4, 9, 11 del post-mortem)

---

## 0. Objetivo de esta ejecución

No entrega académica. Se busca **ampliar la pila tecnológica** del sistema CECyTE (backend Express + PostgreSQL + React/Vite) incorporando tecnologías relevantes para un sistema de gestión educativa, **a fin de aprender y dejar el codebase más robusto/paralelo**, paso a paso. Cada tecnología se incorpora con su **entorno, its integration hook, tests y documentación propia**.

> *Regla de oro:* "profundidad antes que amplitud" del post-mortem se traslada a cada módulo: **por cada tecnología nueva se entiende, se prueba y se documneta**.

---

## 1. Lección de post-mortem aplicada (en esta ejecución)

| Post-mortem | Aplicación aquí |
|---|---|
| Scope no definido | Scope explícito: **ampliación de pila**, no ámbito funcional nuevo |
| Team-scale project | Solo 1 dev; módulos pequeños, *adoptable* en 1–2 semanas |
| Sin scope frozen | Plan de fases congeladas; cambios exigen re-priorizar |
| Back-loaded dev | Entregas por fases; cada fase se valida antes de avanzar |
| Sin testing | Tests backend (Jest) + frontend (Vitest) desde la Fase 3 |
| Sin CI/CD | GitHub Actions desde la Fase 3 |
| Sin documentación | `.env.example`, README por módulo, arquitectura del servicio |
| Sobre-ingenería en BD | BD se mantiene; nuevas tecnologías se añaden **encima**, no en el modelo |
| IA generativa | Todo lo que genera AI se **refactoriza y se explica** antes de commit |

---

## 2. Stack actual (lo que ya existe)

| Capa | Tecnologías |
|---|---|
| Backend | Node 20, Express 4 (ESM), PostgreSQL/Neon (`pg`), JWT + bcryptjs, `@neondatabase/serverless`, AWS S3 presigned (`@aws-sdk/client-s3`), `node-cron`, `motor Python (reportlab / python-docx / openpyxl)`, `console-stamp`, `cookie-parser`, `cors` |
| Frontend | React 18 + Vite, React Router v6, React DnD, react-grid-layout, react-resizable, Lucide, axios, lodash |
| Scripts de backend | `scripts/backup.js` (cron 3AM + S3/R2), `scripts/crearCiclos.js`, `scripts/seed.js`, `scripts/scheduler.js` |

**Tablas en BD:** `schema.sql` + estado vivo (40+ objetos DB, incl. vista `v_promedios_periodo`).

---

## 3. Tech a incorporar (en fases)

### Fase 0 — Base de ejecución
- **Redis**: conexión (`ioredis`), cache por TTL
- **Logging estructurado**: Winston/Pino + correlación de ID
- **Validación con zod** (middleware y servicios)
- **Health/metrics extendidos** (`/health`, `/ready`, `/metrics`)

### Fase 1 — Auditoría robusta
- **Mailpit** (SMTP de dev + UI) + configuración de entorno
- Auditoría centralizada: middleware + triggers + `auditoria_logs` completo (incl. calificaciones, inscripciones, grupos, asistencia)

### Fase 2 — Colas y reportes asíncronos
- **BullMQ** (Redis) para reportes PDF/Excel, notificaciones
- Generación asíncrona + descarga de archivos

### Fase 3 — Testing + CI/CD
- Jest (backend) + Vitest (frontend)
- GitHub Actions (lint, test, build, deploy)
- ESLint, Prettier, Husky, lint-staged

### Fase 4 — Frontend moderno
- **TanStack React Query** (state server)
- **React Hook Form** + `zod` resolver
- **Zustand** (state global)
- **Recharts** (dashboards asistencia/promedios)
- **react-toastify** + websockets (notificaciones)

### Fase 5 — Infra / redes / seguridad
- **Docker + docker-compose** (`postgres`, `redis`, `backend`, `frontend`, `mailpit`, `nginx`/`minio`)
- WebSockets (`socket.io`) para asistencia en tiempo real (opcional)
- Helmet, sanitización, 2FA/TOTP (opcional)
- Payments: Stripe / Mercado Pago (opcional)

---

## 4. Workflow de cada tecnología

1. **Configuración** — env var + cliente inicial
2. **Integración** — hook bien definido (ej. `services/redis.js`, `services/mailer.js`)
3. **Uso** — 1 endpoint/pantalla que aprovecha la tecnología
4. **Tests** — unit/integración breve
5. **Documentación** — comentario + nota en README

---

## 5. Layout propuesto para nuevas grabarias

```
backend/src/
  config/
    redis.js
    mailpit.js
    logger.js
    zod.js
  middleware/
    audit.middleware.js
  services/
    redis.service.js
    mailer.service.js
    logger.service.js
    jobs/            (cron + bull)
  scripts/           (backup, seed, ciclos, mailtest, metrica)
frontend/src/
  services/
    redis.service.js
    mailer.service.js
    queryClient.js
  hooks/             (useQuery, useMutation)
  stores/             (zustand)
  components/         (nuevos: dashboards, charts, toast)
  utils/
```

---

## 6. Tabla de decisiones / pendientes

- ✅ Redis en Fase 0 (opcional si no hay Redis local)
- ✅ Mailpit en Fase 1 (servicio SMTP de dev)
- ✅ Auditoría central + triggers (Fase 1)
- ❓ WebSocket real-time (solo si hay escala de live-assist)
- ❓ Payments (compra de conceptos de pago)
- ❓ OAuth/2FA (seguridad adicional)

---

## 7. Derivados de env

- `.env.example` creado (plantilla de entorno).
- `.gitignore` mejorado (configuración, logs, build, tests).
- Plan congelado hasta la fase 0 completada.

---

## 8. Herramientas a instalar (backend)

```
npm i ioredis winston zod bullmq @sentry/node nodemailer helmet otel-api
npm i -D @types/node @types/ioredis @types/nodemailer jest supertest @types/jest
```

*Sección refactor:* vue el código que ya usa AI para que quede propiamente único por el desarrollador.

---

## 9. Puntos de contacto

- Proxima fase: **Fase 0** (Redis + logging + zod + health/metrics).
- Revisión de plan: al final de cada fase.
