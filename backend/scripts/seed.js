import bcrypt from 'bcryptjs';
import { query } from '../src/config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Carga el .env de la carpeta backend sin importar desde qué directorio ejecutes el comando
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function seed() {
  console.log('OK: Iniciando seed v2.0 para CECyTE Plantel 1...');

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL es undefined. Revisa la ruta de tu archivo .env');
    process.exit(1);
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@cecyte1.edu.mx';
  const passwordPlano = process.env.ADMIN_PASSWORD || 'Admin_Dev_Local_123!';
  const hash = await bcrypt.hash(passwordPlano, 12);

  try {
    const cicloRes = await query(
      `INSERT INTO ciclos_escolares (nombre, fecha_inicio, fecha_fin, activo)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (nombre) DO UPDATE SET activo = true
       RETURNING id, nombre`,
      ['2025-2026', '2025-08-01', '2026-07-31']
    );
    console.log('OK: Ciclo escolar activo configurado:', cicloRes.rows[0].nombre);

    const adminRes = await query(
      `INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol)
       VALUES ($1, $2, $3, $4, 'administrador')
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email`,
      ['Admin', 'CECyTE', adminEmail, hash]
    );

    if (adminRes.rows.length > 0) {
      console.log('OK: Administrador principal creado:', adminRes.rows[0].email);
    } else {
      console.log('ALERTA:  El usuario administrador ya existe en la base de datos.');
    }
  } catch (err) {
    console.error('ERROR: Error completo:', err);
  } finally {
    process.exit(0);
  }
}

seed();