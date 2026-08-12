import { usePermissions } from '../hooks/usePermissions';

/**
 * Wrapper que renderiza el contenido solo si el usuario tiene el permiso solicitado.
 * @param {string} modulo 
 * @param {string} accion 
 * @param {ReactNode} children 
 * @param {ReactNode} fallback 
 */
export function RoleBasedWrapper({ modulo, accion, children, fallback = null }) {
  const { tienePermiso } = usePermissions();
  const permitido = tienePermiso(modulo, accion);

  if (!permitido) {
    return fallback;
  }
  return children;
}

/**
 * Muestra el contenido solo para los roles especificados.
 */
export function ShowForRoles({ roles, children, fallback = null }) {
  const { usuario } = useAuth();
  const tieneRol = roles.includes(usuario?.rol);
  if (!tieneRol) return fallback;
  return children;
}

/**
 * Oculta el contenido para los roles especificados.
 */
export function HideForRoles({ roles, children }) {
  const { usuario } = useAuth();
  const tieneRol = roles.includes(usuario?.rol);
  if (tieneRol) return null;
  return children;
}