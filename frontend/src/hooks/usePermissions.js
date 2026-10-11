import { useAuth } from '../context/AuthContext';

/**
 * Hook de permisos basado en el catálogo de permisos (modulo.accion)
 * que el backend entrega en el usuario (login/me -> usuario.permisos[]).
 *
 * Este hook es la ÚNICA fuente de verdad de acceso en el frontend.
 * El backend sigue siendo la autoridad real de seguridad.
 *
 * API:
 *   - tiene(permiso)          ¿Tiene el permiso 'modulo.accion'? (recomendado)
 *   - tieneAlguno(...perms)   ¿Tiene al menos uno?
 *   - tieneTodos(...perms)    ¿Tiene todos?
 *   - isAdmin/isDocente/...   atajos por rol (compatibilidad)
 *   - rol, permisos
 */
export const usePermissions = () => {
  const { usuario } = useAuth();

  const rol = usuario?.rol || null;
  const permisos = Array.isArray(usuario?.permisos) ? usuario.permisos : [];

  /** ¿El usuario tiene el permiso exacto? Acepta 'modulo.accion' o 'modulo.*'. */
  const tiene = (codigo) => {
    if (!codigo || permisos.length === 0) return false;
    if (permisos.includes('*')) return true;
    if (permisos.includes(codigo)) return true;
    if (codigo.endsWith('.*')) {
      const modulo = codigo.slice(0, -2);
      return permisos.some((p) => p.startsWith(`${modulo}.`));
    }
    return false;
  };

  const tieneAlguno = (...codigos) => codigos.flat().some((c) => tiene(c));
  const tieneTodos = (...codigos) => codigos.flat().every((c) => tiene(c));

  // Atajos por rol (compatibilidad con código existente).
  const isAdmin = rol === 'administrador';
  const isDocente = rol === 'docente';
  const isAlumno = rol === 'alumno';
  const isTutor = rol === 'tutor';
  const isControlEscolar = rol === 'control_escolar';
  const isDirectivo = rol === 'directivo';
  const isAspirante = rol === 'aspirante';

  return {
    tiene,
    tieneAlguno,
    tieneTodos,
    isAdmin,
    isDocente,
    isAlumno,
    isTutor,
    isControlEscolar,
    isDirectivo,
    isAspirante,
    rol,
    permisos,
  };
};