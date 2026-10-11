// ============================================================
// Generador de permisos: siembra roles/permisos/roles_permisos
// en la BD a partir del catálogo backend/src/config/permisos.js.
//
// IDEMPOTENTE: se puede correr múltiples veces; usa ON CONFLICT DO NOTHING
// y reconstruye la matriz desde cero en una transacción.
//
// Uso:  node scripts/generarPermisos.js
// Requiere: DATABASE_URL en el entorno (igual que el resto del backend).
//
// NO modifica usuarios.rol ni obliga a migrar datos existentes. La app
// sigue funcionando con requireRole/requirePermiso sobre el catálogo en
// código; estas tablas habilitan gestión dinámica futura.
// ============================================================
import { query } from '../src/config/db.js';
import {
  ROLES,
  MODULOS,
  TODOS_LOS_PERMISOS,
  permisosDeRol,
} from '../src/config/permisos.js';

const main = async () => {
  console.log('Sembrando RBAC desde el catálogo...');

  // --- 1) Roles ---
  // Insertar roles respetando hereDa_de: primero los que no heredan, luego los demás.
  const nombres = Object.keys(ROLES);
  const insertados = new Set();
  // Orden topológico: inserta un rol solo cuando su hereDaDe ya existe.
  let pendientes = [...nombres];
  while (pendientes.length > 0) {
    const antes = pendientes.length;
    const aunPendientes = [];
    for (const nombre of pendientes) {
      const padre = ROLES[nombre].hereDaDe;
      if (padre && !insertados.has(padre)) {
        aunPendientes.push(nombre); // aún no se puede (falta el padre)
        continue;
      }
      await query(
        `INSERT INTO roles (nombre, descripcion, hereDa_de, es_sistema, activo)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (nombre) DO UPDATE
           SET descripcion = EXCLUDED.descripcion,
               hereDa_de  = EXCLUDED.hereDa_de,
               es_sistema = EXCLUDED.es_sistema`,
        [nombre, ROLES[nombre].descripcion, padre || null, !!ROLES[nombre].esSistema]
      );
      insertados.add(nombre);
    }
    pendientes = aunPendientes;
    if (pendientes.length === antes) {
      throw new Error(`Ciclo o padre inexistente en herencia de roles: ${pendientes.join(', ')}`);
    }
  }
  console.log(`  Roles sembrados: ${insertados.size}`);

  // --- 2) Permisos ---
  for (const codigo of TODOS_LOS_PERMISOS) {
    const [modulo, accion] = codigo.split('.');
    await query(
      `INSERT INTO permisos (codigo, modulo, accion)
       VALUES ($1, $2, $3)
       ON CONFLICT (codigo) DO UPDATE SET modulo = EXCLUDED.modulo, accion = EXCLUDED.accion`,
      [codigo, modulo, accion]
    );
  }
  console.log(`  Permisos sembrados: ${TODOS_LOS_PERMISOS.length}`);

  // --- 3) Matriz roles_permisos (reconstruida desde el resolver, con herencia) ---
  await query('DELETE FROM roles_permisos');
  let relaciones = 0;
  for (const nombre of nombres) {
    const rolRes = await query('SELECT id FROM roles WHERE nombre = $1', [nombre]);
    const rolId = rolRes.rows[0].id;
    const efectivos = [...permisosDeRol(nombre)]; // ya incluye herencia
    for (const codigo of efectivos) {
      const permRes = await query('SELECT id FROM permisos WHERE codigo = $1', [codigo]);
      if (!permRes.rows[0]) continue;
      await query(
        `INSERT INTO roles_permisos (rol_id, permiso_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [rolId, permRes.rows[0].id]
      );
      relaciones++;
    }
  }
  console.log(`  Relaciones rol↔permiso: ${relaciones}`);

  console.log('Listo. RBAC sembrado.');
  process.exit(0);
};

main().catch((err) => {
  console.error('Error sembrando RBAC:', err);
  process.exit(1);
});
