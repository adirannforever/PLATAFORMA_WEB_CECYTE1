 
export const ROLES = {
  ADMINISTRADOR: 'administrador',
  DOCENTE: 'docente',
  ALUMNO: 'alumno',
};

export const MODULOS = {
  DASHBOARD: 'dashboard',
  COMUNICADOS: 'comunicados',
  USUARIOS: 'usuarios',
  GRUPOS: 'grupos',
  INSCRIPCIONES: 'inscripciones',
  CALIFICACIONES: 'calificaciones',
  ASISTENCIAS: 'asistencias',
  EXPEDIENTE: 'expediente',
  BECAS: 'becas',
  PAGOS: 'pagos',
  SERVICIO_SOCIAL: 'servicio_social',
  TUTORIAS: 'tutorias',
  TITULACION: 'titulacion',
  INCIDENCIAS: 'incidencias',
  AUDITORIA: 'auditoria',
  REPORTES: 'reportes',
  HORARIOS: 'horarios',
  CONFIGURACION_ACADEMICA: 'configuracion_academica',
};
 
export const ACCIONES = {
  CREAR: 'crear',
  EDITAR: 'editar',
  ELIMINAR: 'eliminar',
  VER: 'ver',
  RESOLVER: 'resolver',
  REGISTRAR: 'registrar',
  APROBAR: 'aprobar',
  EXPORTAR: 'exportar',
  SUBIR: 'subir',
};
 
export const PERMISOS = {
  // Dashboard - todos pueden ver
  [MODULOS.DASHBOARD]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE, ROLES.ALUMNO],
  },
  
  // Comunicados - todos pueden ver, solo admin puede gestionar
  [MODULOS.COMUNICADOS]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE, ROLES.ALUMNO],
    [ACCIONES.CREAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.EDITAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.ELIMINAR]: [ROLES.ADMINISTRADOR],
  },
  
  // Usuarios - solo admin
  [MODULOS.USUARIOS]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR],
    [ACCIONES.CREAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.EDITAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.ELIMINAR]: [ROLES.ADMINISTRADOR],
  },
  
  // Grupos - admin ve todos, docente ve sus grupos, alumno ve su grupo
  [MODULOS.GRUPOS]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE, ROLES.ALUMNO],
    [ACCIONES.CREAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.EDITAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.ELIMINAR]: [ROLES.ADMINISTRADOR],
    'ver_todos': [ROLES.ADMINISTRADOR],
    'ver_mis_grupos': [ROLES.DOCENTE],
    'ver_mi_grupo': [ROLES.ALUMNO],
  },
  
  // Inscripciones - solo admin
  [MODULOS.INSCRIPCIONES]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR],
    [ACCIONES.CREAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.ELIMINAR]: [ROLES.ADMINISTRADOR],
  },
  
  // Calificaciones - admin ve todo, docente sus materias, alumno las suyas
  [MODULOS.CALIFICACIONES]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE, ROLES.ALUMNO],
    [ACCIONES.CREAR]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE],
    [ACCIONES.EDITAR]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE],
    [ACCIONES.REGISTRAR]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE],
    'ver_todas': [ROLES.ADMINISTRADOR],
    'ver_mis_materias': [ROLES.DOCENTE],
    'ver_mis_calificaciones': [ROLES.ALUMNO],
  },
  
  // Asistencias - admin ve todo, docente sus materias, alumno las suyas
  [MODULOS.ASISTENCIAS]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE, ROLES.ALUMNO],
    [ACCIONES.CREAR]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE],
    [ACCIONES.REGISTRAR]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE],
  },
  
  // Expediente - admin ve todo, alumno ve el suyo
  [MODULOS.EXPEDIENTE]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR, ROLES.ALUMNO],
    [ACCIONES.CREAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.EDITAR]: [ROLES.ADMINISTRADOR],
    'ver_todos': [ROLES.ADMINISTRADOR],
    'ver_mi_expediente': [ROLES.ALUMNO],
  },
  
  // Becas - solo admin, alumno consulta
  [MODULOS.BECAS]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR, ROLES.ALUMNO],
    [ACCIONES.CREAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.EDITAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.ELIMINAR]: [ROLES.ADMINISTRADOR],
    'ver_mis_becas': [ROLES.ALUMNO],
  },
  
  // Pagos - solo admin, alumno consulta
  [MODULOS.PAGOS]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR, ROLES.ALUMNO],
    [ACCIONES.CREAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.REGISTRAR]: [ROLES.ADMINISTRADOR],
    'ver_mis_pagos': [ROLES.ALUMNO],
  },
  
  // Servicio Social - solo admin, alumno consulta
  [MODULOS.SERVICIO_SOCIAL]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR, ROLES.ALUMNO],
    [ACCIONES.CREAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.EDITAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.APROBAR]: [ROLES.ADMINISTRADOR],
    'ver_mi_servicio': [ROLES.ALUMNO],
  },
  
  // Tutorías - admin ve todo, docente (si es tutor) registra, alumno consulta
  [MODULOS.TUTORIAS]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE, ROLES.ALUMNO],
    [ACCIONES.CREAR]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE],
    [ACCIONES.REGISTRAR]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE],
  },
  
  // Titulación - solo admin, alumno consulta (si aplica)
  [MODULOS.TITULACION]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR, ROLES.ALUMNO],
    [ACCIONES.CREAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.EDITAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.APROBAR]: [ROLES.ADMINISTRADOR],
    'ver_mi_titulacion': [ROLES.ALUMNO],
  },
  
  // Incidencias - admin ve todo, docente ve/resuelve de sus alumnos, alumno consulta
  [MODULOS.INCIDENCIAS]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE, ROLES.ALUMNO],
    [ACCIONES.CREAR]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE],
    [ACCIONES.RESOLVER]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE],
    [ACCIONES.ELIMINAR]: [ROLES.ADMINISTRADOR],
    'ver_todas': [ROLES.ADMINISTRADOR],
    'ver_mis_alumnos': [ROLES.DOCENTE],
    'ver_mis_incidencias': [ROLES.ALUMNO],
  },
  
  // Auditoría - solo admin
  [MODULOS.AUDITORIA]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR],
    [ACCIONES.EXPORTAR]: [ROLES.ADMINISTRADOR],
  },
  
  // Reportes - admin ve todo, docente sus grupos, alumno los suyos
  [MODULOS.REPORTES]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE, ROLES.ALUMNO],
    [ACCIONES.EXPORTAR]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE, ROLES.ALUMNO],
  },
  
  // Horarios - admin gestiona, docente y alumno consultan
  [MODULOS.HORARIOS]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR, ROLES.DOCENTE, ROLES.ALUMNO],
    [ACCIONES.CREAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.EDITAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.ELIMINAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.SUBIR]: [ROLES.ADMINISTRADOR],
    'ver_mi_horario': [ROLES.DOCENTE, ROLES.ALUMNO],
  },
  
  // Configuración Académica - solo admin
  [MODULOS.CONFIGURACION_ACADEMICA]: {
    [ACCIONES.VER]: [ROLES.ADMINISTRADOR],
    [ACCIONES.CREAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.EDITAR]: [ROLES.ADMINISTRADOR],
    [ACCIONES.ELIMINAR]: [ROLES.ADMINISTRADOR],
  },
};
 
