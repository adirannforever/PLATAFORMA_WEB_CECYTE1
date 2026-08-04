import bcrypt from 'bcryptjs';
import { query } from '../src/config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  console.log('iniciando "seed" para base de datos...');

  // esto es para el desarrollo local.
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@cecyte1.edu.mx';
  const passwordPlano = process.env.ADMIN_PASSWORD || 'Admin_Dev_Local_123!';

  const hash = await bcrypt.hash(passwordPlano, 12);

  try {
    const result = await query(
      `INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, rol`,
      ['Admin', 'CECyTE', adminEmail, hash, 'administrador']
    );
    
    // esto es de salida para la primera vez que se ejecuta la seed.
    console.log(' Administrador creado:', result.rows[0]);
    console.log(` Email:    ${adminEmail}`);
    console.log(` Password: [es definida en el archivo .env (ADMIN_PASSWORD)]`);
  } catch (err) {
    if (err.code === '23505') {
      console.log(' El administrador ya existe. No se creó duplicado.');
    } else {
      console.error(' Error:', err.message);
    }
  }

  process.exit(0);
}

seed();