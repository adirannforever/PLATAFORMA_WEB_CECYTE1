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
      const path = window.location.pathname;
      const rutaPublica = path === '/' || path === '/login'
        || path === '/activar-cuenta' || path.startsWith('/legal/');
      if (!rutaPublica) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);


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
  activarCuentaAspirante: async (token, password) => {
    const response = await api.post('/auth/aspirantes/activar-cuenta', { token, password });
    return response.data;
  },
};

export const dashboardService = {
  // Aggregated admin dashboard snapshot (KPIs, alerts, charts, activity).
  getAdmin: async () => {
    const response = await api.get('/dashboard/admin');
    return response.data;
  },
};


export const usuariosService = {
  
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
  importar: async (csv, defaultPassword) => {
    const response = await api.post('/usuarios/importar', {
      csv,
      ...(defaultPassword ? { defaultPassword } : {}),
    });
    return response.data;
  },
  descargarPlantillaImportacion: async () => {
    const response = await api.get('/usuarios/importar/plantilla', { responseType: 'blob' });
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
  actualizarPassword: async (id, data) => {
    const response = await api.patch(`/usuarios/${id}/password`, data);
    return response.data;
  },
};  


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
  // Reinscripción Digital v3
  getEstatusReinscripcion: async (params = {}) => {
    const response = await api.get('/inscripciones/estatus-reinscripcion', { params });
    return response.data;
  },
  procesarCedulaReinscripcion: async (data) => {
    const response = await api.post('/inscripciones/cedula-reinscripcion', data);
    return response.data;
  },
  getControlEscolarDashboard: async () => {
    const response = await api.get('/inscripciones/dashboard-control-escolar');
    return response.data;
  },
};

