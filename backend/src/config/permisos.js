// ============================================================
// SISTEMA DE ROLES Y PERMISOS (fuente de verdad, Backend).
// ------------------------------------------------------------
// Este módulo es LA fuente de verdad del control de acceso.
// Centraliza: qué roles existen, cómo se heredan, qué permisos
// (modulo.accion) concede cada rol, y helpers para evaluarlos.
//
// REGLA DE ORO (cero regresión): para los roles históricos
// (administrador, docente, alumno) este catálogo concede EXACTAMENTE
// lo que permitía requireRole(...) en cada ruta. Los roles nuevos
// (control_escolar, directivo, tutor, aspirante) son PURA ADICIÓN.
//
// Para agregar un rol o permiso en el futuro: editar SOLO este archivo
// (+ sembrar con scripts/generarPermisos.js si se quiere gestión en BD).
// ============================================================

// ------------------------------------------------------------
// 1. ROLES
//    hereDaDe: rol del que hereda todos los permisos (cadena). null = no hereda.
// ------------------------------------------------------------
export const ROLES = {
  administrador: {
    nombre: 'Administrador',
    descripcion: 'TI/Sistema. Acceso total y configuración del sistema.',
    hereDaDe: null,
    esSistema: true,
  },
  control_escolar: {
    nombre: 'Control Escolar',
    descripcion: 'Gestiona admisión, inscripciones, reinscripción, grupos y expedientes. No configura el sistema.',
    hereDaDe: null,
    esSistema: true,
  },
  directivo: {
    nombre: 'Directivo',
    descripcion: 'Director/Subdirector. Lectura amplia, reportes y aprobaciones. Sin edición operativa.',
    hereDaDe: null,
    esSistema: true,
  },
  docente: {
    nombre: 'Docente',
    descripcion: 'Gestiona calificaciones, asistencia e incidencias de sus materias/alumnos.',
    hereDaDe: null,
    esSistema: true,
  },
  tutor: {
    nombre: 'Tutor de grupo',
    descripcion: 'Docente con capacidades adicionales sobre su grupo: tutorías, citatorios y reinscripción.',
    hereDaDe: 'docente',
    esSistema: true,
  },
  alumno: {
    nombre: 'Alumno',
    descripcion: 'Consulta su información académica, pagos, reinscripción y servicios.',
    hereDaDe: null,
    esSistema: true,
  },
  aspirante: {
    nombre: 'Aspirante',
    descripcion: 'Usuario en proceso de admisión. Consulta el estatus de su solicitud.',
    hereDaDe: null,
    esSistema: true,
  },
};

// Lista rápida de nombres de rol válidos.

