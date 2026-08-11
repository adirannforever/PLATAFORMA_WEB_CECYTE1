import { query } from '../config/db.js';

export const getMateriasByGrupo = async (req, res) => {
  const { grupo_id } = req.params;
  try {
    const result = await query(
      `SELECT 
        mg.id,
        mg.grupo_id,
        mg.materia_catalogo_id,
        mg.docente_id,
        mc.nombre AS materia_nombre,
        mc.clave AS materia_clave,
        u.nombre AS docente_nombre,
        u.apellidos AS docente_apellidos
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