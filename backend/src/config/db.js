import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error(' Error crítico al conectar a Neon:', err.message);
  } else {
    console.log(' Conexión a PostgreSQL (Neon) establecida correctamente');
  }
  release();
});

pool.on('error', (err) => {
  console.error(' Error inesperado en el cliente de PostgreSQL:', err.message);
});

export const query = (text, params) => pool.query(text, params);

export const withTransaction = async (operation) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