export const aspirantesService = {
  getAll: async (params = {}) => {
    const response = await api.get('/aspirantes', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/aspirantes/${id}`);
    return response.data;
  },
  crear: async (data) => {
    const response = await api.post('/aspirantes', data);
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/aspirantes/me');
    return response.data;
  },
  reenviarInvitacion: async (id) => {
    const response = await api.post(`/aspirantes/${id}/invitacion`);
    return response.data;
  },
  actualizarEstatus: async (id, estatus) => {
    const response = await api.patch(`/aspirantes/${id}/estatus`, { estatus });
    return response.data;
  },
  convertirAAlumno: async (data) => {
    const response = await api.post('/aspirantes/convertir', data);
    return response.data;
  },
};

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
  actualizar: async (id, data) => {
    const payload = typeof data === 'object' ? data : { calificacion: data };
    const response = await api.put(`/calificaciones/${id}`, payload);
    return response.data;
  },
  registrarRegularizacion: async (data) => {
    const response = await api.post('/calificaciones/regularizacion', data);
    return response.data;
  },
  getCondicionAcademica: async (alumnoId, cicloId = null) => {
    const params = cicloId ? { ciclo_id: cicloId } : {};
    const response = await api.get(`/calificaciones/condicion-academica/${alumnoId}`, { params });
    return response.data;
  },
  getPeriodosEvaluacion: async (materia_grupo_id) => {
    const response = await api.get(`/calificaciones/periodos/${materia_grupo_id}`);
    return response.data;
  },
};


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
  solicitarUpload: async (file) => {
    const response = await api.post('/comunicados/upload/solicitar', {
      nombre: file.name,
      tipo: file.type,
      size: file.size,
    });
    return response.data;
  },
  solicitarUploads: async (files) => {
    const response = await api.post('/comunicados/upload/lote', {
      archivos: files.map((file) => ({
        nombre: file.name,
        tipo: file.type,
        size: file.size,
      })),
    });
    return response.data;
  },
  subirArchivo: async (uploadUrl, file) => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    if (!response.ok) {
      throw new Error(`Error al subir "${file.name}": ${response.status}`);
    }
    return response;
  },
  actualizar: async (id, data) => {
    const response = await api.patch(`/comunicados/${id}`, data);
    return response.data;
  },
};


// Portal público (landing, sin sesión): usa `fetch` directo en lugar de `api`
// para que un 401/429 del endpoint público NUNCA dispare el redirect a /login.
export const publicService = {
  getAvisos: async (limit = 6) => {
    const res = await fetch(`/api/public/avisos?limit=${encodeURIComponent(limit)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Avisos no disponibles (${res.status})`);
    return res.json();
  },
  getResumen: async () => {
    const res = await fetch('/api/public/resumen', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Resumen no disponible (${res.status})`);
    return res.json();
  },
  getCatalogos: async () => {
    const res = await fetch('/api/public/catalogos', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Catálogos no disponibles (${res.status})`);
    return res.json();
  },
  preRegistro: async (payload) => {
    const res = await fetch('/api/public/pre-registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.message || `No se pudo enviar el pre-registro (${res.status})`);
    return body;
  },
};


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
  getMateriasGrupo: async (grupoId) => {
    const response = await api.get('/catalogos/materias-grupo', { params: { grupo_id: grupoId } });
    return response.data;
  },
  getAlumnoByUsuario: async (usuarioId) => {
    const response = await api.get(`/catalogos/alumno/${usuarioId}`);
    return response.data;
},
};


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

export const horariosService = {
  // Configuración
  getConfiguracion: async () => {
    const response = await api.get('/horarios/configuracion');
    return response.data;
  },
  actualizarConfiguracion: async (data) => {
    const response = await api.put('/horarios/configuracion', data);
    return response.data;
  },

  // Subida con metadata
  solicitarUpload: async (nombre, tipo_mime, grupo_id, semestre, ciclo_id, especialidad_id, turno_id, tipo_horario, descripcion) => {
    const response = await api.post('/horarios/upload/solicitar', {
      nombre,
      tipo: tipo_mime,
      grupo_id,
      semestre,
      ciclo_id,
      especialidad_id,
      turno_id,
      tipo_horario,
      descripcion,
    });
    return response.data;
  },

  subirArchivo: async (uploadUrl, file) => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });
    if (!response.ok) {
      throw new Error(`Error al subir el archivo: ${response.status}`);
    }
    return response;
  },

  // Listado con filtros
  listarHorarios: async (params = {}) => {
    const response = await api.get('/horarios/listar', { params });
    return response.data;
  },

  solicitarDescarga: async (key) => {
    const response = await api.post('/horarios/download/solicitar', { key });
    return response.data;
  },

  eliminar: async (id) => {
    const response = await api.delete(`/horarios/${id}`);
    return response.data;
  },
  getSemestreActual: async () => {
    const response = await api.get('/horarios/semestre-actual');
    return response.data;
  },
  listarHorarios: async (params = {}) => {
    const response = await api.get('/horarios/listar', { params });
    return response.data;
  },
  contarFaltantes: async (ciclo_id, semestre) => {
    const response = await api.get('/horarios/contar-faltantes', { params: { ciclo_id, semestre } });
    return response.data;
  },
  actualizarHorario: async (id, data) => {
    const response = await api.put(`/horarios/${id}`, data);
    return response.data;
  },
  uploadBatch: async (horarios) => {
    const response = await api.post('/horarios/upload/batch', { horarios });
    return response.data;
  },
  descargarPlantilla: async (params) => {
    const response = await api.get('/horarios/plantilla', {
      params,
      responseType: 'blob'
    });
    return response; 
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


export const pagosService = {
  getConceptos: async () => {
    const response = await api.get('/pagos/conceptos');
    return response.data;
  },
  getMisPagos: async () => {
    const response = await api.get('/pagos/mis-pagos');
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
  asignarMaterias: async (id, materias_ids) => {
    const response = await api.post(`/grupos/${id}/materias`, { materias_ids });
    return response.data;
  },
  getMateriasByDocente: async (docenteId) => {
    const response = await api.get(`/grupos/docente/${docenteId}/materias`);
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

export const auditoriaService = {
  getLogs: async (params = {}) => {
    const response = await api.get('/auditoria', { params });
    return response.data;
  },
};

export const reportesService = {
  generarBoleta: async (params) => {
    const response = await api.get('/reportes/boleta', { params, responseType: 'blob' });
    return response.data;
  },
  generarConstancia: async (params) => {
    const response = await api.get('/reportes/constancia', { params, responseType: 'blob' });
    return response.data;
  },
  generarListadoAlumnos: async (params) => {
    const response = await api.get('/reportes/listado-alumnos', { params, responseType: 'blob' });
    return response.data;
  },
  generarEstadisticas: async (params) => {
    const response = await api.get('/reportes/estadisticas', { params, responseType: 'blob' });
    return response.data;
  },
  generarExcelCalificacionesMateria: (params) => {
    return api.get('/reportes/calificaciones-excel', { 
      params, 
      responseType: 'blob' 
    }).then(res => res.data);
  },
  generarExcelAsistencias: (params) => {
    return api.get('/reportes/asistencias-excel', { 
      params, 
      responseType: 'blob' 
    }).then(res => res.data);
  },
};

export default api;