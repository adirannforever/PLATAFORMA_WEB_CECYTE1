import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ===== AUTENTICACIÓN =====
export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// ===== USUARIOS =====
export const usuariosService = {
  //  CORREGIDO: params debe ser un objeto, no un string
  getAll: async (params = {}) => {
    const response = await api.get('/usuarios', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/usuarios/${id}`);
    return response.data;
  },
  crear: async (data) => {
    const response = await api.post('/usuarios', data);
    return response.data;
  },
  actualizar: async (id, data) => {
    const response = await api.patch(`/usuarios/${id}`, data);
    return response.data;
  },
  desactivar: async (id) => {
    const response = await api.delete(`/usuarios/${id}`);
    return response.data;
  },
};

// ===== MATERIAS =====
export const materiasService = {
  getAll: async () => {
    const response = await api.get('/materias');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/materias/${id}`);
    return response.data;
  },
  getAlumnos: async (id) => {
    const response = await api.get(`/materias/${id}/alumnos`);
    return response.data;
  },
  crear: async (data) => {
    const response = await api.post('/materias', data);
    return response.data;
  },
  actualizar: async (id, data) => {
    const response = await api.patch(`/materias/${id}`, data);
    return response.data;
  },
};

// ===== INSCRIPCIONES =====
export const inscripcionesService = {
  misMaterias: async () => {
    const response = await api.get('/inscripciones/mis-materias');
    return response.data;
  },
  inscribir: async (data) => {
    const response = await api.post('/inscripciones', data);
    return response.data;
  },
  eliminar: async (id) => {
    const response = await api.delete(`/inscripciones/${id}`);
    return response.data;
  },
  getAlumnosDisponibles: async () => {
    const response = await api.get('/inscripciones/alumnos-disponibles');
    return response.data;
  },
  getGruposDisponibles: async () => {
    const response = await api.get('/inscripciones/grupos-disponibles');
    return response.data;
  },
  getAlumnosDeGrupo: async (grupoId) => {
    const response = await api.get(`/inscripciones/grupo/${grupoId}/alumnos`);
    return response.data;
  },
};

// ===== CALIFICACIONES =====
export const calificacionesService = {
  misCalificaciones: async () => {
    const response = await api.get('/calificaciones/mis-calificaciones');
    return response.data;
  },
  porMateria: async (materiaId) => {
    const response = await api.get(`/calificaciones/materia/${materiaId}`);
    return response.data;
  },
  registrar: async (data) => {
    const response = await api.post('/calificaciones', data);
    return response.data;
  },
  actualizar: async (id, calificacion) => {
    const response = await api.put(`/calificaciones/${id}`, { calificacion });
    return response.data;
  },
  getPeriodosEvaluacion: async (materia_grupo_id) => {
    const response = await api.get(`/calificaciones/periodos/${materia_grupo_id}`);
    return response.data;
  },
};

