# Plataforma CECyTE Plantel 1 — hoja de ruta verificada

**Revisada:** 12 de octubre de 2026
**Estado general:** varias bases tecnicas ya existen; su adopcion funcional es parcial. La siguiente prioridad es reconciliar y probar el baseline real de PostgreSQL antes de seguir con migraciones y pruebas E2E.
**Proposito:** avanzar por incrementos comprobables, atender primero las necesidades reales del plantel y evitar instalar tecnologias solo para ampliar la lista.

## 1. Como leer el estado

- **Hecho:** existe en el codigo y cubre el alcance indicado.
- **Parcial:** existe una base o un primer flujo, pero falta completar la integracion o probarla.
- **Pendiente:** no hay implementacion comprobable en el repositorio.
- **Opcional/diferido:** se evaluara solo cuando exista una necesidad concreta.

La presencia de un paquete, archivo de configuracion, pantalla o contenedor **no** cuenta por si sola como funcionalidad terminada. El catalogo de Neon se inspecciono en solo lectura el 12 de octubre de 2026; el snapshot no contiene filas ni credenciales.

## 2. Estado comprobado del proyecto

| Area | Evidencia en el repositorio | Estado real |
|---|---|---|
| Backend actual | Node/Express ESM, `pg`, JWT, permisos y servicios institucionales | Hecho para el sistema existente |
| Redis | `ioredis`, cliente opcional, servicio Redis en Compose; hay usos auxiliares | Parcial: el backend funciona sin Redis y no hay cache de dominio ni colas |
| Logging | Winston con salida JSON en produccion y consola en desarrollo | Parcial: no se encontro middleware de access log ni correlacion de request/trace ID |
| Validacion Zod | Zod y middleware `validate` estan definidos | Parcial: no se encontraron rutas que apliquen `validate(...)` |
| Salud y metricas | `/health`, `/ready` y `/metrics` existen en `backend/src/index.js` | Parcial: metricas basicas en memoria; Redis es opcional y no hay observabilidad distribuida |
| Rate limiting | Middleware y limitador de autenticacion/API presentes | Hecho como proteccion basica; no reemplaza Helmet ni otras medidas pendientes |
| Auditoria HTTP | Middleware global registra mutaciones exitosas y exportaciones; login/logout tienen registros explicitos | Parcial: la cobertura, los fallos y los cambios de datos deben probarse de forma sistematica |
| Auditoria de dominio | Existen escrituras especificas para cambios de calificaciones e inscripciones | Parcial: se debe definir una politica unica y evitar duplicados con auditoria global |
| Auditoria en BD | Hay tablas e indices de auditoria; Neon tiene dos triggers operativos | Pendiente: ninguno de los triggers actuales registra auditoria |
| Pantalla de auditoria | `AuditoriaPage` y su ruta estan en el frontend | Hecho como pantalla inicial; validar cobertura, filtros, permisos y datos nuevos |
| Correo | Nodemailer, configuracion SMTP, servicio y prueba manual existen | Parcial: Compose inicia MailHog (no Mailpit); no hay verificacion de correo ni recuperacion de cuenta |
| Mailpit | El plan lo solicita, pero no es el servicio actual de Compose | Pendiente: sustituir MailHog por Mailpit y alinear variables, documentacion y prueba |
| Perfil de usuario | No se encontro una ruta/pantalla de perfil de cuenta en el frontend | Pendiente |
| Base de datos/migraciones | `schema.sql`, una migracion RBAC y un baseline DDL schema-only de Neon | Parcial: el baseline aun debe restaurarse y compararse; no hay ledger de migraciones |
| Reportes | Hay endpoints y generadores actuales para varios formatos | Hecho de forma sincrona; la generacion en cola sigue pendiente |
| Pruebas | El smoke test de servicios ahora incluye una regresion para texto especial en PDFs; hay un test E2E de auditoria en JS | Parcial: no hay Jest/Supertest, Vitest/Testing Library ni CI; el E2E requiere entorno y datos de prueba |
| CI/CD | No se encontro configuracion versionada en `.github/workflows` | Pendiente |
| Frontend | React Router, contexto de autenticacion, paginas funcionales y pantalla de auditoria | Parcial: no se encontraron React Query, React Hook Form, Zustand/Redux, Recharts ni Socket.IO |
| Docker local | Compose tiene PostgreSQL, Redis y MailHog | Parcial: no orquesta backend/frontend y aun no usa Mailpit |
| Pagos | Existe una pantalla/modulo de pagos del sistema | Parcial: no se encontro integracion con Stripe o Mercado Pago |

### Cambios de auditoria recientes

