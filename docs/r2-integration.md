# Integración Cloudflare R2 — Backups de Base de Datos

## Resumen

Esta documentación describe la integración de Cloudflare R2 (S3-compatible) para almacenar backups de la base de datos PostgreSQL del sistema CECyTE Platform. Incluye:

- Prueba de conectividad activa (`db:r2-probe`)
- Script de backup optimizado (`db:backup`)
- Programación automática diaria (3 AM vía `node-cron`)

---

## Archivos creados/modificados

| Archivo | Descripción |
|---------|-------------|
| `backend/scripts/probe-r2.mjs` | Prueba activa de conectividad a R2 (upload, download, checksum, cleanup) |
| `backend/scripts/backup.js` | Script de backup optimizado con S3 client reutilizable, timeouts, logging detallado |
| `backend/package.json` | Scripts `db:r2-probe` y `db:backup` agregados |
| `backend/.env.example` | Variables de entorno R2 documentadas con placeholders |
| `backend/scripts/scheduler.js` | Ejecuta backup diario a las 3 AM (ya existente) |
| `backend/src/services/s3.service.js` | Servicio S3 ya configurado para R2 (forcePathStyle, endpoint custom) |

---

## Configuración

### 1. Crear el archivo `.env`

Copie el ejemplo y complete los valores de Cloudflare R2:

```bash
cp backend/.env.example backend/.env
```

Edite `backend/.env` con sus credenciales reales:

```env
# Cloudflare R2 / S3-compatible storage
# Obtener valores del dashboard de Cloudflare: R2 -> Bucket -> Settings
AWS_REGION=auto
AWS_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=<access-key-id-de-r2>
AWS_SECRET_ACCESS_KEY=<secret-access-key-de-r2>
AWS_BUCKET_NAME=<nombre-del-bucket>
```

### 2. Obtener credenciales de Cloudflare R2

1. Inicie sesión en [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vaya a **R2** → **Buckets** → cree un bucket (ej. `cecyte-backups`)
3. Vaya a **R2** → **Manage R2 API Tokens** → cree un token con permisos de lectura/escritura
4. Copie:
   - **Account ID** → para construir el endpoint
   - **Access Key ID** → `AWS_ACCESS_KEY_ID`
   - **Secret Access Key** → `AWS_SECRET_ACCESS_KEY`
   - **Bucket name** → `AWS_BUCKET_NAME`

El endpoint tiene el formato:
```
https://<account-id>.r2.cloudflarestorage.com
```

---

## Comandos disponibles

```bash
# Probar conectividad activa con R2
npm run db:r2-probe

# Ejecutar backup manual de base de datos
npm run db:backup
```

### `db:r2-probe`

Ejecuta una prueba end-to-end de conectividad:

1. Valida variables de entorno requeridas
2. Inicializa `S3Client` configurado para R2
3. Verifica acceso al bucket (`HeadObject` en key inexistente → 404 = OK)
4. Sube un objeto de prueba (`PutObject`)
5. Descarga y verifica checksum SHA-256 (`GetObject`)
6. Elimina el objeto de prueba (`DeleteObject`)
7. Imprime resumen estructurado y código de salida (0 = éxito, 1 = fallo)

### `db:backup`

Ejecuta un backup completo de la base de datos:

1. Valida `DATABASE_URL`
2. Localiza `pg_dump` (en Windows busca en rutas estándar de PostgreSQL)
3. Extrae el dump SQL de la base de datos
4. Comprime con gzip
5. Sube a Cloudflare R2 (si las credenciales están configuradas)
6. Aplica retención: conserva solo los 7 backups más recientes (prefijo `backup-`)
7. Limpia archivos temporales
8. Retorna `{ uploadOk, filename, timestamp }`

---

## Programación automática

El scheduler existente (`backend/scripts/scheduler.js`) ejecuta el backup diariamente a las **3:00 AM** usando `node-cron`. No requiere configuración adicional.

---

## Optimizaciones implementadas

| Área | Antes | Después |
|------|-------|---------|
| S3 Client | Creado por cada operación | Cliente reutilizable (singleton) |
| Timeouts | Sin timeouts (bloqueo infinito) | 30s conexión, 120s lectura, 5min upload |
| Logging | `console.log` básico | Logging con timestamp ISO 8601 |
| Validación | Solo `DATABASE_URL` | Validación temprana de credenciales S3 |
| Bucket check | No se verifica | `HeadBucketCommand` antes de subir |
| Retención | Siempre se ejecuta | Solo si S3 está habilitado y subida exitosa |
| Limpieza temp | En `finally` | En `finally` con `.catch(() => {})` |
| Valor de retorno | `undefined` | `{ uploadOk, filename, timestamp }` |

---

## Solución de problemas

### Error: "Faltan variables de entorno requeridas"

Asegúrese de que `backend/.env` existe y contiene `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET_NAME` y `AWS_ENDPOINT` con valores reales.

### Error: "NoSuchBucket" o bucket no accesible

Verifique que el bucket exista en Cloudflare R2 y que las credenciales tengan permisos de lectura/escritura sobre ese bucket.

### Error: pg_dump no encontrado

En Windows, instale PostgreSQL y asegúrese de que `pg_dump.exe` esté en una de las rutas buscadas:
- `C:/Program Files/PostgreSQL/14/bin/pg_dump.exe`
- `C:/Program Files/PostgreSQL/15/bin/pg_dump.exe`
- `C:/Program Files/PostgreSQL/16/bin/pg_dump.exe`
- `C:/Program Files/PostgreSQL/17/bin/pg_dump.exe`
- `C:/Program Files/PostgreSQL/18/bin/pg_dump.exe`

O agregue `pg_dump` al PATH del sistema.

### Error: SSL certificate

Si la URL de base de datos usa `sslmode=verify-full`, el script la ajusta automáticamente a `sslmode=require`.

---

## Estructura del bucket en R2

```
<bucket>/
  backup-2026-10-23T03-00-00.sql.gz   ← backups diarios (máx. 7)
  backup-2026-10-22T03-00-00.sql.gz
  ...
  horarios/                            ← otros archivos (no tocados por el backup)
  probe-r2/                            ← objetos temporales de prueba (limpiados automáticamente)
```
