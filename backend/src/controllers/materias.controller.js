import { query } from '../config/db.js';


export const getMateriasByGrupo = async (req, res) => {
  try {
    const { grupo_id } = req.query;
    if (!grupo_id) {
      return res.status(400).json({ success: false, message: 'Se requiere grupo_id' });
    }

    const result = await query(
      `SELECT 
        mg.id,
        mg.grupo_id,
        mg.materia_catalogo_id,
        mc.nombre AS materia_nombre,
        mc.clave AS materia_clave,
        u.apellidos AS docente_apellidos,
        u.nombre AS docente_nombre
       FROM materias_grupo mg
       JOIN materias_catalogo mc ON mc.id = mg.materia_catalogo_id
       LEFT JOIN usuarios u ON u.id = mg.docente_id
       WHERE mg.grupo_id = $1 AND mg.activa = TRUE`,
      [grupo_id]
    );

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getMateriasByGrupo:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};
// OBTENER MATERIAS (según rol)
export const getMaterias = async (req, res) => {
  try {
    const { rol, id: usuarioId } = req.user;
    let sql = `
      SELECT mg.id, mc.nombre AS nombre, mc.clave, mc.semestre,
             ce.nombre AS ciclo_escolar, mg.activa,
             u.id AS docente_id, u.nombre AS docente_nombre, u.apellidos AS docente_apellidos,
             g.nombre AS grupo_nombre
      FROM materias_grupo mg
      JOIN materias_catalogo mc ON mg.materia_catalogo_id = mc.id
      JOIN ciclos_escolares ce ON mg.ciclo_id = ce.id
      JOIN usuarios u ON mg.docente_id = u.id
      JOIN grupos g ON mg.grupo_id = g.id
      WHERE mg.activa = TRUE
    `;
    const params = [];

    if (rol === 'docente') {
      sql += ` AND mg.docente_id = $1`;
      params.push(usuarioId);
    }
    // Si es administrador, ve todas

    sql += ' ORDER BY ce.fecha_inicio DESC, mc.nombre';
    const result = await query(sql, params);
    return res.json({ success: true, materias: result.rows });
  } catch (err) {
    console.error('Error en getMaterias:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// OBTENER UNA MATERIA POR ID
export const getMateriaById = async (req, res) => {
  try {
    const result = await query(
      `SELECT mg.id, mc.nombre AS nombre, mc.clave, mc.semestre,
              ce.nombre AS ciclo_escolar, mg.activa,
              u.id AS docente_id, u.nombre AS docente_nombre, u.apellidos AS docente_apellidos,
              g.nombre AS grupo_nombre
       FROM materias_grupo mg
       JOIN materias_catalogo mc ON mg.materia_catalogo_id = mc.id
       JOIN ciclos_escolares ce ON mg.ciclo_id = ce.id
       JOIN usuarios u ON mg.docente_id = u.id
       JOIN grupos g ON mg.grupo_id = g.id
       WHERE mg.id = $1`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Materia no encontrada.' });
    }

    const materia = result.rows[0];
    if (req.user.rol === 'docente' && materia.docente_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    return res.json({ success: true, materia });
  } catch (err) {
    console.error('Error en getMateriaById:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// CREAR ASIGNACIÓN DE MATERIA A GRUPO
export const crearMateria = async (req, res) => {
  const { materia_catalogo_id, grupo_id, ciclo_id, docente_id } = req.body;

  // Validar que todos los campos estén presentes y sean números
  if ([materia_catalogo_id, grupo_id, ciclo_id, docente_id].some(id => id === undefined || id === null || id === '')) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos son obligatorios (materia, grupo, ciclo, docente).'
    });
  }

  const ids = [materia_catalogo_id, grupo_id, ciclo_id, docente_id].map(Number);
  if (ids.some(isNaN)) {
    return res.status(400).json({
      success: false,
      message: 'Los valores deben ser números válidos.'
    });
  }

  try {
    const docente = await query(
      `SELECT id FROM usuarios WHERE id = $1 AND rol = 'docente' AND activo = TRUE`,
      [docente_id]
    );
    if (!docente.rows[0]) {
      return res.status(400).json({
        success: false,
        message: 'El docente no existe o no está activo. Asegúrate de seleccionar un docente válido.'
      });
    }

    const existe = await query(
      `SELECT id FROM materias_grupo 
       WHERE materia_catalogo_id = $1 AND grupo_id = $2 AND ciclo_id = $3`,
      [materia_catalogo_id, grupo_id, ciclo_id]
    );
    if (existe.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Esta materia ya está asignada a este grupo en el ciclo seleccionado.'
      });
    }

    // Insertar la asignación
    const result = await query(
      `INSERT INTO materias_grupo (materia_catalogo_id, grupo_id, ciclo_id, docente_id, activa)
       VALUES ($1, $2, $3, $4, TRUE) RETURNING *`,
      [materia_catalogo_id, grupo_id, ciclo_id, docente_id]
    );

    return res.status(201).json({
      success: true,
      message: 'Materia asignada al grupo correctamente.',
      materia: result.rows[0],
    });
  } catch (err) {
    console.error('Error en crearMateria:', err);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al asignar la materia.'
    });
  }
};

// ACTUALIZAR ASIGNACIÓN
export const actualizarMateria = async (req, res) => {
  const { materia_catalogo_id, grupo_id, ciclo_id, docente_id, activa } = req.body;

  try {
    const result = await query(
      `UPDATE materias_grupo
       SET materia_catalogo_id = COALESCE($1, materia_catalogo_id),
           grupo_id = COALESCE($2, grupo_id),
           ciclo_id = COALESCE($3, ciclo_id),
           docente_id = COALESCE($4, docente_id),
           activa = COALESCE($5, activa)
       WHERE id = $6
       RETURNING *`,
      [materia_catalogo_id, grupo_id, ciclo_id, docente_id, activa, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Asignación no encontrada.' });
    }

    return res.json({ success: true, message: 'Asignación actualizada.', materia: result.rows[0] });
  } catch (err) {
    console.error('Error en actualizarMateria:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// OBTENER ALUMNOS DE UNA MATERIA
export const getAlumnosDeMateria = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.nombre, u.apellidos, u.email, a.id AS alumno_id
       FROM inscripciones i
       JOIN alumnos a ON i.alumno_id = a.id
       JOIN usuarios u ON a.usuario_id = u.id
       WHERE i.materia_grupo_id = $1
       ORDER BY u.apellidos, u.nombre`,
      [req.params.id]
    );

    return res.json({ success: true, alumnos: result.rows });
  } catch (err) {
    console.error('Error en getAlumnosDeMateria:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};