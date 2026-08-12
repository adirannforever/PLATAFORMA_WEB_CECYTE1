import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { PERMISOS, ROLES } from '../config/permissions';

export function usePermissions() {
  const { usuario } = useAuth();
  const rol = usuario?.rol;

  const tienePermiso = useMemo(() => {
    return (modulo, accion) => {
      if (!rol) return false;
      if (rol === ROLES.ADMINISTRADOR) return true; 
      const permisosModulo = PERMISOS[modulo];
      if (!permisosModulo) return false;
      const rolesPermitidos = permisosModulo[accion];
      if (!rolesPermitidos) return false;
      return rolesPermitidos.includes(rol);
    };
  }, [rol]);

  const puedeVerModulo = useMemo(() => {
    return (modulo) => {
      return tienePermiso(modulo, 'ver');
    };
  }, [tienePermiso]);

  const puedeCrear = useMemo(() => {
    return (modulo) => {
      return tienePermiso(modulo, 'crear');
    };
  }, [tienePermiso]);

  const puedeEditar = useMemo(() => {
    return (modulo) => {
      return tienePermiso(modulo, 'editar');
    };
  }, [tienePermiso]);

  const puedeEliminar = useMemo(() => {
    return (modulo) => {
      return tienePermiso(modulo, 'eliminar');
    };
  }, [tienePermiso]);

  const puedeRegistrar = useMemo(() => {
    return (modulo) => {
      return tienePermiso(modulo, 'registrar');
    };
  }, [tienePermiso]);

  const puedeResolver = useMemo(() => {
    return (modulo) => {
      return tienePermiso(modulo, 'resolver');
    };
  }, [tienePermiso]);

  const puedeExportar = useMemo(() => {
    return (modulo) => {
      return tienePermiso(modulo, 'exportar');
    };
  }, [tienePermiso]);

  const esAdmin = rol === ROLES.ADMINISTRADOR;
  const esDocente = rol === ROLES.DOCENTE;
  const esAlumno = rol === ROLES.ALUMNO;

  return {
    tienePermiso,
    puedeVerModulo,
    puedeCrear,
    puedeEditar,
    puedeEliminar,
    puedeRegistrar,
    puedeResolver,
    puedeExportar,
    esAdmin,
    esDocente,
    esAlumno,
    rol,
  };
}