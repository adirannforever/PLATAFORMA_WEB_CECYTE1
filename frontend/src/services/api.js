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

// autentificacion, inicio de sesion y cierre de sesion
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

//usuarios
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
  actualizar: async (id, data) => {
    const response = await api.patch(`/usuarios/${id}`, data);
    return response.data;
  },
  desactivar: async (id) => {
    const response = await api.delete(`/usuarios/${id}`);
    return response.data;
  },
};

//materias
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

// inscripciones
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
};


// calificaciones
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
};

// comunicados
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

// asistencias.
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
};

// aspirantes.
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
};

// becas
export const becasService = {
  getAll: async () => {
    const response = await api.get('/becas');
    return response.data;
  },
  porAlumno: async (alumnoId) => {
    const response = await api.get(`/becas/alumno/${alumnoId}`);
    return response.data;
  },
  crear: async (data) => {
    const response = await api.post('/becas', data);
    return response.data;
  },
  actualizar: async (id, data) => {
    const response = await api.put(`/becas/${id}`, data);
    return response.data;
  },
};


// catalogo
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


//expediente
export const expedienteService = {
  getByAlumnoId: async (alumnoId) => {
    const response = await api.get(`/expediente/${alumnoId}`);
    return response.data;
  },
  actualizarDocumento: async (data) => {
    const response = await api.post('/expediente/documento', data);
    return response.data;
  },
};


// horarios
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

//incidencias
export const incidenciasService = {
  porAlumno: async (alumnoId) => {
    const response = await api.get(`/incidencias/alumno/${alumnoId}`);
    return response.data;
  },
  crear: async (data) => {
    const response = await api.post('/incidencias', data);
    return response.data;
  },
  resolver: async (id, resolucion) => {
    const response = await api.patch(`/incidencias/${id}/resolver`, { resolucion });
    return response.data;
  },
};

// pagos
export const pagosService = {
  getConceptos: async () => {
    const response = await api.get('/pagos/conceptos');
    return response.data;
  },
  porAlumno: async (alumnoId) => {
    const response = await api.get(`/pagos/alumno/${alumnoId}`);
    return response.data;
  },
  registrar: async (data) => {
    const response = await api.post('/pagos', data);
    return response.data;
  },
};


//servicio-social
export const servicioSocialService = {
  getAll: async () => {
    const response = await api.get('/servicio-social');
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
};

//titulacion
export const titulacionService = {
  getAll: async () => {
    const response = await api.get('/titulacion');
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
};

//grupos
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

//tutorias
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

export default api;