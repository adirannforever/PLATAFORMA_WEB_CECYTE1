import { usePermissions } from '../hooks/usePermissions';

/**
 * Componente condicional basado en permisos.
 * @param {string} modulo 
 * @param {string} accion 
 * @param {ReactNode} children 
 * @param {ReactNode} elseComponent 
 */
export function IfPermitted({ modulo, accion, children, elseComponent = null }) {
  const { tienePermiso } = usePermissions();
  const permitido = tienePermiso(modulo, accion);

  if (!permitido) {
    return elseComponent;
  }
  return children;
}