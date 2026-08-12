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

export const menuItems = [
  // comunes
  {
    to: '/dashboard',
    label: 'Inicio',
    icon: <IconDashboard />,
    roles: ['administrador', 'docente', 'alumno'],
  },
  {
    to: '/comunicados',
    label: 'Comunicados',
    icon: <IconComunicados />,
    roles: ['administrador', 'docente', 'alumno'],
  },

  // para alumno
  {
    to: '/mis-calificaciones',
    label: 'Mis Calificaciones',
    icon: <IconCalif />,
    roles: ['alumno'],
  },

  // admin + docente
  {
    to: '/grupos',
    label: 'Grupos',
    icon: <IconGrupos />,
    roles: ['administrador', 'docente'],
  },
  {
    to: '/asistencia',
    label: 'Asistencias',
    icon: <IconAsistencia />,
    roles: ['administrador', 'docente'],
  },

  // admin + docente especificados
  {
    to: '/calificaciones',
    label: 'Calificaciones',
    icon: <BookOpen size={18} />,
    roles: ['administrador', 'docente'],
  },
  {
    to: '/tutorias',
    label: 'Tutorías',
    icon: <UserCheck size={18} />,
    roles: ['administrador', 'docente'],
  },
  {
    to: '/incidencias',
    label: 'Incidencias',
    icon: <AlertCircle size={18} />,
    roles: ['administrador', 'docente'],
  },
  {
    to: '/horarios',
    label: 'Horarios',
    icon: <Calendar size={18} />,
    roles: ['administrador', 'docente', 'alumno'],
  },
  {
    to: '/reportes',
    label: 'Reportes',
    icon: <FileText size={18} />,
    roles: ['administrador', 'docente', 'alumno'],
  },

  // ===== SOLO ADMIN =====
  {
    to: '/usuarios',
    label: 'Usuarios',
    icon: <IconUsuarios />,
    roles: ['administrador'],
  },
  {
    to: '/becas',
    label: 'Becas',
    icon: <Gift size={18} />,
    roles: ['administrador'],
  },
  {
    to: '/expediente',
    label: 'Expediente',
    icon: <FileText size={18} />,
    roles: ['administrador'],
  },
  {
    to: '/inscripciones',
    label: 'Inscripciones',
    icon: <IconInscripciones />,
    roles: ['administrador'],
  },
  {
    to: '/pagos',
    label: 'Pagos',
    icon: <CreditCard size={18} />,
    roles: ['administrador'],
  },
  {
    to: '/servicio-social',
    label: 'Servicio Social',
    icon: <Briefcase size={18} />,
    roles: ['administrador'],
  },
  {
    to: '/titulacion',
    label: 'Titulación',
    icon: <GraduationCap size={18} />,
    roles: ['administrador'],
  },
  {
    to: '/configuracion-academica',
    label: 'Configuración Académica',
    icon: <Settings size={18} />,
    roles: ['administrador'],
  },
  {
    to: '/auditoria',
    label: 'Auditoría',
    icon: <Activity size={18} />,
    roles: ['administrador'],
  },

  // el mismo formato anterior se debe emplear para nuevos to:
];

/**
 * Obtiene los ítems del menú según el rol del usuario
 * @param {string} rol - Rol del usuario ('administrador', 'docente', 'alumno')
 * @returns {Array} - Lista de ítems de menú filtrados
 */
export const getMenuItems = (rol) => {
  if (!rol) return [];
  return menuItems.filter((item) => item.roles.includes(rol));
};