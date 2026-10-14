# Plataforma Web Educativa — CECyTE Plantel 1

Plataforma web para apoyar la gestión académica y administrativa del CECyTE Plantel 1, en Macuspana, Tabasco. Reúne herramientas para personal escolar, docentes, estudiantes y aspirantes en una aplicación con acceso basado en roles y permisos.

## Funcionalidades

- **Admisión e inscripciones:** información pública, seguimiento de aspirantes, inscripciones y reinscripciones.
- **Gestión académica:** ciclos y periodos escolares, grupos, materias, calificaciones, asistencia e incidencias.
- **Servicios al estudiante:** expediente, becas, pagos, servicio social y titulación.
- **Herramientas para docentes:** consulta y administración de clases, grupos, asistencia, calificaciones e incidencias.
- **Operación institucional:** usuarios, horarios, comunicados, tutorías, reportes y auditoría.
- **Documentos y reportes:** generación de boletas, constancias, horarios, listados y estadísticas en formatos PDF, DOCX y XLSX.

El acceso a las funciones se controla mediante autenticación y permisos. La interfaz también incluye páginas públicas e informativas y vistas adaptadas a los distintos perfiles.

## Tecnologías

| Componente | Tecnologías |
| --- | --- |
| Interfaz web | React 18, React Router, Vite |
| API | Node.js, Express, PostgreSQL |
| Acceso a datos | PostgreSQL/Neon; migraciones SQL versionadas |
| Servicios opcionales | Redis, SMTP y almacenamiento compatible con S3 (por ejemplo, Cloudflare R2) |
| Generación de documentos | Python, ReportLab, python-docx y openpyxl |
| Despliegue configurado | Vercel para frontend y Render para backend |

## Requisitos

- Node.js 20 o posterior y npm.
- Docker Desktop con Docker Compose, o una instancia local de PostgreSQL 16.
- Python 3.10 o posterior y pip, para instalar o ejecutar el generador de documentos.

Redis, correo SMTP y almacenamiento S3/R2 son opcionales para ejecutar la aplicación básica; las funciones que los usan requieren su configuración correspondiente.

## Inicio rápido en desarrollo

### 1. Instalar dependencias

Desde la raíz del repositorio:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 2. Iniciar servicios locales

En otra terminal, desde la raíz:

```bash
docker compose up -d postgres redis mailhog
```

PostgreSQL queda disponible en `localhost:5432`, Redis en `localhost:6379` y el buzón SMTP de desarrollo en `localhost:1025`, con su interfaz web en `http://localhost:8025`. Las credenciales locales de PostgreSQL están definidas en `docker-compose.yml`; no deben reutilizarse en producción.

También es posible usar una instancia propia de PostgreSQL y omitir los contenedores que no se necesiten.

### 3. Configurar variables de entorno

Crea los archivos locales a partir de las plantillas:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

En macOS/Linux:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Configura en `backend/.env`, como mínimo:

```dotenv
DATABASE_URL=postgresql://cecyte:cecyte123@localhost:5432/cecyte
LOCAL_DATABASE_URL=postgresql://cecyte:cecyte123@localhost:5432/cecyte
JWT_SECRET=reemplazar-por-un-secreto-aleatorio-largo
CORS_ORIGIN=http://localhost:5173
```

Usa valores distintos y seguros fuera del entorno local. Conserva las plantillas como referencia para las variables opcionales de correo, Redis y almacenamiento. En `frontend/.env`, `VITE_API_PROXY_TARGET` puede apuntar al backend local; su valor predeterminado es `http://localhost:4000`.

### 4. Preparar la base de datos local

Con PostgreSQL en ejecución y las variables configuradas:

```bash
npm run db:setup-local --prefix backend
npm run db:migrate --prefix backend
```

El primer comando aplica el esquema inicial y el segundo ejecuta las migraciones pendientes. Los scripts locales validan que la conexión apunte a un host local; no los uses para modificar una base remota o de producción.

### 5. Ejecutar la aplicación

Desde la raíz del repositorio:

```bash
npm run dev
```

El frontend queda disponible en `http://localhost:5173` y la API en `http://localhost:4000`. Vite reenvía las solicitudes `/api` al backend. También se pueden iniciar por separado con `npm run dev:frontend` y `npm run dev:backend`.

## Pruebas y compilación

Ejecuta las pruebas automatizadas del backend desde su directorio:

```bash
cd backend
node --test
```

Compila el frontend para producción desde la raíz:

```bash
npm run build --prefix frontend
```

El backend también ofrece scripts específicos de verificación y mantenimiento en `backend/package.json`, incluidos `test:servicios`, `test:auditoria` y `test:migrate`. Algunos dependen de servicios locales o variables de entorno; consulta cada script antes de ejecutarlo.

## Generación de documentos

El motor Python vive en `backend/python`. Instala sus dependencias:

```bash
python -m pip install -r backend/python/requirements.txt
```

El backend lo invoca para generar boletas, constancias, horarios y reportes. Puedes seleccionar el intérprete con `PYTHON_BIN` si `python` no es el ejecutable adecuado en tu sistema. Para el uso directo por línea de comandos y la previsualización, consulta [la guía del motor Python](backend/python/README.md).

## API y estado del servicio

La API está montada bajo `/api`. Sus áreas principales incluyen autenticación, usuarios, aspirantes, inscripciones, grupos, materias, calificaciones, asistencia, horarios, incidencias, becas, pagos, expediente, servicio social, titulación, comunicados, reportes y auditoría.

- `GET /health`: estado del servicio y sus dependencias.
- `GET /ready`: disponibilidad de la API para atender solicitudes.
- `GET /metrics`: métricas básicas del proceso.

## Estructura del repositorio

```text
.
├── backend/
│   ├── python/       # Generación de documentos
│   ├── scripts/      # Migraciones, datos y tareas operativas
│   ├── src/
│   │   ├── config/   # Configuración de infraestructura y permisos
│   │   ├── controllers/
│   │   ├── db/       # Esquema y migraciones SQL
│   │   ├── routes/
│   │   └── services/
│   └── tests/
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── services/
├── docker-compose.yml
└── package.json
```

## Despliegue

El repositorio incluye configuración de despliegue para Render (`backend/render.yaml`) y Vercel (`frontend/vercel.json`). Antes de desplegar:

1. Configura `DATABASE_URL` y un `JWT_SECRET` seguro en el backend.
2. Define `CORS_ORIGIN` con el origen real del frontend y configura `FRONTEND_URL` cuando se utilicen enlaces de invitación.
3. Configura SMTP y almacenamiento S3/R2 si se habilitan las funciones de correo o archivos.
4. Instala Python y las dependencias de `backend/python/requirements.txt` en el entorno del backend si se generan documentos.
5. Aplica los cambios de esquema de forma controlada y con respaldo; no ejecutes herramientas locales de inicialización o migración contra producción.

Consulta las plantillas `.env.example` y los archivos de despliegue para revisar las variables y destinos concretos de cada entorno. Nunca publiques archivos `.env`, credenciales, tokens ni datos reales de estudiantes.