// ===== COMUNICADOS =====
export const comunicadosService = {
  getAll: async () => {
    const response = await api.get('/comunicados');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/comunicados/${id}`);
    return response.data;
  },
  crear: async (data) => {
    const response = await api.post('/comunicados', data);
    return response.data;
  },
  actualizar: async (id, data) => {
    const response = await api.patch(`/comunicados/${id}`, data);
    return response.data;
  },
};

// ===== ASISTENCIAS =====
export const asistenciaService = {
  getAsistenciaDiaria: async (params) => {
    const response = await api.get('/asistencia/diaria', { params });
    return response.data;
  },
  registrarAsistenciaDiaria: async (data) => {
    const response = await api.post('/asistencia/diaria', data);
    return response.data;
  },
  getAsistenciaClase: async (params) => {
    const response = await api.get('/asistencia/clase', { params });
    return response.data;
  },
  registrarAsistenciaClase: async (data) => {
    const response = await api.post('/asistencia/clase', data);
    return response.data;
  },
  guardarAsistenciasLote: async (data) => {
    const response = await api.post('/asistencia/clase/lote', data);
    return response.data;
  },
};

// ===== ASPIRANTES =====
export const aspirantesService = {
  getAspirantes: async (params) => {
    const response = await api.get('/aspirantes', { params });
    return response.data;
  },
  crearAspirante: async (data) => {
    const response = await api.post('/aspirantes', data);
    return response.data;
  },
  actualizarEstatusAspirante: async (id, data) => {
    const response = await api.patch(`/aspirantes/${id}/estatus`, data);
    return response.data;
  },
  convertir: async (data) => {
    const response = await api.post('/aspirantes/convertir', data);
    return response.data;
  },
};

// ===== BECAS =====
export const becasService = {
  getAll: async (params = {}) => {
    const response = await api.get('/becas', { params });
    return response.data;
  },
  getDetalle: async (nombre_beca, params = {}) => {
    const response = await api.get(`/becas/detalle/${encodeURIComponent(nombre_beca)}`, { params });
    return response.data;
  },
  crear: async (data) => {
    const response = await api.post('/becas', data);
    return response.data;
  },
  asignar: async (data) => {
    const response = await api.post('/becas/asignar', data);
    return response.data;
  },
  actualizar: async (id, data) => {
    const response = await api.put(`/becas/${id}`, data);
    return response.data;
  },
  actualizarEstatusPago: async (id, data) => {
    const response = await api.patch(`/becas/${id}/estatus-pago`, data);
    return response.data;
  },
  eliminar: async (id) => {
    const response = await api.delete(`/becas/${id}`);
    return response.data;
  },
};

export const catalogosService = {
  getCiclos: async () => {
    const response = await api.get('/catalogos/ciclos');
    return response.data;
  },
  getCicloActivo: async () => {
    const response = await api.get('/catalogos/ciclos/activo');
    return response.data;
  },
  getGrupos: async () => {
    const response = await api.get('/catalogos/grupos');
    return response.data;
  },
  getEspecialidades: async () => {
    const response = await api.get('/catalogos/especialidades');
    return response.data;
  },
  getTurnos: async () => {
    const response = await api.get('/catalogos/turnos');
    return response.data;
  },
  getEdificios: async () => {
    const response = await api.get('/catalogos/edificios');
    return response.data;
  },
  getAulas: async () => {
    const response = await api.get('/catalogos/aulas');
    return response.data;
  },
  getPeriodos: async () => {
    const response = await api.get('/catalogos/periodos');
    return response.data;
  },
  getMaterias: async () => {
    const response = await api.get('/catalogos/materias');
    return response.data;
  },
  getConceptosPago: async () => {
    const response = await api.get('/catalogos/conceptos-pago');
    return response.data;
  },
  getDocumentos: async () => {
    const response = await api.get('/catalogos/documentos');
    return response.data;
  },
  getDocentes: async () => {
    const response = await api.get('/catalogos/docentes');
    return response.data;
  },
  getAlumnos: async () => {
    const response = await api.get('/catalogos/alumnos');
    return response.data;
  },
};

// ===== EXPEDIENTE =====
export const expedienteService = {
  getByAlumnoId: async (alumnoId) => {
    const response = await api.get(`/expediente/${alumnoId}`);
    return response.data;
  },
  actualizarDocumento: async (data) => {
    const response = await api.post('/expediente/documento', data);
    return response.data;
  },
  getAlumnosConExpediente: async (params = '') => {
    const response = await api.get(`/expediente/alumnos?${params}`);
    return response.data;
  },
  getEstadoAlumno: async (alumnoId) => {
    const response = await api.get(`/periodos/estado/${alumnoId}`);
    return response.data;
  },
};

// ===== HORARIOS =====
export const horariosService = {
  getHorarioGrupo: async (params) => {
    const response = await api.get('/horarios/grupo', { params });
    return response.data;
  },
  asignar: async (data) => {
    const response = await api.post('/horarios', data);
    return response.data;
  },
  actualizar: async (id, data) => {
    const response = await api.patch(`/horarios/${id}`, data);
    return response.data;
  },
  eliminar: async (id) => {
    const response = await api.delete(`/horarios/${id}`);
    return response.data;
  },
};

export const incidenciasService = {
  getAll: async (params = {}) => {
    const response = await api.get('/incidencias', { params });
    return response.data;
  },
  getByAlumno: async (alumnoId) => {
    const response = await api.get(`/incidencias/alumno/${alumnoId}`);
    return response.data;
  },
  crear: async (data) => {
    const response = await api.post('/incidencias', data);
    return response.data;
  },
  actualizar: async (id, data) => {
    const response = await api.put(`/incidencias/${id}`, data);
    return response.data;
  },
  resolver: async (id, resolucion) => {
    const response = await api.patch(`/incidencias/${id}/resolver`, { resolucion });
    return response.data;
  },
  eliminar: async (id) => {
    const response = await api.delete(`/incidencias/${id}`);
    return response.data;
  },
};

// ===== PAGOS =====
export const pagosService = {
  getConceptos: async () => {
    const response = await api.get('/pagos/conceptos');
    return response.data;
  },
  getPorAlumno: async (alumnoId) => {
    const response = await api.get(`/pagos/alumno/${alumnoId}`);
    return response.data;
  },
  registrar: async (data) => {
    const response = await api.post('/pagos', data);
    return response.data;
  },
};

export const servicioSocialService = {
  getAll: async (params = {}) => {
    const response = await api.get('/servicio-social', { params });
    return response.data;
  },
  getReportes: async (id) => {
    const response = await api.get(`/servicio-social/${id}/reportes`);
    return response.data;
  },
  toggleReporte: async (id, entregado) => {
    const response = await api.patch(`/servicio-social/reportes/${id}`, { entregado });
    return response.data;
  },
  crear: async (data) => {
    const response = await api.post('/servicio-social', data);
    return response.data;
  },
  actualizar: async (id, data) => {
    const response = await api.put(`/servicio-social/${id}`, data);
    return response.data;
  },
  eliminar: async (id) => {
    const response = await api.delete(`/servicio-social/${id}`);
    return response.data;
  },
};

// ===== PERÍODOS (ADMINISTRACIÓN) =====
export const periodosService = {
  getEscolares: async (params = {}) => {
    const response = await api.get('/periodos/escolares', { params });
    return response.data;
  },
  getEvaluacion: async (params = {}) => {
    const response = await api.get('/periodos/evaluacion', { params });
    return response.data;
  },
  actualizarEscolar: async (id, data) => {
    const response = await api.put(`/periodos/escolar/${id}`, data);
    return response.data;
  },
  actualizarEvaluacion: async (id, data) => {
    const response = await api.put(`/periodos/evaluacion/${id}`, data);
    return response.data;
  },
  regenerar: async (ciclo_id) => {
    const response = await api.post('/periodos/regenerar', { ciclo_id });
    return response.data;
  },
  crearEscolar: async (data) => {
    const response = await api.post('/periodos/escolar', data);
    return response.data;
  },
  crearEvaluacion: async (data) => {
    const response = await api.post('/periodos/evaluacion', data);
    return response.data;
  },
  crearEscolarBatch: async (data) => {
    const response = await api.post('/periodos/escolares/batch', data);
    return response.data;
  },
};

export const titulacionService = {
  getAll: async (params = {}) => {
    const response = await api.get('/titulacion', { params });
    return response.data;
  },
  crear: async (data) => {
    const response = await api.post('/titulacion', data);
    return response.data;
  },
  actualizar: async (id, data) => {
    const response = await api.put(`/titulacion/${id}`, data);
    return response.data;
  },
  eliminar: async (id) => {
    const response = await api.delete(`/titulacion/${id}`);
    return response.data;
  },
};

// ===== GRUPOS =====
export const gruposService = {
  getAll: async (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString();
    const response = await api.get(`/grupos?${params}`);
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/grupos/${id}`);
    return response.data;
  },
  getMaterias: async (id) => {
    const response = await api.get(`/grupos/${id}/materias`);
    return response.data;
  },
  getAlumnos: async (id) => {
    const response = await api.get(`/grupos/${id}/alumnos`);
    return response.data;
  },
  crear: async (data) => {
    const response = await api.post('/grupos', data);
    return response.data;
  },
  actualizar: async (id, data) => {
    const response = await api.patch(`/grupos/${id}`, data);
    return response.data;
  },
};

