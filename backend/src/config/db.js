import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,               
  idleTimeoutMillis: 30000,  
  connectionTimeoutMillis: 5000, 
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error al conectar a la base de datos:', err.message);
    process.exit(1);
  }
  release();
  console.log('✅ Conexión a PostgreSQL (Neon) establecida correctamente');
});

export const query = (text, params) => pool.query(text, params);

export default pool;