Los cambios locales de controladores, middleware, esquema SQL, pantalla de auditoria y herramientas Node se registraron en commits locales. La ampliacion del contexto de auditoria esta en `14e1916`; las herramientas Node y limpieza asociada, en `3d526fb`. No se hizo push. La prueba E2E de auditoria y la migracion contra una base PostgreSQL dedicada siguen pendientes, por lo que los commits no equivalen a una validacion funcional completa.

### Diferencias detectadas frente al plan anterior

1. Fases 0 y 1 no estaban realmente completas ni claramente pendientes: Redis, Winston, Zod, salud, correo y auditoria ya tienen bases de codigo, pero falta cerrar sus criterios de aceptacion.
2. El plan afirmaba Mailpit; Compose y la configuracion SMTP siguen nombrando MailHog.
3. La pantalla de auditoria ya existe y esta conectada a una ruta. La pantalla que falta identificar y planear es el perfil de usuario.
4. El modulo de pagos existe; el proveedor de pago es una decision futura, no una ausencia total del dominio.
5. Los SQL versionados no incluyen los dos triggers operativos que existen en Neon. Tampoco hay ledger de migraciones, framework de pruebas, workflow de CI, sistema de colas ni las bibliotecas de estado/formularios/graficas propuestas.
6. La antigua distribucion de fases ponia funciones asincronas antes de crear pruebas y CI. Se reordena para validar antes de ampliar el sistema.

## 3. Principios de ejecucion

1. Un incremento funcional a la vez; no adoptar una dependencia sin caso de uso, integracion y prueba.
2. Antes de cambiar un flujo existente, revisar su ruta, permisos, modelo de datos y consumidores frontend.
3. Toda migracion de datos debe estar versionada, ser segura para una base existente y tener instrucciones de aplicacion/rollback cuando sea posible.
4. Probar con datos de desarrollo dedicados; los smoke/E2E no deben cambiar usuarios reales ni depender de contrasenas incorporadas al codigo.
5. Mantener Mailpit solo en desarrollo/pruebas. Produccion usara un SMTP/proveedor configurado por entorno.
6. No registrar contrasenas, tokens, secretos ni contenido sensible en logs, auditoria, fixtures o capturas.
7. No duplicar auditoria de una operacion entre middleware y triggers sin una decision explicita sobre actor, transaccion y fuente de verdad.
8. Cada fase tiene condicion de salida; no se declara completa por instalar paquetes.

## 4. Hoja de ruta reestructurada

### Paso prioritario — Baseline y versionado del esquema PostgreSQL

**Estado: snapshot de catalogo y DDL schema-only capturados; reconciliacion y restauracion aislada pendientes.**

- El inventario de Neon contiene 43 tablas, 42 secuencias, 356 columnas, 419 constraints, 124 indices, una vista y dos triggers con sus dos funciones. No hay tipos enum/domain, politicas RLS ni candidatos a tabla de historial de migraciones.
- Los nombres de las 43 tablas vivas aparecen entre `backend/src/db/schema.sql` y `001_rbac_roles_permisos.sql`. La unica diferencia de nombre de columna encontrada es `usuarios.rol_id`, agregada por esa migracion.
- Neon tambien tiene `v_promedios_periodo`, ausente de los SQL versionados, y dos triggers ausentes de ellos: uno crea periodos escolares al insertar un ciclo; otro valida conflictos de horario docente. No son triggers de auditoria.
- El DDL schema-only fechado esta en `backend/src/db/snapshots/neon-baseline-2026-10-12.sql`. No contiene filas y no se debe aplicar a Neon ni a otra base existente: es un baseline para comparar y probar en una base vacia/desechable.
- Revisar diferencias de tipos, defaults, constraints, indices, vista y funciones entre el baseline y los SQL versionados; despues restaurar el baseline solo en PostgreSQL local desechable y comparar el catalogo restaurado con el snapshot.
- Tras validar el baseline, definir un ledger simple y migraciones SQL inmutables. Registrar el baseline de una base existente requerira backup y autorizacion explicita; nunca reproducir el dump sobre Neon como una migracion.

**Salida:** baseline reproducible en una base vacia, diferencias documentadas y estrategia de migraciones que conserva Neon sin reaplicar su DDL.

### Fase 0 — Cerrar y verificar el trabajo de auditoria

**Estado: cambios principales commiteados localmente; validacion E2E y de migracion pendientes.**

- Revisar cambios actuales de API, esquema, middleware y `AuditoriaPage`.
- Confirmar comportamiento para login fallido/exitoso, logout, mutaciones y exportaciones.
- Probar que metodo, ruta, status, actor y diferencias antes/despues corresponden a la peticion real.
- Asegurar que errores del sistema de auditoria no devuelvan exito falso ni rompan accidentalmente la operacion de negocio; documentar el comportamiento de fallo.
- Revisar permisos, paginacion, filtros y sanitizacion de datos sensibles.
- Ejecutar la herramienta de prueba solo contra datos locales dedicados y comprobar restauracion/limpieza.
- Revisar la migracion frente a `schema.sql` y una base con y sin las columnas nuevas.

