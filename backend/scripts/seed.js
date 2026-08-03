

import bcrypt from 'bcryptjs';
import { query } from '../src/config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  console.log(' Iniciando seed de la base de datos...');

  const passwordPlano = 'CECyTE_Admin_2026!@#67'; 
  const hash = await bcrypt.hash(passwordPlano, 12);

  try {
    const result = await query(
      `INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, rol`,
      ['Admin', 'CECyTE', 'admin@cecyte1.edu.mx', hash, 'administrador']
    );
    console.log('✅ Administrador creado:', result.rows[0]);
    console.log('   Email:    admin@cecyte1.edu.mx');
    console.log('   Password: Admin1234!');
  } catch (err) {
    if (err.code === '23505') {
      console.log('El administrador ya existe. No se creó duplicado.');
    } else {
      console.error('Error:', err.message);
    }
  }

  process.exit(0);
}

seed();