// ------------------------------------------------------------
// 3. MATRIZ DE PERMISOS POR ROL
//    Admite comodines: '*' (todo) y 'modulo.*' (todo el módulo).
//    El resolver expande comodines contra el catálogo.
// ------------------------------------------------------------
export const MATRIZ = {
  // Administrador: todo.
  administrador: ['*'],

  // Control escolar: operación escolar completa, sin config del sistema.
  control_escolar: [
    'dashboard.ver',
    'usuarios.ver', 'usuarios.editar',
    'aspirantes.*',
    'grupos.*',
    'inscripciones.*',
    'calificaciones.ver', 'calificaciones.ver_todas', 'calificaciones.ver_grupo',
    'asistencia.ver', 'asistencia.ver_grupo',
    'incidencias.ver', 'incidencias.ver_todas', 'incidencias.ver_grupo',
    'horarios.ver', 'horarios.ver_grupo',
    'reportes.ver', 'reportes.exportar',
    'expediente.*',
    'titulacion.*',
    'comunicados.ver',
    'servicio_social.ver',
  ],

  // Directivo: lectura amplia + reportes + aprobaciones.
  directivo: [
    'dashboard.ver',
    'usuarios.ver',
    'aspirantes.ver',
    'grupos.ver', 'grupos.ver_todos',
    'inscripciones.ver',
    'calificaciones.ver', 'calificaciones.ver_todas',
    'asistencia.ver',
    'incidencias.ver', 'incidencias.ver_todas',
    'horarios.ver',
    'reportes.ver', 'reportes.exportar',
    'expediente.ver', 'expediente.ver_todos',
    'becas.ver',
    'pagos.ver',
    'servicio_social.ver', 'servicio_social.aprobar',
    'titulacion.ver', 'titulacion.aprobar',
    'comunicados.ver',
    'auditoria.ver',
  ],

  // Docente: sus materias/alumnos.
  docente: [
    'dashboard.ver',
    'comunicados.ver',
    'grupos.ver', 'grupos.ver_mis_grupos',
    'calificaciones.ver', 'calificaciones.ver_mis_materias', 'calificaciones.crear', 'calificaciones.editar', 'calificaciones.regularizar',
    'asistencia.ver', 'asistencia.ver_mis_clases', 'asistencia.registrar_clase',
    'incidencias.ver', 'incidencias.ver_mis_alumnos', 'incidencias.crear', 'incidencias.editar', 'incidencias.resolver',
    'horarios.ver', 'horarios.ver_mi_horario',
    'reportes.ver', 'reportes.exportar',
    'tutorias.ver', 'tutorias.crear',
  ],

  // Tutor: hereda TODO lo de docente (vía hereDaDe) + alcance de su grupo.
  tutor: [
    'grupos.ver_mi_grupo',
    'calificaciones.ver_grupo',
    'asistencia.ver_grupo',
    'incidencias.ver_grupo', 'incidencias.crear', 'incidencias.editar', 'incidencias.resolver', 'incidencias.eliminar',
    'horarios.ver_grupo',
    'inscripciones.ver', 'inscripciones.reinscripcion_grupo',
    'expediente.ver',
    'servicio_social.ver', 'servicio_social.aprobar',
    'tutorias.ver', 'tutorias.crear',
    'reportes.ver', 'reportes.exportar',
  ],

  // Alumno: su propia información.
  alumno: [
    'dashboard.ver',
    'comunicados.ver',
    'usuarios.ver_propio',
    'grupos.ver_mi_grupo',
    'inscripciones.ver', 'inscripciones.reinscripcion_propia',
    'calificaciones.ver', 'calificaciones.ver_mis_calificaciones',
    'asistencia.ver',
    'incidencias.ver', 'incidencias.ver_mis_incidencias',
    'horarios.ver', 'horarios.ver_mi_horario',
    'reportes.ver', 'reportes.exportar',
    'expediente.ver_mi_expediente',
    'becas.ver', 'becas.ver_mis_becas',
    'pagos.ver', 'pagos.ver_mis_pagos',
    'servicio_social.ver',
    'titulacion.ver',
  ],

  // Aspirante: solo el estatus de su solicitud (portal mínimo).
  aspirante: [
    'dashboard.ver',
    'aspirantes.ver_propio',
    'comunicados.ver',
  ],
};

// ------------------------------------------------------------
// 4. RESOLVER
//    Expande comodines y herencia, con memo y protección de ciclo.
// ------------------------------------------------------------
const _cachePermisos = new Map();

function expandirComodines(lista) {
  const set = new Set();
  for (const item of lista) {
    if (item === '*') {
      TODOS_LOS_PERMISOS.forEach((p) => set.add(p));
      continue;
    }
    if (item.endsWith('.*')) {
      const modulo = item.slice(0, -2);
      (MODULOS[modulo] || []).forEach((a) => set.add(`${modulo}.${a}`));
      continue;
    }
    set.add(item);
  }
  return set;
}