**Salida:** pruebas reproducibles y documentadas; comportamiento de auditoria definido; sin perdida/duplicacion accidental de logs; cambios revisados antes del commit.

### Fase 1 — Base de pruebas y CI

- Establecer pruebas backend con Jest/Supertest **o** el runner nativo de Node si cubre el caso con menos complejidad; decidirlo antes de instalar.
- Establecer Vitest/Testing Library para componentes/frontend donde aporte cobertura util.
- Conservar las regresiones de generacion documental dentro de `npm run test:servicios`, incluyendo texto de usuario con caracteres especiales en PDFs.
- Separar pruebas unitarias, contrato HTTP y pruebas que necesitan PostgreSQL/Redis/Mailpit.
- Crear GitHub Actions para instalacion reproducible, pruebas y build; no desplegar automaticamente hasta elegir entorno y politica.
- Incorporar ESLint/Prettier despues de fijar reglas compatibles con el codigo existente; evitar reformatear el proyecto completo como efecto colateral.

**Salida:** CI reproduce las comprobaciones locales; pruebas no requieren credenciales reales ni servicios externos no declarados.

### Fase 2 — Completar fundamentos backend

- Redis: decidir y probar el primer caso real de cache con TTL/invalidation; mantener modo sin Redis solo donde este soportado deliberadamente.
- Logging: uniformar uso de Winston, logs de acceso y correlacion de request ID; no guardar secretos/PII.
- Zod: aplicar esquemas a entradas de rutas prioritarias y fijar una respuesta de error estable.
- Salud: distinguir liveness/readiness y documentar metricas; no exponer datos internos sensibles.
- Revisar Helmet y configuracion de seguridad HTTP junto con CORS/rate limits.

**Salida:** integraciones usadas por rutas concretas, pruebas de errores/ausencia de dependencias y documentacion de entorno.

### Fase 3 — Correo de desarrollo, verificacion de cuenta y perfil

**Prioridad solicitada.**

- Sustituir MailHog por Mailpit en `docker-compose.yml`; alinear nombre/variables de SMTP, puertos, UI, persistencia y README.
- Mantener Nodemailer como interfaz de envio y verificar SMTP en el entorno local.
- Disenar el ciclo de verificacion: token de un solo uso, expiracion, almacenamiento seguro, reenvio limitado y consumo atomico; no considerar `email` verificado hasta completar el flujo.
- Definir las reglas de usuarios existentes, administradores y cuentas sin correo antes de forzar verificacion en login.
- Implementar las pantallas/endpoints de solicitud, confirmacion y reenvio; agregar despues recuperacion de contrasena si el alcance lo requiere.
- Crear la pantalla de perfil para consultar/actualizar datos permitidos y enlazarla desde la navegacion; proteger cambios de correo con nueva verificacion.
- Probar con Mailpit y cubrir expiracion, reuso, rate limit, correo duplicado y fallo SMTP.

**Salida:** flujo end-to-end en local, sin secretos SMTP versionados y con reglas de despliegue explicitas.

### Fase 4 — Auditoria consistente y migraciones

- Mantener `auditoria_logs` como registro HTTP/actor solo para eventos definidos; conservar los historiales de dominio que tengan semantica distinta.
- Crear una matriz de eventos por modulo: usuarios, grupos, asistencia, calificaciones, inscripciones y exportaciones.
- Elegir entre escritura desde servicio transaccional y triggers por tabla. No duplicar ambas fuentes; evaluar como representar actor en conexiones/pool y transacciones antes de usar triggers.
- Acordar que operaciones fallidas/no autorizadas se registran y donde; definir retencion, acceso y exportacion.
- Formalizar migraciones SQL versionadas, comprobacion de estado y rollback/rescate para bases existentes.
- Documentar esquema y relaciones, y agregar indices solo a partir de consultas/planes medidos.

**Salida:** eventos prioritarios cubiertos una vez, con actor/antes/despues verificables, migraciones repetibles y pruebas contra PostgreSQL.

### Fase 5 — Trabajos en segundo plano

- Adoptar BullMQ solo despues de que Redis sea una dependencia operativa documentada.
- Empezar con un reporte de coste alto; modelar estados, reintentos, idempotencia, retencion del archivo y autorizacion de descarga.
- No mover todos los PDF/Excel/correos a una cola en una sola entrega.
- Mantener respuesta sincrona para trabajos cortos y definir limites/errores de timeout.

**Salida:** un flujo asincrono completo con prueba de reintento, duplicados y fallo del worker.

### Fase 6 — Modernizacion incremental del frontend

