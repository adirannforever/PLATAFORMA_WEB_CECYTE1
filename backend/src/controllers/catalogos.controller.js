
import { query } from '../config/db.js';

export const getCiclos = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, nombre, fecha_inicio, fecha_fin, activo FROM ciclos_escolares ORDER BY fecha_inicio DESC'
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getCiclos:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};


export const getCicloActivo = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, nombre, fecha_inicio, fecha_fin FROM ciclos_escolares WHERE activo = TRUE LIMIT 1'
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'No hay un ciclo escolar activo.' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error en getCicloActivo:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getGrupos = async (req, res) => {
  try {
    const { ciclo_id, semestre, turno_id } = req.query;

    let sql = `
      SELECT g.id, g.nombre, g.semestre, g.letra, g.activo,
             c.id   AS ciclo_id,   c.nombre AS ciclo,
             e.id   AS especialidad_id, e.nombre AS especialidad, e.clave AS especialidad_clave,
             t.id   AS turno_id,   t.nombre AS turno,
             u.id   AS tutor_id,   u.nombre AS tutor_nombre, u.apellidos AS tutor_apellidos
      FROM grupos g
      JOIN ciclos_escolares c ON c.id = g.ciclo_id
      JOIN especialidades   e ON e.id = g.especialidad_id
      JOIN turnos           t ON t.id = g.turno_id
      LEFT JOIN usuarios    u ON u.id = g.tutor_id
      WHERE g.activo = TRUE
    `;
    const params = [];

    if (ciclo_id) { params.push(ciclo_id); sql += ` AND g.ciclo_id = $${params.length}`; }
    if (semestre) { params.push(semestre); sql += ` AND g.semestre = $${params.length}`; }
    if (turno_id) { params.push(turno_id); sql += ` AND g.turno_id = $${params.length}`; }

    sql += ' ORDER BY g.semestre, g.letra, t.nombre';

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getGrupos:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getEspecialidades = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, clave, nombre, descripcion FROM especialidades ORDER BY nombre'
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getEspecialidades:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};


export const getTurnos = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, nombre, hora_inicio, hora_fin FROM turnos ORDER BY id'
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getTurnos:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getEdificios = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, clave, nombre, tipo FROM edificios ORDER BY clave'
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getEdificios:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getAulas = async (req, res) => {
  try {
    const { edificio_id } = req.query;
    let sql = `
      SELECT a.id, a.nombre, a.tipo, a.capacidad, a.activa,
             e.id AS edificio_id, e.nombre AS edificio, e.clave AS edificio_clave
      FROM aulas a
      JOIN edificios e ON e.id = a.edificio_id
      WHERE a.activa = TRUE
    `;
    const params = [];
    if (edificio_id) { params.push(edificio_id); sql += ` AND a.edificio_id = $1`; }
    sql += ' ORDER BY e.clave, a.nombre';

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getAulas:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getPeriodos = async (req, res) => {
  try {
    const { turno_id } = req.query;
    let sql = `
      SELECT p.id, p.numero, p.hora_inicio, p.hora_fin,
             t.id AS turno_id, t.nombre AS turno
      FROM periodos_dia p
      JOIN turnos t ON t.id = p.turno_id
    `;
    const params = [];
    if (turno_id) { params.push(turno_id); sql += ' WHERE p.turno_id = $1'; }
    sql += ' ORDER BY p.turno_id, p.numero';

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getPeriodos:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};


export const getMateriasCatalogo = async (req, res) => {
  try {
    const { semestre, especialidad_id, tipo } = req.query;
    let sql = `
      SELECT m.id, m.nombre, m.clave, m.semestre, m.tipo,
             m.modulo_numero, m.submodulo_numero, m.horas_semana,
             e.nombre AS especialidad
      FROM materias_catalogo m
      LEFT JOIN especialidades e ON e.id = m.especialidad_id
      WHERE m.activa = TRUE
    `;
    const params = [];

    if (semestre)       { params.push(semestre);       sql += ` AND m.semestre = $${params.length}`; }
    if (especialidad_id){ params.push(especialidad_id); sql += ` AND m.especialidad_id = $${params.length}`; }
    if (tipo)           { params.push(tipo);            sql += ` AND m.tipo = $${params.length}`; }

    sql += ' ORDER BY m.semestre, m.tipo, m.modulo_numero, m.submodulo_numero, m.nombre';

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getMateriasCatalogo:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getConceptosPago = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, nombre, descripcion, precio FROM conceptos_pago WHERE activo = TRUE ORDER BY nombre'
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getConceptosPago:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getCatalogoDocumentos = async (req, res) => {
  try {
    const { etapa } = req.query;
    let sql = `
      SELECT id, clave, nombre, descripcion, etapa, obligatorio, precio
      FROM catalogo_documentos
    `;
    const params = [];
    if (etapa) { params.push(etapa); sql += ' WHERE etapa = $1'; }
    sql += ' ORDER BY etapa, obligatorio DESC, nombre';

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getCatalogoDocumentos:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getDocentes = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, nombre, apellidos, email
       FROM usuarios
       WHERE rol = 'docente' AND activo = TRUE
       ORDER BY apellidos, nombre`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getDocentes:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};


export const getAlumnos = async (req, res) => {
  try {
    const { grupo_id } = req.query;
    let sql = `
      SELECT a.id, a.matricula, u.nombre, u.apellidos, u.email,
             a.semestre_actual, a.estatus,
             g.nombre AS grupo
      FROM alumnos a
      JOIN usuarios u ON u.id = a.usuario_id
      LEFT JOIN grupos g ON g.id = a.grupo_actual_id
      WHERE u.activo = TRUE AND a.estatus = 'activo'
    `;
    const params = [];
    if (grupo_id) { params.push(grupo_id); sql += ` AND a.grupo_actual_id = $1`; }
    sql += ' ORDER BY u.apellidos, u.nombre';

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getAlumnos:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const actualizarEspecialidad = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    const result = await query(
      `UPDATE especialidades SET nombre = COALESCE($1, nombre), descripcion = COALESCE($2, descripcion)
       WHERE id = $3 RETURNING *`,
      [nombre, descripcion, id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Especialidad no encontrada' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error en actualizarEspecialidad:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};
export const getAlumnoByUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    // Verificar que el usuario autenticado sea el mismo o admin
    if (req.user.rol !== 'administrador' && req.user.id !== parseInt(usuarioId)) {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const result = await query(
      `SELECT 
        a.id AS alumno_id,
        a.matricula,
        a.semestre_actual,
        a.estatus,
        g.id AS grupo_id,
        g.nombre AS grupo_nombre,
        g.letra AS grupo_letra,
        c.nombre AS ciclo_nombre,
        e.nombre AS especialidad_nombre
       FROM alumnos a
       LEFT JOIN grupos g ON g.id = a.grupo_actual_id
       LEFT JOIN ciclos_escolares c ON c.id = g.ciclo_id
       LEFT JOIN especialidades e ON e.id = a.especialidad_id
       WHERE a.usuario_id = $1`,
      [usuarioId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Alumno no encontrado' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error en getAlumnoByUsuario:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};