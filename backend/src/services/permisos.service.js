// ============================================================
// Servicio de permisos respaldado por la BD (con cache y fallback).
// ------------------------------------------------------------
// Permite que requirePermiso y login/me resuelvan permisos desde las
// tablas roles/permisos/roles_permisos (gestión DINÁMICA) en lugar de
// solo el catálogo en código.
//
// Diseño:
//   - Cache en memoria (Map rol -> Set de codigos) cargado de la BD.
//   - Si la BD no está disponible o aún no cargó, FALLBACK al catálogo
//     en código (config/permisos.js). Nunca lanza: degrada con elegancia.
//   - refrescar() recarga el cache (llamar tras sembrar/editar la matriz).
//
// Regla: el catálogo en código sigue siendo la fuente de verdad del
// comportamiento base; la BD permite OVERRIDE/gestion sin tocar código.
// ============================================================
import { query } from '../config/db.js';
import { tienePermiso as tienePermisoCatalogo, permisosDeRol } from '../config/permisos.js';

// Cache: rol(nombre) -> Set<codigo>
let cache = null;
let cargando = false;

// Carga (o recarga) el cache desde la BD. Idempotente y seguro ante fallos.
export async function refrescar() {
  if (cargando) return;
  cargando = true;
  try {
    // Traer todos los roles con sus hereDa_de para resolver herencia en memoria.
    const rolesRes = await query('SELECT nombre, hereDa_de FROM roles');
    const matrizRes = await query(
      `SELECT r.nombre AS rol, p.codigo
         FROM roles_permisos rp
         JOIN roles r   ON r.id = rp.rol_id
         JOIN permisos p ON p.id = rp.permiso_id`
    );

    // Mapa de padres para herencia.
    const padreDe = new Map();
    for (const row of rolesRes.rows) padreDe.set(row.nombre, row.hereDa_de || null);

    // Permisos directos por rol.
    const directos = new Map();
    for (const row of matrizRes.rows) {
      if (!directos.has(row.rol)) directos.set(row.rol, new Set());
      directos.get(row.rol).add(row.codigo);
    }

    // Resolver herencia (con protección de ciclo).
    const nuevo = new Map();
    for (const rol of rolesRes.rows.map((r) => r.nombre)) {
      const set = new Set();
      const visitados = new Set();
      let actual = rol;
      while (actual && !visitados.has(actual)) {
        visitados.add(actual);
        (directos.get(actual) || new Set()).forEach((c) => set.add(c));
        actual = padreDe.get(actual) || null;
      }
      nuevo.set(rol, set);
    }

    cache = nuevo;
    console.log(`[permisos.service] Cache actualizado: ${nuevo.size} roles desde BD.`);
  } catch (err) {
    // Si falla (BD caída, tablas ausentes...), mantenemos fallback al catálogo.
    console.warn('[permisos.service] No se pudo refrescar desde BD; usando catálogo en código.', err.message);
    cache = null;
  } finally {
    cargando = false;
  }
}

// ¿Está el cache de BD activo?
export function usandoBD() {
  return cache !== null;
}

// ¿El rol tiene el permiso? Prioriza BD; si no hay cache, usa el catálogo.
export function tienePermiso(rol, codigo) {
  if (cache && cache.has(rol)) {
    const set = cache.get(rol);
    if (set.has('*') || set.has(codigo)) return true;
    if (codigo.endsWith('.*')) {
      const modulo = codigo.slice(0, -2);
      return [...set].some((c) => c.startsWith(`${modulo}.`));
    }
    return false;
  }
  // Fallback: catálogo en código.
  return tienePermisoCatalogo(rol, codigo);
}

// Lista de permisos efectivos de un rol. Prioriza BD; fallback al catálogo.
export function listarPermisosDeRol(rol) {
  if (cache && cache.has(rol)) {
    return [...cache.get(rol)].sort();
  }
  return [...permisosDeRol(rol)].sort();
}
