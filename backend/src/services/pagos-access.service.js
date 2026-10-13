export function getPagosAlumnoScope(user) {
  if (user?.rol === 'alumno') {
    return {
      condition: 'AND a.usuario_id = $2',
      params: [user.id],
    };
  }

  return {
    condition: '',
    params: [],
  };
}