export const tutoriasService = {
  getTutoriasGrupo: async (params) => {
    const response = await api.get('/tutorias', { params });
    return response.data;
  },
  crear: async (data) => {
    const response = await api.post('/tutorias', data);
    return response.data;
  },
};

export const ciclosService = {
  getAll: async () => {
    const response = await api.get('/ciclos');
    return response.data;
  },
  crear: async (data) => {
    const response = await api.post('/ciclos', data);
    return response.data;
  },
  actualizar: async (id, data) => {
    const response = await api.put(`/ciclos/${id}`, data);
    return response.data;
  },
  eliminar: async (id) => {
    const response = await api.delete(`/ciclos/${id}`);
    return response.data;
  },
};

export const materiasCatalogoService = {
  getAll: async (params = {}) => {
    const response = await api.get('/materias-catalogo', { params });
    return response.data;
  },
  crear: async (data) => {
    const response = await api.post('/materias-catalogo', data);
    return response.data;
  },
  actualizar: async (id, data) => {
    const response = await api.put(`/materias-catalogo/${id}`, data);
    return response.data;
  },
  eliminar: async (id) => {
    const response = await api.delete(`/materias-catalogo/${id}`);
    return response.data;
  },
}

export const especialidadesService = {
  actualizar: async (id, data) => {
    const response = await api.put(`/catalogos/especialidades/${id}`, data);
    return response.data;
  },
};

export default api;