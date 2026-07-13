
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

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const usuariosService = {
  getAll: (rol) => api.get('/usuarios', { params: rol ? { rol } : {} }),
  getById: (id) => api.get(`/usuarios/${id}`),
  crear: (data) => api.post('/usuarios', data),
  actualizar: (id, data) => api.patch(`/usuarios/${id}`, data),
  desactivar: (id) => api.delete(`/usuarios/${id}`),
};

export const materiasService = {
  getAll: () => api.get('/materias'),
  getById: (id) => api.get(`/materias/${id}`),
  getAlumnos: (id) => api.get(`/materias/${id}/alumnos`),
  crear: (data) => api.post('/materias', data),
  actualizar: (id, data) => api.patch(`/materias/${id}`, data),
};

export const inscripcionesService = {
  misMaterias: () => api.get('/inscripciones/mis-materias'),
  inscribir: (data) => api.post('/inscripciones', data),
  eliminar: (id) => api.delete(`/inscripciones/${id}`),
};

export const calificacionesService = {
  misCalificaciones: () => api.get('/calificaciones/mis-calificaciones'),
  porMateria: (materiaId) => api.get(`/calificaciones/materia/${materiaId}`),
  registrar: (data) => api.post('/calificaciones', data),
  actualizar: (id, calificacion) => api.put(`/calificaciones/${id}`, { calificacion }),
};

export const comunicadosService = {
  getAll: () => api.get('/comunicados'),
  getById: (id) => api.get(`/comunicados/${id}`),
  crear: (data) => api.post('/comunicados', data),
  actualizar: (id, data) => api.patch(`/comunicados/${id}`, data),
};

export default api;
