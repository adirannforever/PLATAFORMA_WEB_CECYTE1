import { query } from '../config/db.js';

// ============================================================
// CREAR CICLOS FUTUROS AUTOMÁTICAMENTE
// ============================================================
export const crearCiclosFuturos = async () => {
  try {
    // Verificar si ya existe el ciclo 2026-2027
    const existe = await query(
      `SELECT id FROM ciclos_escolares WHERE nombre = '2026-2027'`
    );
    if (existe.rows.length === 0) {
      await query(
        `INSERT INTO ciclos_escolares (nombre, fecha_inicio, fecha_fin, activo)
         VALUES ('2026-2027', '2026-08-15', '2027-07-15', false)`
      );
      console.log(' Ciclo 2026-2027 creado automáticamente');
    }

    // Verificar 2027-2028
    const existe2 = await query(
      `SELECT id FROM ciclos_escolares WHERE nombre = '2027-2028'`
    );
    if (existe2.rows.length === 0) {
      await query(
        `INSERT INTO ciclos_escolares (nombre, fecha_inicio, fecha_fin, activo)
         VALUES ('2027-2028', '2027-08-15', '2028-07-15', false)`
      );
      console.log(' Ciclo 2027-2028 creado automáticamente');
    }
  } catch (err) {
    console.error(' Error al crear ciclos futuros:', err);
    throw err;
  }
};

// Si tienes otras funciones, expórtalas también
export const obtenerCicloActivo = async () => {
  const result = await query(
    `SELECT * FROM ciclos_escolares WHERE activo = TRUE LIMIT 1`
  );
  return result.rows[0] || null;
};

// Puedes agregar más funciones según necesites