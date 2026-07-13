# CECyTE Plantel 1 — Plataforma Web Educativa

Sistema de gestión académica para el CECyTE Plantel 1.  
Desarrollado por: Adrián Gustavo Hernández Julián — UTTabasco 2025.

---

## Estructura del Proyecto

```
cecyte-platform/
├── backend/               ← Servidor Node.js + Express (API REST)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js          ← Conexión a PostgreSQL (Neon)
│   │   ├── controllers/       ← Lógica de cada módulo
│   │   │   ├── auth.controller.js
│   │   │   ├── usuarios.controller.js
│   │   │   ├── materias.controller.js
│   │   │   ├── inscripciones.controller.js
│   │   │   ├── calificaciones.controller.js
│   │   │   └── comunicados.controller.js
│   │   ├── middlewares/
│   │   │   └── auth.js        ← Verifica JWT y roles
│   │   ├── routes/            ← Define las URLs de la API
│   │   │   ├── auth.routes.js
│   │   │   ├── usuarios.routes.js
│   │   │   ├── materias.routes.js
│   │   │   ├── inscripciones.routes.js
│   │   │   ├── calificaciones.routes.js
│   │   │   └── comunicados.routes.js
│   │   └── index.js           ← Punto de entrada del servidor
│   ├── scripts/
│   │   └── seed.js            ← Crea el primer admin
│   ├── db/
│   │   └── schema.sql         ← SQL para crear las tablas en Neon
│   ├── .env.example           ← Plantilla de variables de entorno
│   └── package.json
├── frontend/              ← (Por construir — React + Vite)
├── .gitignore
└── package.json           ← Scripts para correr todo junto
```

---

## Configuración Inicial (Hazlo Una Vez)

### Paso 1 — Instala Node.js

Descarga la versión LTS desde https://nodejs.org  
Verifica la instalación:
```bash
node --version   # debe mostrar v18 o superior
npm --version
```

### Paso 2 — Crea la Base de Datos en Neon

1. Ve a https://console.neon.tech y crea una cuenta gratuita
2. Crea un nuevo proyecto (dale el nombre "cecyte")
3. En tu proyecto, haz clic en **"SQL Editor"**
4. Copia y pega TODO el contenido del archivo `backend/src/db/schema.sql`
5. Haz clic en **"Run"**
6. Verás las tablas creadas: usuarios, materias, inscripciones, calificaciones, comunicados

### Paso 3 — Obtén tu Connection String de Neon

1. En tu proyecto de Neon, haz clic en **"Connection Details"** (o "Connect")
2. Copia la **Connection string** — se ve así:
   ```
   postgresql://adriangustavo:abc123@ep-cool-name.us-east-2.aws.neon.tech/cecyte?sslmode=require
   ```
3. Guárdala, la necesitarás en el siguiente paso.

### Paso 4 — Configura las Variables de Entorno

```bash
# Entra a la carpeta del backend
cd backend

# Copia el archivo de ejemplo
cp .env.example .env
```

Abre el archivo `.env` con VS Code y llena los valores:

```env
PORT=4000
DATABASE_URL=postgresql://TU_URL_DE_NEON_AQUI
JWT_SECRET=una_clave_muy_larga_y_secreta_que_tu_inventas
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

**Para generar un JWT_SECRET seguro**, corre esto en tu terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copia el resultado y pégalo en `JWT_SECRET`.

### Paso 5 — Instala las Dependencias

```bash
# Desde la carpeta backend/
npm install
```

### Paso 6 — Crea el Primer Administrador

```bash
npm run db:seed
```

Verás:
```
✅ Administrador creado: { id: 1, email: 'admin@cecyte1.edu.mx', rol: 'administrador' }
   Email:    admin@cecyte1.edu.mx
   Password: Admin1234!  ← CAMBIA ESTO INMEDIATAMENTE
```

### Paso 7 — Arranca el Servidor

```bash
npm run dev
```

Verás:
```
✅ Conexión a PostgreSQL (Neon) establecida correctamente
🚀 Servidor CECyTE corriendo en http://localhost:4000
```

---

## Prueba la API con Postman

Descarga Postman desde https://www.postman.com/downloads/

### Prueba 1 — Login
- **Método:** POST
- **URL:** `http://localhost:4000/api/auth/login`
- **Body (JSON):**
  ```json
  {
    "email": "admin@cecyte1.edu.mx",
    "password": "Admin1234!"
  }
  ```
