import {
  Home,
  Users,
  FileText,
  Gift,
  CreditCard,
  Briefcase,
  GraduationCap,
  Settings,
  AlertCircle,
  Activity,
  Calendar,
  BookOpen,
  UserCheck,
  UserPlus,
  ClipboardList,
  BarChart3,
} from 'lucide-react';

// Iconos personalizados
const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const IconComunicados = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconCalif = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10,9 9,9 8,9" />
  </svg>
);

const IconGrupos = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const IconUsuarios = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconInscripciones = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const IconAsistencia = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <polyline points="9 15 11 17 15 13" />
  </svg>
);

// Definición de categorías con orden
export const CATEGORIES = {
  general: { label: 'General', order: 0 },
  academico: { label: 'Académico', order: 1 },
  administrativo: { label: 'Administración', order: 2 },
  configuracion: { label: 'Configuración', order: 3 },
};

// Los ítems ahora pueden tener un badge (número o texto)
// y pueden ser padres de submenús (aunque no se usará en esta versión).
//
// Modelo de acceso: cada ítem declara el PERMISO ('modulo.accion') necesario
// para VERLO en el menú. getMenuItems(tiene) filtra usando el predicado de
// usePermissions().tiene(). El acceso real a la ruta se controla aparte en
// App.jsx (puede ser más laxo que la visibilidad del menú, igual que antes).
export const menuItems = [
  // ===== GENERAL =====
  {
    to: '/dashboard',
    label: 'Inicio',
    icon: <IconDashboard />,
    permiso: 'dashboard.ver',
    category: 'general',
    order: 0,
  },
  {
    to: '/comunicados',
    label: 'Comunicados',
    icon: <IconComunicados />,
    permiso: 'comunicados.ver',
    category: 'general',
    order: 1,
  },
  {
    to: '/reportes',
    label: 'Reportes',
    icon: <FileText size={18} />,
    permiso: 'reportes.ver',
    category: 'general',
    order: 2,
  },
  {
    to: '/horarios',
    label: 'Horarios',
    icon: <Calendar size={18} />,
    permiso: 'horarios.ver',
    category: 'general',
    order: 3,
  },

  // ===== ACADÉMICO =====
  // Visibles para roles con vista administrativa (admin/control/directivo).
  // Los docentes usan "Mis Clases".
  {
    to: '/grupos',
    label: 'Grupos',
    icon: <IconGrupos />,
    permiso: 'grupos.ver_todos',
    category: 'academico',
    order: 1,
  },
  {
    to: '/asistencia',
    label: 'Asistencias',
    icon: <IconAsistencia />,
    permiso: 'asistencia.ver',
    category: 'academico',
    order: 2,
  },
  {
    to: '/calificaciones',
    label: 'Calificaciones',
    icon: <BookOpen size={18} />,
    permiso: 'calificaciones.ver',
    category: 'academico',
    order: 3,
  },
  {
    to: '/mis-calificaciones',
    label: 'Mis Calificaciones',
    icon: <IconCalif />,
    permiso: 'calificaciones.ver_mis_calificaciones',
    category: 'academico',
    order: 4,
  },
  {
    to: '/inscripciones',
    label: 'Inscripciones',
    icon: <IconInscripciones />,
    permiso: 'inscripciones.ver',
    category: 'academico',
    order: 5,
  },
  {
    to: '/incidencias',
    label: 'Incidencias',
    icon: <AlertCircle size={18} />,
    permiso: 'incidencias.ver_todas',
    category: 'academico',
    order: 6,
    badge: 'notificaciones',
  },

  // ===== ADMINISTRATIVO =====
  {
    to: '/usuarios',
    label: 'Usuarios',
    icon: <IconUsuarios />,
    permiso: 'usuarios.ver',
    category: 'administrativo',
    order: 0,
  },
  {
    to: '/aspirantes',
    label: 'Aspirantes',
    icon: <UserPlus size={18} />,
    permiso: 'aspirantes.ver',
    category: 'administrativo',
    order: 0,
  },
  {
    to: '/becas',
    label: 'Becas',
    icon: <Gift size={18} />,
    permiso: 'becas.ver',
    category: 'administrativo',
    order: 1,
  },
  {
    to: '/pagos',
    label: 'Pagos',
    icon: <CreditCard size={18} />,
    permiso: 'pagos.ver',
    category: 'administrativo',
    order: 2,
  },
  {
    to: '/titulacion',
    label: 'Titulación',
    icon: <GraduationCap size={18} />,
    permiso: 'titulacion.ver',
    category: 'administrativo',
    order: 3,
  },
  {
    to: '/servicio-social',
    label: 'Servicio Social',
    icon: <Briefcase size={18} />,
    permiso: 'servicio_social.ver',
    category: 'administrativo',
    order: 4,
  },
  {
    to: '/expediente',
    label: 'Expediente',
    icon: <FileText size={18} />,
    permiso: 'expediente.ver_todos',
    category: 'administrativo',
    order: 5,
  },

  // ===== CONFIGURACIÓN =====
  {
    to: '/configuracion-academica',
    label: 'Configuración Académica',
    icon: <Settings size={18} />,
    permiso: 'config_academica.ver',
    category: 'configuracion',
    order: 0,
  },

  // ===== DOCENTE / TUTOR (Mis Clases) =====
  {
    to: '/mis-clases',
    label: 'Mis Clases',
    icon: <BookOpen size={18} />,
    permiso: 'calificaciones.ver_mis_materias',
    category: 'academico',
    order: 0,
  },
];

export const categoryOrder = ['general', 'academico', 'administrativo', 'configuracion'];

/**
 * Devuelve los ítems de menú agrupados por categoría, filtrados por permiso.
 * @param {(codigo:string)=>boolean} tiene  Predicado de usePermissions().tiene().
 *        Si se omite, se comporta como antes (sin filtrar) para no romper legacy.
 */
export const getMenuItems = (tiene) => {
  const puede = typeof tiene === 'function' ? tiene : () => true;
  const filtered = menuItems.filter((item) => !item.permiso || puede(item.permiso));
  const grouped = {};
  filtered.forEach((item) => {
    const cat = item.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });
  Object.keys(grouped).forEach((cat) => {
    grouped[cat].sort((a, b) => (a.order || 0) - (b.order || 0));
  });
  return grouped;
};