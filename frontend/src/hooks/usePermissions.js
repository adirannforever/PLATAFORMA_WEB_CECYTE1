import { useAuth } from '../context/AuthContext';

/**
 * Hook para gestionar permisos basados en el rol del usuario
 * @returns {Object} - { hasPermission, checkRole, isAdmin, isDocente, isAlumno }
 */
export const usePermissions = () => {
  const { usuario } = useAuth();

  const rol = usuario?.rol || null;

  /**
   * Verifica si el usuario tiene un rol específico
   * @param {string|string[]} roles - Rol o lista de roles permitidos
   * @returns {boolean}
   */
  const checkRole = (roles) => {
    if (!rol) return false;
    if (Array.isArray(roles)) {
      return roles.includes(rol);
    }
    return roles === rol;
  };

  /**
   * Verifica si el usuario tiene permiso para acceder a un recurso
   * @param {string|string[]} requiredRoles - Rol o lista de roles permitidos
   * @returns {boolean}
   */
  const hasPermission = (requiredRoles) => {
    return checkRole(requiredRoles);
  };

  // Atajos para verificar roles específicos
  const isAdmin = rol === 'administrador';
  const isDocente = rol === 'docente';
  const isAlumno = rol === 'alumno';

  return {
    hasPermission,
    checkRole,
    isAdmin,
    isDocente,
    isAlumno,
    rol,
  };
};