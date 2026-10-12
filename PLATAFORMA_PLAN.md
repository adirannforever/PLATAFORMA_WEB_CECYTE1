# Plataforma CECyTE Plantel 1 — hoja de ruta verificada

**Revisada:** 12 de octubre de 2026
**Estado general:** varias bases tecnicas ya existen; su adopcion funcional es parcial. El trabajo activo mas visible es auditoria.
**Proposito:** avanzar por incrementos comprobables, atender primero las necesidades reales del plantel y evitar instalar tecnologias solo para ampliar la lista.

## 1. Como leer el estado

- **Hecho:** existe en el codigo y cubre el alcance indicado.
- **Parcial:** existe una base o un primer flujo, pero falta completar la integracion o probarla.
- **Pendiente:** no hay implementacion comprobable en el repositorio.
- **Opcional/diferido:** se evaluara solo cuando exista una necesidad concreta.

La presencia de un paquete, archivo de configuracion, pantalla o contenedor **no** cuenta por si sola como funcionalidad terminada. La base PostgreSQL viva no se consulto para esta revision; los hallazgos de base de datos se refieren a los SQL versionados.

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
| Auditoria en BD | Hay tablas e indices de auditoria en `schema.sql` | Pendiente: no se encontraron triggers de auditoria |
| Pantalla de auditoria | `AuditoriaPage` y su ruta estan en el frontend | Hecho como pantalla inicial; validar cobertura, filtros, permisos y datos nuevos |
| Correo | Nodemailer, configuracion SMTP, servicio y prueba manual existen | Parcial: Compose inicia MailHog (no Mailpit); no hay verificacion de correo ni recuperacion de cuenta |
| Mailpit | El plan lo solicita, pero no es el servicio actual de Compose | Pendiente: sustituir MailHog por Mailpit y alinear variables, documentacion y prueba |
| Perfil de usuario | No se encontro una ruta/pantalla de perfil de cuenta en el frontend | Pendiente |
| Base de datos/migraciones | `schema.sql` y una migracion SQL RBAC versionada | Parcial: falta un flujo de migraciones uniforme y documentado |
| Reportes | Hay endpoints y generadores actuales para varios formatos | Hecho de forma sincrona; la generacion en cola sigue pendiente |
| Pruebas | El smoke test de servicios ahora incluye una regresion para texto especial en PDFs; hay un test E2E de auditoria en JS | Parcial: no hay Jest/Supertest, Vitest/Testing Library ni CI; el E2E requiere entorno y datos de prueba |
| CI/CD | No se encontro configuracion versionada en `.github/workflows` | Pendiente |
| Frontend | React Router, contexto de autenticacion, paginas funcionales y pantalla de auditoria | Parcial: no se encontraron React Query, React Hook Form, Zustand/Redux, Recharts ni Socket.IO |
| Docker local | Compose tiene PostgreSQL, Redis y MailHog | Parcial: no orquesta backend/frontend y aun no usa Mailpit |
| Pagos | Existe una pantalla/modulo de pagos del sistema | Parcial: no se encontro integracion con Stripe o Mercado Pago |

### Cambios de auditoria en curso

Al revisar el arbol de trabajo hay cambios locales sin commit en controladores, middleware, esquema SQL y pantalla de auditoria, ademas de herramientas JS nuevas para migracion, preparacion local y E2E. Se consideran **trabajo en curso**, no una entrega validada ni parte de `main` remoto. Esta hoja de ruta no los agrega al indice, no los commitea y no sustituye su revision funcional.

### Diferencias detectadas frente al plan anterior

1. Fases 0 y 1 no estaban realmente completas ni claramente pendientes: Redis, Winston, Zod, salud, correo y auditoria ya tienen bases de codigo, pero falta cerrar sus criterios de aceptacion.
2. El plan afirmaba Mailpit; Compose y la configuracion SMTP siguen nombrando MailHog.
3. La pantalla de auditoria ya existe y esta conectada a una ruta. La pantalla que falta identificar y planear es el perfil de usuario.
4. El modulo de pagos existe; el proveedor de pago es una decision futura, no una ausencia total del dominio.
5. No se encontro trigger SQL, migrador uniforme, framework de pruebas, workflow de CI, sistema de colas ni las bibliotecas de estado/formularios/graficas propuestas.
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

### Fase 0 — Cerrar y verificar el trabajo activo de auditoria

**Estado: en curso en el arbol local; aun no validado/commiteado.**

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

- `schema.sql` se conserva como referencia de instalacion; los cambios a una base viva van en migraciones nuevas e inmutables.
- La migracion RBAC `001_rbac_roles_permisos.sql` prueba que hay al menos un SQL versionado, pero no constituye por si sola un flujo completo de migraciones.
- No se verifico en los SQL versionados la vista `v_promedios_periodo` descrita anteriormente. Confirmar contra el esquema real antes de documentarla como parte garantizada.
- No se encontraron `CREATE TRIGGER`/funciones de trigger de auditoria en los SQL versionados.
- No copiar dumps completos ni datos de produccion al repositorio. Los fixtures deben ser pequenos, sinteticos y anonimos.

## 6. Higiene del repositorio

- `.gitignore` ignora `.env*` conservando `.env.example`, agentes locales `.agents/`, scripts PowerShell, temporales, logs, dumps locales y archivos `.txt` de `backend/scripts`.
- Ignorar no retira archivos ya rastreados. Los dos dumps SQL vacios y `setup_local_db.ps1` siguen en el indice actual aunque sus eliminaciones locales estan pendientes; una regla nueva no quita archivos del indice ni de commits anteriores.
- `test_usuario.sql` fue revisado: inserta manualmente un usuario sintetico con rol de administrador y un hash de contrasena fijo; no se encontraron referencias que lo ejecuten. No debe ejecutarse fuera de una base local aislada. Se recomienda retirarlo del codigo versionado o sustituirlo por un fixture de pruebas automatizado y aislado.
- No reescribir historia ni purgar objetos remotos sin confirmar que contienen secretos/datos personales y acordar la accion; una eliminacion en un commit nuevo no borra copias historicas.
- Revisar `git status` antes de cada commit; no incluir `.env`, logs, backups, dumps, salidas de pruebas ni archivos de agente.

## 7. Orden inmediato

1. Terminar y validar la Fase 0 (auditoria) sin mezclar cambios ajenos del arbol de trabajo.
2. Crear la base de pruebas/CI para que las fases siguientes tengan una comprobacion repetible.
3. Completar fundamentos backend de manera dirigida; evitar rehacer componentes que ya existen.
4. Implementar Mailpit y el ciclo de verificacion de correo, junto con el perfil de usuario.
5. Continuar con auditoria de dominio/migraciones; luego evaluar colas, mejoras frontend y despliegue.

**Regla de avance:** cerrar una fase con evidencia (comandos, pruebas y docs) antes de cambiar la prioridad o arrancar la siguiente. Las fechas y duraciones se estimaran despues de acotar cada incremento, no antes.