// Devuelve el Set de permisos efectivos de un rol (con herencia).
export function permisosDeRol(rol) {
  if (!rol || !ROLES[rol]) return new Set();
  if (_cachePermisos.has(rol)) return _cachePermisos.get(rol);

  const acumulado = new Set();
  const visitados = new Set();
  let actual = rol;

  // Recorre la cadena de herencia evitando ciclos.
  while (actual && ROLES[actual] && !visitados.has(actual)) {
    visitados.add(actual);
    expandirComodines(MATRIZ[actual] || []).forEach((p) => acumulado.add(p));
    actual = ROLES[actual].hereDaDe;
  }

  _cachePermisos.set(rol, acumulado);
  return acumulado;
}

// ¿El rol tiene el permiso? Acepta código exacto o 'modulo.*'.
export function tienePermiso(rol, codigo) {
  const set = permisosDeRol(rol);
  if (set.has('*') || set.has(codigo)) return true;
  if (codigo.includes('.')) {
    const modulo = codigo.split('.')[0];
    const todasDelModulo = (MODULOS[modulo] || []).map((a) => `${modulo}.${a}`);
    return todasDelModulo.length > 0 && todasDelModulo.every((p) => set.has(p));
  }
  return false;
}

// Devuelve la lista (ordenada) de permisos efectivos de un rol.
// Útil para embeber en JWT/respuesta /me y que el frontend consuma.
export function listarPermisos(rol) {
  return [...permisosDeRol(rol)].sort();
}

export const ROLES_VALIDOS = Object.keys(ROLES);

// ------------------------------------------------------------
// 2. CATÁLOGO DE PERMISOS (modulo.accion)
//    Los códigos se generan como `${modulo}.${accion}`.
//    Los permisos de "alcance" (ver_mis_*, ver_grupo, ver_mi_*)
//    son advertidos a la UI; el ownership real se valida en controllers.
// ------------------------------------------------------------
export const MODULOS = {
  dashboard: ['ver'],
  comunicados: ['ver', 'crear', 'editar', 'eliminar'],
  usuarios: ['ver', 'ver_propio', 'crear', 'editar', 'eliminar', 'cambiar_password'],
  aspirantes: ['ver', 'ver_propio', 'crear', 'editar', 'eliminar', 'convertir'],
  grupos: ['ver', 'ver_todos', 'ver_mis_grupos', 'ver_mi_grupo', 'crear', 'editar', 'eliminar', 'asignar_materias'],
  inscripciones: ['ver', 'crear', 'eliminar', 'reinscripcion_propia', 'reinscripcion_grupo', 'dashboard_control'],
  calificaciones: ['ver', 'ver_todas', 'ver_mis_materias', 'ver_grupo', 'ver_mis_calificaciones', 'crear', 'editar', 'regularizar'],
  asistencia: ['ver', 'ver_mis_clases', 'ver_grupo', 'registrar_diaria', 'registrar_clase'],
  incidencias: ['ver', 'ver_todas', 'ver_mis_alumnos', 'ver_grupo', 'ver_mis_incidencias', 'crear', 'editar', 'resolver', 'eliminar'],
  horarios: ['ver', 'ver_mi_horario', 'ver_grupo', 'subir', 'editar', 'eliminar'],
  reportes: ['ver', 'exportar'],
  expediente: ['ver', 'ver_todos', 'ver_mi_expediente', 'crear', 'editar'],
  becas: ['ver', 'ver_mis_becas', 'crear', 'editar', 'eliminar', 'asignar'],
  pagos: ['ver', 'ver_mis_pagos', 'registrar'],
  servicio_social: ['ver', 'crear', 'editar', 'eliminar', 'aprobar'],
  titulacion: ['ver', 'crear', 'editar', 'eliminar', 'aprobar'],
  tutorias: ['ver', 'crear'],
  config_academica: ['ver', 'gestionar'],
  auditoria: ['ver', 'exportar'],
  sistema: ['backup'],
};

// Todos los códigos de permiso existentes (modulo.accion), ordenados.
export const TODOS_LOS_PERMISOS = Object.entries(MODULOS).flatMap(([modulo, acciones]) =>
  acciones.map((accion) => `${modulo}.${accion}`)
);