- TanStack Query para datos remotos con invalidacion/cache definida.
- React Hook Form + Zod en formularios priorizados; reutilizar reglas del backend sin asumir que el frontend es una barrera de seguridad.
- Zustand solo si el estado compartido real no queda cubierto por contexto/query.
- Recharts para paneles con requisito de visualizacion concreto.
- Estados de carga/error, boundaries y accesibilidad donde hoy haya fallos observables.
- Toasts/notificaciones y Socket.IO se separan: notificaciones locales primero; tiempo real queda opcional hasta justificarlo.
- La auditoria ya tiene pagina; perfil de cuenta se aborda en Fase 3.

**Salida:** una ruta migrada de punta a punta y probada; no una reescritura global del frontend.

### Fase 7 — Entrega/operacion

- Completar Compose de desarrollo para los servicios aprobados: backend, frontend, PostgreSQL, Redis y Mailpit; Nginx solo si resuelve una necesidad concreta.
- Definir secretos, persistencia, healthchecks, backups/restauracion y perfiles de desarrollo/pruebas.
- Elegir host de produccion antes de agregar PM2, despliegue CI o proveedor de pagos.
- Sentry/OpenTelemetry, OAuth/2FA y Mercado Pago/Stripe son decisiones separadas, sujetas a requisitos, costos, privacidad y soporte.

**Salida:** instrucciones repetibles de despliegue y restauracion, CI con proteccion de secretos y operacion validada en el destino seleccionado.

## 5. Trabajo de base de datos

- `schema.sql` y `001_rbac_roles_permisos.sql` no deben tratarse como historial completo: describen los mismos nombres de tablas que Neon, pero no incluyen todos sus objetos.
- El dump de `pg_dump --schema-only` conserva la estructura viva sin filas, propietarios ni privilegios; no reemplaza aun a `schema.sql` ni es una migracion incremental.
- Para actualizar el snapshot desde `backend`, usar `npm run db:export-neon-schema -- --output=src/db/snapshots/neon-baseline-YYYY-MM-DD.sql`. La herramienta exige un host Neon, no pasa la URL con credenciales como argumento, mantiene TLS verificado y fuerza transacciones read-only.
- Para volver a generar el inventario de catalogo, usar `npm run db:inspect-neon-schema -- --output=src/db/snapshots/neon-catalog.json`; no consulta filas de tablas.
- El catalogo no encontro una tabla `schema_migrations`, `knex`, `sequelize`, `prisma` o equivalente. El seguimiento uniforme sigue pendiente.
- Los dos triggers de Neon son operativos (periodos escolares y conflicto de horarios); no existe evidencia de triggers de auditoria.
- No copiar dumps completos ni datos de produccion al repositorio. Los fixtures deben ser pequenos, sinteticos y anonimos.

## 6. Higiene del repositorio

- `.gitignore` ignora `.env*` conservando `.env.example`, agentes locales `.agents/`, scripts PowerShell, temporales, logs, dumps locales y archivos `.txt` de `backend/scripts`.
- Los dos dumps SQL vacios, `setup_local_db.ps1` y `test_usuario.sql` se eliminaron del arbol versionado; las reglas de ignore no purgan versiones historicas.
- `test_usuario.sql` insertaba manualmente un usuario sintetico con rol de administrador y un hash de contrasena fijo. No se encontraron referencias que lo ejecutaran y no debe recrearse como mecanismo de setup; usar fixtures aislados.
- No reescribir historia ni purgar objetos remotos sin confirmar que contienen secretos/datos personales y acordar la accion; una eliminacion en un commit nuevo no borra copias historicas.
- Revisar `git status` antes de cada commit; no incluir `.env`, logs, backups, dumps, salidas de pruebas ni archivos de agente.

## 7. Orden inmediato

1. Revisar el baseline Neon contra ambos SQL versionados y restaurarlo en una base PostgreSQL local desechable; documentar el diff estructural y la prueba de restauracion.
2. Definir y probar el ledger/migrador Node sobre esa base local; no escribir el ledger en Neon sin backup y autorizacion explicita.
3. Ejecutar el E2E de auditoria solo en un entorno local dedicado con fixtures sinteticos y validar su migracion sobre la estructura reconciliada.
4. Crear la base de pruebas/CI para que las fases siguientes tengan una comprobacion repetible.
5. Completar fundamentos backend de manera dirigida; despues implementar Mailpit, verificacion de correo y perfil.
6. Continuar con auditoria de dominio; luego evaluar colas, mejoras frontend y despliegue.

**Regla de avance:** cerrar una fase con evidencia (comandos, pruebas y docs) antes de cambiar la prioridad o arrancar la siguiente. Las fechas y duraciones se estimaran despues de acotar cada incremento, no antes.
