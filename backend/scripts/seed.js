import bcrypt from 'bcryptjs';
import { query } from './config/db.js'; // Ajusta la ruta relativa si tu seed está en otra carpeta (ej. '../config/db.js')
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Carga el .env de la raíz del proyecto
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // Ajusta '../.env' o '../../.env' dependiendo de dónde ubiques este archivo

async function seed() {
  console.log(' Iniciando seed v2.0 para CECyTE Plantel 1...');

  if (!process.env.DATABASE_URL) {
    console.error(' ERROR: DATABASE_URL es undefined. Revisa la ruta de tu archivo .env');
    process.exit(1);
  }

  try {
    // 1. Configurar Ciclo Escolar Inicial
    const cicloRes = await query(
      `INSERT INTO ciclos_escolares (nombre, fecha_inicio, fecha_fin, activo)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (nombre) DO UPDATE SET activo = true
       RETURNING id, nombre`,
      ['2025-2026', '2025-08-01', '2026-07-31']
    );
    console.log(' Ciclo escolar activo configurado:', cicloRes.rows[0].nombre);

    // 2. Hasheo seguro de contraseña genérica para los usuarios base
    const passwordPlano = process.env.ADMIN_PASSWORD || 'Admin_Dev_Local_123!';
    const hash = await bcrypt.hash(passwordPlano, 12);

    // 3. Crear Usuarios Base para cada rol permitido ('administrador', 'docente', 'alumno')
    const usuariosBase = [
      {
        nombre: 'Admin',
        apellidos: 'CECyTE Principal',
        email: process.env.ADMIN_EMAIL || 'admin@cecyte1.edu.mx',
        rol: 'administrador'
      },
      {
        nombre: 'Juan',
        apellidos: 'Pérez Docente',
        email: 'docente@cecyte1.edu.mx',
        rol: 'docente'
      },
      {
        nombre: 'María',
        apellidos: 'González Alumna',
        email: 'alumno@cecyte1.edu.mx',
        rol: 'alumno'
      }
    ];

    for (const user of usuariosBase) {
      const userRes = await query(
        `INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol, activo)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (email) DO NOTHING
         RETURNING id, email, rol`,
        [user.nombre, user.apellidos, user.email, hash, user.rol]
      );

      if (userRes.rows.length > 0) {
        console.log(` Usuario [${user.rol}] creado exitosamente:`, userRes.rows[0].email);
      } else {
        console.log(`️ El usuario [${user.rol}] (${user.email}) ya existe en la base de datos.`);
      }
    }

    // 4. Catálogo de Documentos Esenciales para el Módulo de Expedientes (catalogo_documentos)
    const documentosCatalogo = [
      { clave: 'ACT_NAC', nombre: 'Acta de Nacimiento', etapa: 'inscripcion', obligatorio: true },
      { clave: 'CURP', nombre: 'CURP Actualizada', etapa: 'inscripcion', obligatorio: true },
      { clave: 'CERT_SEC', nombre: 'Certificado de Secundaria', etapa: 'inscripcion', obligatorio: true },
      { clave: 'COMP_DOM', nombre: 'Comprobante de Domicilio', etapa: 'inscripcion', obligatorio: true },
      { clave: 'FOT_INF', nombre: 'Fotografías Tamaño Infantil', etapa: 'inscripcion', obligatorio: false }
    ];

    for (const doc of documentosCatalogo) {
      await query(
        `INSERT INTO catalogo_documentos (clave, nombre, etapa, obligatorio)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (clave) DO NOTHING`,
        [doc.clave, doc.nombre, doc.etapa, doc.obligatorio]
      );
    }
    console.log(' Catálogo de documentos para expedientes sincronizado.');

    console.log(' Seed finalizado correctamente.');
  } catch (err) {
    console.error(' ERROR crítico durante la ejecución del seed:', err);
  } finally {
    process.exit(0);
  }
}

seed();