export const ETIQUETAS_MODULOS = {
  [MODULOS.DASHBOARD]: 'Inicio',
  [MODULOS.COMUNICADOS]: 'Comunicados',
  [MODULOS.USUARIOS]: 'Usuarios',
  [MODULOS.GRUPOS]: 'Grupos',
  [MODULOS.INSCRIPCIONES]: 'Inscripciones',
  [MODULOS.CALIFICACIONES]: 'Calificaciones',
  [MODULOS.ASISTENCIAS]: 'Asistencias',
  [MODULOS.EXPEDIENTE]: 'Expediente',
  [MODULOS.BECAS]: 'Becas',
  [MODULOS.PAGOS]: 'Pagos',
  [MODULOS.SERVICIO_SOCIAL]: 'Servicio Social',
  [MODULOS.TUTORIAS]: 'Tutorías',
  [MODULOS.TITULACION]: 'Titulación',
  [MODULOS.INCIDENCIAS]: 'Incidencias',
  [MODULOS.AUDITORIA]: 'Auditoría',
  [MODULOS.REPORTES]: 'Reportes',
  [MODULOS.HORARIOS]: 'Horarios',
  [MODULOS.CONFIGURACION_ACADEMICA]: 'Configuración Académica',
};

export const RUTAS_MODULOS = {
  [MODULOS.DASHBOARD]: '/dashboard',
  [MODULOS.COMUNICADOS]: '/comunicados',
  [MODULOS.USUARIOS]: '/usuarios',
  [MODULOS.GRUPOS]: '/grupos',
  [MODULOS.INSCRIPCIONES]: '/inscripciones',
  [MODULOS.CALIFICACIONES]: '/calificaciones',
  [MODULOS.ASISTENCIAS]: '/asistencia',
  [MODULOS.EXPEDIENTE]: '/expediente',
  [MODULOS.BECAS]: '/becas',
  [MODULOS.PAGOS]: '/pagos',
  [MODULOS.SERVICIO_SOCIAL]: '/servicio-social',
  [MODULOS.TUTORIAS]: '/tutorias',
  [MODULOS.TITULACION]: '/titulacion',
  [MODULOS.INCIDENCIAS]: '/incidencias',
  [MODULOS.AUDITORIA]: '/auditoria',
  [MODULOS.REPORTES]: '/reportes',
  [MODULOS.HORARIOS]: '/horarios',
  [MODULOS.CONFIGURACION_ACADEMICA]: '/configuracion-academica',
};