- **Resultado esperado:** Status 200, recibes los datos del usuario. La cookie `token` se guarda automáticamente.

### Prueba 2 — Ver si estás logueado
- **Método:** GET
- **URL:** `http://localhost:4000/api/auth/me`
- **Resultado esperado:** Status 200, tus datos de usuario.

### Prueba 3 — Crear un docente (como administrador)
- **Método:** POST
- **URL:** `http://localhost:4000/api/usuarios`
- **Body (JSON):**
  ```json
  {
    "nombre": "Juan",
    "apellidos": "Pérez García",
    "email": "jperez@cecyte1.edu.mx",
    "password": "Docente123!",
    "rol": "docente"
  }
  ```

### Prueba 4 — Crear un alumno
- **Método:** POST
- **URL:** `http://localhost:4000/api/usuarios`
- **Body (JSON):**
  ```json
  {
    "nombre": "María",
    "apellidos": "López Sánchez",
    "email": "mlopez@cecyte1.edu.mx",
    "password": "Alumno123!",
    "rol": "alumno"
  }
  ```

### Prueba 5 — Crear una materia
- **Método:** POST
- **URL:** `http://localhost:4000/api/materias`
- **Body (JSON):**
  ```json
  {
    "nombre": "Matemáticas I",
    "descripcion": "Álgebra y funciones básicas",
    "ciclo_escolar": "2024-2025",
    "docente_id": 2
  }
  ```
  *(El docente_id debe ser el ID del docente que creaste en la Prueba 3)*

---

## Resumen de Todos los Endpoints

| Método | URL | Rol requerido | Descripción |
|--------|-----|---------------|-------------|
| POST | /api/auth/login | — | Inicia sesión |
| POST | /api/auth/logout | Cualquiera | Cierra sesión |
| GET | /api/auth/me | Cualquiera | Usuario actual |
| GET | /api/usuarios | Admin | Lista usuarios |
| POST | /api/usuarios | Admin | Crea usuario |
| PATCH | /api/usuarios/:id | Admin | Edita usuario |
| DELETE | /api/usuarios/:id | Admin | Desactiva usuario |
| GET | /api/materias | Admin/Docente | Lista materias |
| POST | /api/materias | Admin | Crea materia |
| PATCH | /api/materias/:id | Admin | Edita materia |
| GET | /api/materias/:id/alumnos | Admin/Docente | Alumnos en materia |
| GET | /api/inscripciones/mis-materias | Alumno | Mis materias |
| POST | /api/inscripciones | Admin | Inscribe alumno |
| DELETE | /api/inscripciones/:id | Admin | Elimina inscripción |
| GET | /api/calificaciones/mis-calificaciones | Alumno | Mis calificaciones |
| GET | /api/calificaciones/materia/:id | Admin/Docente | Califs de materia |
| POST | /api/calificaciones | Admin/Docente | Registra calificación |
| PUT | /api/calificaciones/:id | Admin/Docente | Actualiza calificación |
| GET | /api/comunicados | Cualquiera | Lista comunicados |
| POST | /api/comunicados | Admin | Publica comunicado |
| PATCH | /api/comunicados/:id | Admin | Edita/archiva comunicado |
| GET | /api/health | — | Estado del servidor |

---

## Errores Comunes y Soluciones

**"Error al conectar a la base de datos"**
→ Verifica que `DATABASE_URL` en tu `.env` es correcto y que tu proyecto de Neon está activo.

**"Cannot find module"**
→ Corriste `npm install` en la carpeta correcta (`backend/`)?

**Status 401 en Postman**
→ Primero haz login (POST /api/auth/login). Asegúrate de que Postman está enviando cookies (Settings → Cookies).

**"El docente_id no corresponde a un docente activo"**
→ Usa el ID exacto del usuario con rol "docente" que creaste. Puedes verlos con GET /api/usuarios.

---

## Próximo Paso — Frontend

Una vez que todas las pruebas en Postman funcionen correctamente, el siguiente paso es construir la interfaz en React. El frontend usará las mismas URLs que probaste en Postman.

```bash
# Para crear el frontend (cuando estés listo):
cd frontend
npm create vite@latest . -- --template react
npm install
npm install axios
```

---

*Última actualización: 2025*
