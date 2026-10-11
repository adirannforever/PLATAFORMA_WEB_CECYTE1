import { usePermissions } from '../hooks/usePermissions';

/**
 * Renderiza children SOLO si el usuario actual tiene el permiso indicado.
 * Guard declarativo para la UI (NO es la seguridad; el backend es la autoridad).
 *
 * @param {string} permiso  Código 'modulo.accion' (ej. 'calificaciones.crear').
 * @param {ReactNode} children
 * @param {ReactNode} fallback  Lo que se muestra si NO tiene permiso (por defecto nada).
 *
 * Ejemplo:
 *   <Puede permiso="usuarios.crear"><BotonNuevoUsuario /></Puede>
 */
export function Puede({ permiso, children, fallback = null }) {
  const { tiene } = usePermissions();
  return tiene(permiso) ? children : fallback;
}

export default Puede;
