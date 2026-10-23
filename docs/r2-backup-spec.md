# Especificación: Backups a Cloudflare R2

## 1. Alcance

Especificación técnica para el sistema de backups de base de datos PostgreSQL almacenados en Cloudflare R2 (S3-compatible). Aplica al entorno CECyTE Platform.

---

## 2. Requisitos funcionales

| ID | Requisito | Descripción |
|----|-----------|-------------|
| RF-01 | Backup diario | Ejecutar backup automático de la base de datos todos los días a las 3:00 AM |
| RF-02 | Compresión | Los backups deben comprimirse con gzip antes de subir |
| RF-03 | Almacenamiento R2 | Los backups deben subirse a Cloudflare R2 como objetos S3-compatible |
| RF-04 | Retención | Conservar solo los 7 backups más recientes; eliminar los anteriores |
| RF-05 | Prueba de conectividad | Disponer de un comando para verificar conectividad activa con R2 |
| RF-06 | Limpieza temporal | Eliminar archivos temporales (SQL y gz) después del backup |
| RF-07 | Fallo graceful | Si R2 no está disponible, generar backup localmente y continuar |
| RF-08 | Logging | Registrar todos los pasos con timestamp ISO 8601 |

---

## 3. Requisitos no funcionales

| ID | Requisito | Criterio |
|----|-----------|----------|
| RNF-01 | Timeout de conexión S3 | Máximo 30 segundos |
| RNF-02 | Timeout de lectura S3 | Máximo 120 segundos |
| RNF-03 | Timeout de upload | Máximo 300 segundos (5 min) |
| RNF-04 | Validación temprana | Fallar antes de iniciar pg_dump si faltan credenciales críticas |
| RNF-05 | Checksum | Verificar integridad con SHA-256 en pruebas de conectividad |
| RNF-06 | Prefijos aislados | Los backups usan prefijo `backup-`; nunca tocar otros prefijos (ej. `horarios/`) |

---

## 4. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    CECyTE Platform                          │
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ scheduler.js│───▶│   backup.js  │───▶│   pg_dump    │   │
│  │ (cron 3 AM) │    │ (optimizado) │    │ (PostgreSQL) │   │
│  └─────────────┘    └──────────────┘    └──────┬───────┘   │
│                           │                    │            │
│                           ▼                    ▼            │
│                    ┌──────────────┐    ┌──────────────┐   │
│                    │   gzip       │    │  archivos    │   │
│                    │  compresión  │    │ temporales   │   │
│                    └──────┬───────┘    └──────┬───────┘   │
│                           │                   │            │
│                           ▼                   ▼            │
│                    ┌─────────────────────────────────┐    │
│                    │   S3Client (R2-compatible)     │    │
│                    │   • forcePathStyle: true        │    │
│                    │   • endpoint custom (R2)        │    │
│                    │   • timeouts configurados       │    │
│                    └─────────────────────────────────┘    │
│                           │                               │
│                           ▼                               │
│                    ┌─────────────────────────────────┐    │
│                    │   Cloudflare R2 Bucket          │    │
│                    │   backup-*.sql.gz (máx. 7)      │    │
│                    └─────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. API del script de backup

### `backup()`

Retorna una promesa que resuelve a:

```ts
{
  uploadOk: boolean;   // true si se subió a R2 exitosamente
  filename: string;    // nombre del archivo backup
  timestamp: string;   // timestamp ISO 8601 sin dos puntos/puntos
}
```

Lanza error si:
- `DATABASE_URL` no está definida
- `pg_dump` falla
- La compresión falla
- La subida a R2 falla (cuando S3 está habilitado)

---

## 6. Prueba de conectividad (`db:r2-probe`)

### Secuencia de pruebas

1. **Configuración**: Valida que `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET_NAME`, `AWS_ENDPOINT` estén definidas
2. **S3Client**: Verifica inicialización del cliente
3. **Bucket**: `HeadObject` en key inexistente → espera 404 (bucket existe)
4. **Upload**: `PutObject` de un objeto de prueba con contenido conocido
5. **Download + Checksum**: `GetObject`, verifica SHA-256 contra el original
6. **Cleanup**: `DeleteObject` del objeto de prueba

### Salida

Ejemplo de salida exitosa:

```
[R2-PROBE] [INFO] Región: auto
[R2-PROBE] [INFO] Endpoint: https://xxxx.r2.cloudflarestorage.com
[R2-PROBE] [INFO] Bucket: cecyte-backups
[R2-PROBE] [INFO] Objeto de prueba: probe-r2/1729680000000-test-object.bin
[OK]  [R2-PROBE] S3Client_inicializado — 45 ms
[OK]  [R2-PROBE] Bucket_accesible — 120 ms (objeto no existe, bucket responde 404)
[OK]  [R2-PROBE] Upload_objeto_prueba — 350 ms, 92 bytes
[OK]  [R2-PROBE] Download_y_verificacion — 280 ms, 92 bytes, SHA-256 coincide
[OK]  [R2-PROBE] Limpieza_objeto_prueba — 150 ms

═══════════════════════════════════════════════════
 RESULTADO: 5/5 checks pasaron
   Aprobados: 5
   Fallidos: 0
═══════════════════════════════════════════════════
[OK]  [R2-PROBE] Cloudflare R2 responde correctamente. La conexión está activa.
```

Código de salida: `0` = éxito, `1` = fallo.

---

## 7. Variables de entorno

| Variable | Requerido | Descripción | Ejemplo |
|----------|-----------|-------------|---------|
| `DATABASE_URL` | Sí | URL de conexión a PostgreSQL | `postgresql://user:pass@host/db?sslmode=require` |
| `AWS_REGION` | Sí | Región para S3 SDK (R2 usa `auto`) | `auto` |
| `AWS_ENDPOINT` | Sí | Endpoint de Cloudflare R2 | `https://<acct>.r2.cloudflarestorage.com` |
| `AWS_ACCESS_KEY_ID` | Sí | Access key de R2 | `...` |
| `AWS_SECRET_ACCESS_KEY` | Sí | Secret key de R2 | `...` |
| `AWS_BUCKET_NAME` | Sí | Nombre del bucket R2 | `cecyte-backups` |

---

## 8. Política de retención

- Se conservan los **7 backups más recientes** con prefijo `backup-`
- La retención solo se aplica si:
  1. S3 está habilitado (credenciales definidas)
  2. La subida del backup actual fue exitosa
- Los objetos con otros prefijos (ej. `horarios/`) **no** se tocan
- Los backups se ordenan alfabéticamente por key (equivale a orden cronológico por el formato del timestamp)

---

## 9. Manejo de errores

| Escenario | Comportamiento |
|-----------|---------------|
| `DATABASE_URL` falta | Salida inmediata con código 1 |
| Credenciales R2 faltantes | Backup local, sin subida a la nube (advertencia) |
| Bucket R2 inaccesible | Backup local, sin subida (advertencia) |
| `pg_dump` falla | Error lanzado, backup abortado |
| Subida a R2 falla | Error lanzado (cuando S3 habilitado) |
| Eliminación de backups antiguos falla | Error capturado y registrado, no aborta el backup |
| Limpieza de archivos temporales falla | Error capturado silenciosamente |

---

## 10. Comandos

```bash
# Probar conectividad R2
npm run db:r2-probe

# Ejecutar backup manual
npm run db:backup

# El scheduler ejecuta automáticamente a las 3 AM (node-cron)
```